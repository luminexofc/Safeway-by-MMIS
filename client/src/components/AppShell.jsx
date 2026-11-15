import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useSession } from "../lib/session";
import { useLang } from "../lib/lang";
import { cn } from "../../../shared/cn";

const COPY = {
  en: {
    offline: "You're offline. Live reports, address search and route updates may be unavailable.",
  },
  bn: {
    offline: "আপনি অনলাইনে নেই। লাইভ রিপোর্ট, ঠিকানা খোঁজা ও রুট হালনাগাদ পাওয়া যাবে না।",
  },
};

function NetworkStatusBanner() {
  const [lang] = useLang();
  const copy = COPY[lang] || COPY.en;
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-[13px] font-semibold text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200" role="status" aria-live="polite" lang={lang}>
      {copy.offline}
    </div>
  );
}

export default function AppShell({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, avatar, logout } = useSession();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("sw-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sw-sidebar-collapsed", String(next));
      } catch {}
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 220);
      return next;
    });
  };

  const isLanding = loc.pathname === "/";
  const isAuth = ["/login", "/signup", "/verify", "/reset", "/auth-error", "/auth/callback"].includes(loc.pathname);

  if (isLanding) return <><NetworkStatusBanner />{children}</>;

  if (isAuth) {
    return (
      <div className="min-h-screen bg-paper dark:bg-slate-950">
        <NetworkStatusBanner />
        <main>{children}</main>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    nav("/login", { replace: true });
  };

  return (
    <div className="sw-app-shell min-h-screen pb-28 lg:pb-0">
      <NetworkStatusBanner />
      <Navbar
        user={user}
        avatar={avatar}
        onLogout={handleLogout}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      <main
        className={cn(
          "sw-app-main w-full px-4 py-4 sm:px-6 lg:px-8 lg:py-6 transition-[margin,width] duration-200 ease-in-out",
          collapsed ? "lg:ml-20 lg:w-[calc(100%-5rem)]" : "lg:ml-64 lg:w-[calc(100%-16rem)]"
        )}
      >
        {children}
      </main>
    </div>
  );
}
