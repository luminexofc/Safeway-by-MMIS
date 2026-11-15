import { Link, NavLink } from "react-router-dom";
import { ClipboardList, FilePlus2, LogOut, Map, Navigation, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, UserRound } from "lucide-react";
import { useLang, setLang } from "../lib/lang";
import { cn } from "../../../shared/cn";
import ThemeToggle from "./ThemeToggle";

const LABELS = {
  en: {
    map: "Map",
    route: "Find route",
    report: "Report road",
    reports: "My reports",
    profile: "Profile",
    settings: "Settings",
    signIn: "Sign in",
    logout: "Log out",
    nav: "Main navigation",
    mobile: "Mobile navigation",
    language: "বাংলা",
    switchTo: "Switch to Bengali",
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
  },
  bn: {
    map: "মানচিত্র",
    route: "রুট খুঁজুন",
    report: "সড়ক রিপোর্ট",
    reports: "আমার রিপোর্ট",
    profile: "প্রোফাইল",
    settings: "সেটিংস",
    signIn: "লগইন",
    logout: "লগআউট",
    nav: "প্রধান নেভিগেশন",
    mobile: "মোবাইল নেভিগেশন",
    language: "English",
    switchTo: "ইংরেজিতে পরিবর্তন করুন",
    collapse: "সাইডবার সঙ্কুচিত করুন",
    expand: "সাইডবার প্রসারিত করুন",
  },
};

function Brand({ to, collapsed = false }) {
  return (
    <Link
      to={to}
      className={cn("sw-app-brand", collapsed && "sw-app-brand-collapsed justify-center px-0")}
      aria-label="Safeway home"
      title="Safeway"
    >
      <span className="sw-app-brand-mark">
        <ShieldCheck size={19} aria-hidden="true" />
      </span>
      {!collapsed && <span>Safeway</span>}
    </Link>
  );
}

export default function Navbar({ user, avatar = null, onLogout, collapsed = false, onToggleCollapse }) {
  const [lang] = useLang();
  const t = LABELS[lang] || LABELS.en;
  const loggedIn = !!user;
  const home = loggedIn ? "/dashboard" : "/";
  const items = [
    { to: loggedIn ? "/dashboard" : "/", label: t.map, icon: Map, end: true },
    { to: "/navigate", label: t.route, icon: Navigation },
    { to: "/report", label: t.report, icon: FilePlus2 },
    ...(loggedIn ? [{ to: "/my-reports", label: t.reports, icon: ClipboardList }] : []),
  ];

  const LanguageControl = ({ compact = false }) => (
    <button
      type="button"
      className={cn("sw-utility-button", compact && "px-1.5 text-xs min-h-[38px] w-full justify-center")}
      onClick={() => setLang(lang === "en" ? "bn" : "en")}
      aria-label={t.switchTo}
      title={t.switchTo}
    >
      {compact ? (lang === "en" ? "বাং" : "EN") : t.language}
    </button>
  );

  const TaskLinks = ({ mobile = false }) => (
    <nav
      className={mobile ? "sw-mobile-task-nav" : cn("sw-side-task-nav", collapsed && "sw-side-task-nav-collapsed")}
      aria-label={mobile ? t.mobile : t.nav}
    >
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={label}
          to={to}
          end={end}
          title={collapsed && !mobile ? label : undefined}
          aria-label={collapsed && !mobile ? label : undefined}
          className={({ isActive }) =>
            cn(
              "sw-task-link",
              isActive && "is-active",
              collapsed && !mobile && "justify-center px-0"
            )
          }
        >
          <Icon size={19} aria-hidden="true" />
          {(!collapsed || mobile) && <span>{label}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <aside className={cn("sw-sidebar", collapsed && "is-collapsed")} aria-label={t.nav}>
        <div className={cn("sw-sidebar-header flex items-center", collapsed ? "flex-col gap-2.5 justify-center" : "justify-between")}>
          <Brand to={home} collapsed={collapsed} />
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="sw-sidebar-toggle inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-rule text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:hover:bg-white/10"
              aria-label={collapsed ? t.expand : t.collapse}
              title={collapsed ? t.expand : t.collapse}
            >
              {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
            </button>
          )}
        </div>
        <TaskLinks />
        <div className={cn("sw-sidebar-bottom", collapsed && "sw-sidebar-bottom-collapsed")}>
          {loggedIn && (
            <div
              className={cn("sw-account-summary", collapsed && "justify-center px-0 border-t-0")}
              title={user.name || user.email || "Account"}
            >
              <span className="sw-account-mark">
                {avatar ? (
                  <img className="sw-account-mark-img" src={avatar} alt="" />
                ) : (
                  <UserRound size={16} aria-hidden="true" />
                )}
              </span>
              {!collapsed && (
                <span className="sw-account-name">{user.name || user.email || "Account"}</span>
              )}
            </div>
          )}
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <LanguageControl compact />
              <ThemeToggle align="left" />
            </div>
          ) : (
            <div className="sw-utility-row">
              <LanguageControl />
              <ThemeToggle align="left" />
            </div>
          )}
          {loggedIn && (
            <div className={cn("sw-account-links", collapsed && "flex flex-col items-center")}>
              <Link
                to="/profile"
                title={t.profile}
                aria-label={t.profile}
                className={cn(collapsed && "justify-center px-0 w-full")}
              >
                <UserRound size={17} aria-hidden="true" />
                {!collapsed && t.profile}
              </Link>
              <Link
                to="/settings"
                title={t.settings}
                aria-label={t.settings}
                className={cn(collapsed && "justify-center px-0 w-full")}
              >
                <Settings size={17} aria-hidden="true" />
                {!collapsed && t.settings}
              </Link>
            </div>
          )}
          {loggedIn ? (
            <button
              className={cn("sw-logout", collapsed && "justify-center px-0 w-full")}
              type="button"
              onClick={onLogout}
              title={t.logout}
              aria-label={t.logout}
            >
              <LogOut size={17} aria-hidden="true" />
              {!collapsed && t.logout}
            </button>
          ) : (
            <Link
              className={cn("sw-sign-in-link", collapsed && "justify-center px-0 text-xs text-center")}
              to="/login"
              title={t.signIn}
              aria-label={t.signIn}
            >
              {!collapsed ? t.signIn : "In"}
            </Link>
          )}
        </div>
      </aside>

      <header className="sw-mobile-header">
        <Brand to={home} />
        <div className="sw-mobile-utilities">
          <LanguageControl />
          <ThemeToggle align="right" />
          {!loggedIn && (
            <Link to="/login" className="sw-mobile-sign-in">
              {t.signIn}
            </Link>
          )}
        </div>
      </header>
      <TaskLinks mobile />
    </>
  );
}
