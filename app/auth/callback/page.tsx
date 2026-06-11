"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { linkStaffAccount } from "@/app/actions/invite";
import { Zap, AlertCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
      const code = params.get("code");
      const errorDesc = params.get("error_description") || hashParams.get("error_description");

      if (errorDesc) {
        setError(decodeURIComponent(errorDesc));
        return;
      }

      // PKCE flow: exchange the code for a session
      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
        // Link the invited staff_members row (sets user_id + status='active')
        // before any page tries to resolve this user against active staff.
        if (data.session?.access_token) {
          await linkStaffAccount(data.session.access_token);
        }
        // Invited users need to set a password before they can log in next time
        if (data.session?.user?.app_metadata?.provider === "email" && !data.session.user.last_sign_in_at) {
          router.replace("/auth/set-password");
        } else {
          router.replace("/dashboard");
        }
        return;
      }

      // Implicit flow: tokens arrive as URL hash fragments (#access_token=...)
      // supabase-js automatically parses these via onAuthStateChange
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          // Check if this is an invite acceptance (user has no password yet)
          const isInvite = hashParams.get("type") === "invite";
          // Defer the server action out of the auth callback (auth-js holds its
          // internal lock for the callback's duration — see lib/auth-context.tsx).
          const token = session.access_token;
          setTimeout(async () => {
            await linkStaffAccount(token);
            router.replace(isInvite ? "/auth/set-password" : "/dashboard");
          }, 0);
        }
      });

      // Fallback: session already established
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace("/dashboard");
      }

      return () => subscription.unsubscribe();
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--bg-base)" }}
      >
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm max-w-sm text-center"
          style={{ background: "#ef444418", border: "1px solid #ef444440", color: "#f87171" }}
        >
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
        <button
          onClick={() => router.replace("/login")}
          className="text-sm"
          style={{ color: "var(--accent)" }}
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center anim-float"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
      >
        <Zap size={20} color="#fff" fill="#fff" />
      </div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Setting up your account…
      </p>
    </div>
  );
}
