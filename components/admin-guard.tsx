"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldOff } from "lucide-react";

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading) return null;

  if (!user) return null;

  if (user.pmRole !== "admin") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-12">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "#ef444418", border: "1px solid #ef444430" }}
        >
          <ShieldOff size={28} style={{ color: "#ef4444" }} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold mb-1.5" style={{ color: "var(--text)" }}>
            Access Restricted
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            This section is only available to admins.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--bg-surface)", color: "var(--text)", border: "1px solid var(--border)" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
