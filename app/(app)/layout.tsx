"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store";
import { Zap } from "lucide-react";

function AppLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-base)" }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center anim-float"
        style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
      >
        <Zap size={20} color="#fff" fill="#fff" />
      </div>
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
    if (!loading && !initialized) init();
  }, [loading, initialized]);

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
