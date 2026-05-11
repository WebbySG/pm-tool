"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export interface PmUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
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
      supabase.from("staff_members")
        .select("first_name, last_name, pm_role, avatar_initials, can_access_content")
        .eq("user_id", authId)
        .maybeSingle(),
    ]);

    const isOwnerAdmin = ["owner", "admin"].includes(roleRow?.role ?? "");
    const pmRole: "admin" | "staff" = isOwnerAdmin
      ? "admin"
      : ((staffRow?.pm_role as "admin" | "staff") ?? "staff");

    const firstName = staffRow?.first_name ?? email.split("@")[0] ?? "";
    const lastName = staffRow?.last_name ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ") || email;
    const avatar =
      staffRow?.avatar_initials ||
      (firstName[0] + (lastName[0] ?? "")).toUpperCase() ||
      "?";
    const canAccessContent = isOwnerAdmin ? true : (staffRow?.can_access_content ?? false);

    return { id: authId, email, name, avatar, pmRole, canAccessContent };
  } catch {
    const name = email.split("@")[0] ?? email;
    return {
      id: authId, email, name,
      avatar: name.slice(0, 2).toUpperCase(),
      pmRole: "staff",
      canAccessContent: false,
    };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PmUser | null>(null);
  const [loading, setLoading] = useState(true);
  // Version counter: prevents a stale buildPmUser result from overwriting a
  // more recent SIGNED_OUT or TOKEN_REFRESHED event that arrived while we waited.
  const seqRef = useRef(0);

  useEffect(() => {
    // Phase 1: getSession() resolves the stored session immediately (including
    // token refresh if the access token is expired). This handles the page-refresh
    // case without relying on the async onAuthStateChange INITIAL_SESSION event,
    // which can race with other events fired at startup.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const mySeq = ++seqRef.current;
      if (session?.user) {
        const pmUser = await buildPmUser(session.user.id, session.user.email ?? "");
        if (mySeq === seqRef.current) {
          setUser(pmUser);
          setLoading(false);
        }
      } else {
        if (mySeq === seqRef.current) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    // Phase 2: listen for subsequent auth changes (login, logout, token refresh).
    // INITIAL_SESSION is skipped — already handled by getSession() above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "INITIAL_SESSION") return;
        const mySeq = ++seqRef.current;
        if (session?.user) {
          const pmUser = await buildPmUser(session.user.id, session.user.email ?? "");
          if (mySeq === seqRef.current) {
            setUser(pmUser);
            setLoading(false);
          }
        } else {
          if (mySeq === seqRef.current) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <AuthCtx.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
