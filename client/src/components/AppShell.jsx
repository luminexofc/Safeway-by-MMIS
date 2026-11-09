import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useSession } from "../lib/session";

export default function AppShell({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useSession();

  const isLanding = loc.pathname === "/";
  const isAuth = ["/login", "/signup", "/verify", "/reset", "/auth-error", "/auth/callback"].includes(loc.pathname);

  if (isLanding) return <>{children}</>;

  if (isAuth) {
    return (
      <div className="min-h-screen bg-paper dark:bg-slate-950">
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
      <Navbar user={user} onLogout={handleLogout} />

      <main className="sw-app-main w-full px-4 py-4 sm:px-6 lg:ml-64 lg:w-[calc(100%-16rem)] lg:px-8 lg:py-6">{children}</main>
    </div>
  );
}
