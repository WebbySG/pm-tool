"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store";
import { Zap } from "lucide-react";

function AppLoader() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

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
      {timedOut && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Taking too long — session may be stuck.
          </p>
          <a
            href="/logout"
            className="text-sm font-semibold px-4 py-2 rounded-xl"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Sign out &amp; reset
          </a>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const initialized = useStore((s) => s.initialized);
  const init = useStore((s) => s.init);
  const refresh = useStore((s) => s.refresh);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!initialized) init();
  }, [initialized]);

  useEffect(() => {
    if (initialized) refresh();
  }, [pathname]);

  if (loading || !initialized) return <AppLoader />;
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className="flex-1 ml-60 overflow-y-auto flex flex-col"
        style={{ background: "var(--bg-base)" }}
      >
        {children}
      </main>
    </div>
  );
}
