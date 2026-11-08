import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { SessionProvider, useSession } from "./lib/session";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import { Login, Signup, Verify, AuthError, ResetPassword } from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NavigatePage from "./pages/Navigate";
import Report from "./pages/Report";
import MyReports from "./pages/MyReports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-[32px] font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">That road is not on the map. Head back to safety:</p>
      <Link to="/dashboard" className="mt-5 inline-flex min-h-[44px] items-center rounded-xl bg-brand-700 px-5 font-bold text-white">Back to dashboard</Link>
    </div>
  );
}

// Gate for app pages: bounce to /login until a session exists.
function Protected({ children }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f5] text-[14px] font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading Safeway…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppShell>{children}</AppShell>;
}

const Shell = ({ children }) => <AppShell>{children}</AppShell>;

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shell><Landing /></Shell>} />
          <Route path="/login" element={<Shell><Login /></Shell>} />
          <Route path="/signup" element={<Shell><Signup /></Shell>} />
          <Route path="/verify" element={<Shell><Verify /></Shell>} />
          <Route path="/reset" element={<Shell><ResetPassword /></Shell>} />
          <Route path="/auth-error" element={<Shell><AuthError /></Shell>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/navigate" element={<Protected><NavigatePage /></Protected>} />
          <Route path="/report" element={<Protected><Report /></Protected>} />
          <Route path="/my-reports" element={<Protected><MyReports /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Shell><NotFound /></Shell>} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
