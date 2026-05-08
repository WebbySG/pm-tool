"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface PmUser {
  id: string;       // Supabase auth UUID
  email: string;
  name: string;
  avatar: string;   // Initials e.g. "AT"
  pmRole: "admin" | "staff";
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
  const [{ data: roleRow }, { data: staffRow }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", authId).maybeSingle(),
    supabase.from("staff_members").select("first_name, last_name, pm_role, avatar_initials").eq("user_id", authId).maybeSingle(),
  ]);

  const isOwnerAdmin = ["owner", "admin"].includes(roleRow?.role ?? "");
  const pmRole: "admin" | "staff" = isOwnerAdmin ? "admin" : ((staffRow?.pm_role as "admin" | "staff") ?? "staff");

  const firstName = staffRow?.first_name ?? email.split("@")[0] ?? "";
  const lastName = staffRow?.last_name ?? "";
  const name = [firstName, lastName].filter(Boolean).join(" ") || email;
  const avatar = staffRow?.avatar_initials || (firstName[0] + (lastName[0] ?? "")).toUpperCase() || "?";

  return { id: authId, email, name, avatar, pmRole };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PmUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(await buildPmUser(session.user.id, session.user.email ?? ""));
      }
      setLoading(false);
    });

    // React to auth changes (login, invite acceptance, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const pmUser = await buildPmUser(session.user.id, session.user.email ?? "");
        setUser(pmUser);
        setLoading(false);

        // When an invited user accepts their invite, link their auth ID to staff_members
        if (event === "SIGNED_IN") {
          supabase
            .from("staff_members")
            .update({ user_id: session.user.id, status: "active" })
            .eq("email", session.user.email ?? "")
            .is("user_id", null)
            .then(() => {});
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
