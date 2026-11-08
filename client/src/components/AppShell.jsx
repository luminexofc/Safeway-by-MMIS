import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useSession } from "../lib/session";

export default function AppShell({ children }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, logout } = useSession();

  const isLanding = loc.pathname === "/";
  const isAuth = ["/login", "/signup", "/verify", "/reset", "/auth-error"].includes(loc.pathname);

  if (isLanding) return <>{children}</>;

  if (isAuth) {
    return (
      <div className="min-h-screen bg-[#eef2f5] dark:bg-slate-950">
        <main>{children}</main>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    nav("/login", { replace: true });
  };

  return (
    <div className="min-h-screen pb-28 lg:pb-0">
      {/* The only navigation: full top bar on desktop; slim top bar + bottom bar on phones */}
      <Navbar user={user} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}
