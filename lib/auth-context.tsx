"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface PmUser {
  id: string;       // Supabase auth UUID
  email: string;
  name: string;
  avatar: string;   // Initials e.g. "AT"
  pmRole: "admin" | "staff";
  canAccessContent: boolean;
}

interface AuthCtxValue {
  user: PmUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

async function buildPmUser(authId: string, email: string): Promise<PmUser> {
  try {
    const [{ data: roleRow }, { data: staffRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", authId).maybeSingle(),
      supabase.from("staff_members").select("first_name, last_name, pm_role, avatar_initials, can_access_content").eq("user_id", authId).maybeSingle(),
    ]);

    const isOwnerAdmin = ["owner", "admin"].includes(roleRow?.role ?? "");
    const pmRole: "admin" | "staff" = isOwnerAdmin ? "admin" : ((staffRow?.pm_role as "admin" | "staff") ?? "staff");

    const firstName = staffRow?.first_name ?? email.split("@")[0] ?? "";
    const lastName = staffRow?.last_name ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ") || email;
    const avatar = staffRow?.avatar_initials || (firstName[0] + (lastName[0] ?? "")).toUpperCase() || "?";
    const canAccessContent = isOwnerAdmin ? true : (staffRow?.can_access_content ?? false);

    return { id: authId, email, name, avatar, pmRole, canAccessContent };
  } catch (e) {
    console.error("buildPmUser failed, using fallback", e);
    const name = email.split("@")[0] ?? email;
    return { id: authId, email, name, avatar: name.slice(0, 2).toUpperCase(), pmRole: "staff", canAccessContent: false };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PmUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hard timeout: if auth hasn't resolved in 8s, unblock the app
    const timeout = setTimeout(() => setLoading(false), 8000);

    // Hydrate from existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        if (session?.user) {
          setUser(await buildPmUser(session.user.id, session.user.email ?? ""));
        }
      } catch (e) {
        console.error("auth getSession buildPmUser failed", e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    // React to auth changes (login, invite acceptance, logout)
    // Skip INITIAL_SESSION — getSession() above owns the initial loading state.
    // Handling it here causes a race: if the stored token is stale/wrong-project it
    // fires null first, sets loading=false with no user, and triggers a login redirect
    // before getSession() can resolve with the real session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (session?.user) {
        try {
          const pmUser = await buildPmUser(session.user.id, session.user.email ?? "");
          setUser(pmUser);
        } catch (e) {
          console.error("auth onAuthStateChange buildPmUser failed", e);
        } finally {
          setLoading(false);
        }

        // When an invited staff member accepts their invite, link their auth ID and clean up any
        // auto-assigned user_roles entry that a DB trigger may have created.
        if (event === "SIGNED_IN") {
          supabase
            .from("staff_members")
            .select("id, pm_role")
            .eq("email", session.user.email ?? "")
            .maybeSingle()
            .then(({ data: staffRow }) => {
              if (staffRow && staffRow.pm_role === "staff") {
                // Link user_id (only if not yet linked)
                supabase
                  .from("staff_members")
                  .update({ user_id: session.user.id, status: "active" })
                  .eq("id", staffRow.id)
                  .is("user_id", null)
                  .then(() => {});
                // Remove any auto-assigned owner/admin role — staff must not be in user_roles
                supabase.from("user_roles").delete().eq("user_id", session.user.id).then(() => {});
              }
            });
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return <AuthCtx.Provider value={{ user, loading, signOut }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
