import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ClipboardList, FilePlus2, LogOut, Map, Navigation, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, UserRound } from "lucide-react";
import { useLang, setLang } from "../lib/lang";
import { cn } from "../../../shared/cn";
import ThemeToggle from "./ThemeToggle";
import SignInPrompt from "./auth/SignInPrompt";

const LABELS = {
  en: {
    map: "Map",
    route: "Find route",
    report: "Report road",
    reports: "My reports",
    profile: "Profile",
    settings: "Settings",
    account: "Account",
    signIn: "Sign in",
    logout: "Log out",
    nav: "Main navigation",
    mobile: "Mobile navigation",
    language: "বাংলা",
    switchTo: "Switch to Bengali",
    accountMenu: "Account menu",
    collapse: "Collapse sidebar",
    expand: "Expand sidebar",
    promptReportTitle: "Sign in to report a road",
    promptReportBody: "Reports are tied to a real account so the verification team can follow up. Browsing the map stays free.",
    promptRouteTitle: "Sign in to plan a route",
    promptRouteBody: "Route planning is part of your signed-in workspace. Browsing the safety map needs no account.",
  },
  bn: {
    map: "মানচিত্র",
    route: "রুট খুঁজুন",
    report: "সড়ক রিপোর্ট",
    reports: "আমার রিপোর্ট",
    profile: "প্রোফাইল",
    settings: "সেটিংস",
    account: "অ্যাকাউন্ট",
    signIn: "লগইন",
    logout: "লগআউট",
    nav: "প্রধান নেভিগেশন",
    mobile: "মোবাইল নেভিগেশন",
    language: "English",
    switchTo: "ইংরেজিতে পরিবর্তন করুন",
    accountMenu: "অ্যাকাউন্ট মেনু",
    collapse: "সাইডবার সঙ্কুচিত করুন",
    expand: "সাইডবার প্রসারিত করুন",
    promptReportTitle: "সড়ক রিপোর্ট করতে লগইন করুন",
    promptReportBody: "রিপোর্ট একটি প্রকৃত অ্যাকাউন্টের সাথে যুক্ত থাকে, যাতে যাচাই দল যোগাযোগ করতে পারে। মানচিত্র দেখা সবার জন্য উন্মুক্ত।",
    promptRouteTitle: "রুট পরিকল্পনা করতে লগইন করুন",
    promptRouteBody: "রুট পরিকল্পনা লগইন করা ওয়ার্কস্পেসের অংশ। নিরাপত্তা মানচিত্র দেখতে অ্যাকাউন্ট লাগে না।",
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

/**
 * The phone header is the only chrome a signed-in person sees there, so the
 * account mark has to reach Profile, Settings and Log out. It opens a menu
 * instead of linking straight to Profile: the two destinations and the exit
 * belong together, and on a 320 px header there is no room for three targets.
 */
function MobileAccountMenu({ user, avatar, labels, onLogout }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const name = user.name || user.email || labels.account;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const rows = [
    { to: "/profile", label: labels.profile, icon: UserRound },
    { to: "/settings", label: labels.settings, icon: Settings },
  ];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={labels.accountMenu}
        title={name}
        className="sw-mobile-account inline-flex h-10 min-w-[40px] cursor-pointer items-center justify-center rounded-lg border border-rule text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus dark:hover:bg-white/10"
      >
        {avatar ? (
          <img className="h-[26px] w-[26px] rounded-full object-cover" src={avatar} alt="" />
        ) : (
          <UserRound size={18} aria-hidden="true" />
        )}
      </button>
      {open && (
        <div
          role="menu"
          aria-label={labels.accountMenu}
          className="absolute right-0 top-full z-[800] mt-2 w-52 overflow-hidden rounded-2xl border border-rule bg-surface p-1.5 shadow-pop"
        >
          <p className="sw-mobile-account-name px-3 pb-2 pt-1 text-[13px] font-semibold">{name}</p>
          {rows.map((row) => (
            <Link
              key={row.to}
              to={row.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-[14px] font-semibold text-ink-2 hover:bg-paper-2 hover:text-ink dark:hover:bg-white/10"
            >
              <row.icon size={17} aria-hidden="true" />
              {row.label}
            </Link>
          ))}
          <div className="mt-1 border-t border-rule pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl border-0 bg-transparent px-3 text-left text-[14px] font-semibold text-ink-2 hover:bg-paper-2 hover:text-ink dark:hover:bg-white/10"
            >
              <LogOut size={17} aria-hidden="true" />
              {labels.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ user, avatar = null, onLogout, collapsed = false, onToggleCollapse }) {
  const [lang] = useLang();
  const t = LABELS[lang] || LABELS.en;
  const loggedIn = !!user;
  const home = loggedIn ? "/dashboard" : "/";
  // The map is public, so its item is always a plain link. Everything that
  // writes data or exposes personal history opens a sign-in prompt for a
  // guest; the prompt names the task and returns to it after auth, which is
  // friendlier than a silent bounce to /login.
  const [prompt, setPrompt] = useState(null);
  const items = [
    { to: loggedIn ? "/dashboard" : "/map", label: t.map, icon: Map, end: true },
    { to: "/navigate", gate: { id: "route", from: "/navigate" }, label: t.route, icon: Navigation },
    { to: "/report", gate: { id: "report", from: "/report" }, label: t.report, icon: FilePlus2 },
    ...(loggedIn ? [{ to: "/my-reports", label: t.reports, icon: ClipboardList }] : []),
  ];
  const promptCopy = {
    route: [t.promptRouteTitle, t.promptRouteBody],
    report: [t.promptReportTitle, t.promptReportBody],
  };
  const activePrompt = prompt ? promptCopy[prompt.id] ?? promptCopy.report : null;

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
      {items.map(({ to, label, icon: Icon, end, gate }) => {
        const linkClass = (isActive) =>
          cn("sw-task-link", isActive && "is-active", collapsed && !mobile && "justify-center px-0");
        const content = (
          <>
            <Icon size={19} aria-hidden="true" />
            {(!collapsed || mobile) && <span>{label}</span>}
          </>
        );
        if (!loggedIn && gate) {
          return (
            <button
              key={label}
              type="button"
              onClick={() => setPrompt(gate)}
              title={collapsed && !mobile ? label : undefined}
              aria-label={collapsed && !mobile ? label : undefined}
              className={cn(linkClass(false), "cursor-pointer border-0 bg-transparent text-left")}
            >
              {content}
            </button>
          );
        }
        return (
          <NavLink
            key={label}
            to={to}
            end={end}
            title={collapsed && !mobile ? label : undefined}
            aria-label={collapsed && !mobile ? label : undefined}
            className={({ isActive }) => linkClass(isActive)}
          >
            {content}
          </NavLink>
        );
      })}
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
          {loggedIn ? (
            <MobileAccountMenu user={user} avatar={avatar} labels={t} onLogout={onLogout} />
          ) : (
            <Link to="/login" className="sw-mobile-sign-in">
              {t.signIn}
            </Link>
          )}
        </div>
      </header>
      <TaskLinks mobile />
      <SignInPrompt
        open={prompt !== null}
        title={activePrompt?.[0]}
        body={activePrompt?.[1]}
        from={prompt?.from ?? "/dashboard"}
        onClose={() => setPrompt(null)}
      />
    </>
  );
}
