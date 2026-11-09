import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Home, Route, FileSearch, LogIn, UserPlus, ClipboardList, User, Settings,
  LogOut, Languages, ChevronDown, ShieldCheck,
} from "lucide-react";
import { useLang } from "../lib/lang";
import ThemeToggle from "./ThemeToggle";

/* ------------------------------------------------------------------ */
/* Config: adjust the paths to match your router                       */
/* ------------------------------------------------------------------ */
const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  navigate: "/navigate",
  track: "/report",
  myReports: "/my-reports",
  profile: "/profile",
  settings: "/settings",
  login: "/login",
  signup: "/signup",
};

const LANG_NAMES = { en: "English", bn: "বাংলা" };
const LANG_SHORT = { en: "EN", bn: "বাং" };

// Full labels are for the desktop bar and menus; the "S" labels are short ones for the phone bottom bar.
const DICT = {
  en: {
    brand: "Safeway", home: "Home", findRoute: "Find Route", trackReport: "Report flooding",
    login: "Login", signup: "Sign Up", myReport: "My Report", profile: "Profile",
    settings: "Settings", logout: "Logout", theme: "Theme", light: "Light", dark: "Dark",
    language: "Language", switchTo: "Switch to", account: "Account menu",
    main: "Main navigation", mobileNav: "Mobile navigation",
    homeS: "Home", routeS: "Route", trackS: "Report", loginS: "Login",
    signupS: "Sign Up", reportS: "Reports", profileS: "Profile",
  },
  bn: {
    brand: "সেফওয়ে", home: "হোম", findRoute: "রুট খুঁজুন", trackReport: "জলাবদ্ধতা রিপোর্ট",
    login: "লগইন", signup: "সাইন আপ", myReport: "আমার রিপোর্ট", profile: "প্রোফাইল",
    settings: "সেটিংস", logout: "লগআউট", theme: "থিম", light: "লাইট", dark: "ডার্ক",
    language: "ভাষা", switchTo: "পরিবর্তন করুন:", account: "অ্যাকাউন্ট মেনু",
    main: "প্রধান নেভিগেশন", mobileNav: "মোবাইল নেভিগেশন",
    homeS: "হোম", routeS: "রুট", trackS: "রিপোর্ট", loginS: "লগইন",
    signupS: "সাইন আপ", reportS: "রিপোর্ট", profileS: "প্রোফাইল",
  },
};

const SPRING = { type: "spring", stiffness: 420, damping: 34 };
const cn = (...a) => a.filter(Boolean).join(" ");

const ICON_BTN =
  "inline-flex h-11 min-w-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300/60 bg-white/40 px-2.5 text-[12.5px] font-bold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10";

/* ------------------------------------------------------------------ */
/* One-click language button: English <-> বাংলা                         */
/* ------------------------------------------------------------------ */
function LangButton({ lang, onChange, t }) {
  const next = lang === "en" ? "bn" : "en";
  const label = `${t.language}: ${LANG_NAMES[lang]}. ${t.switchTo} ${LANG_NAMES[next]}`;
  return (
    <button type="button" onClick={() => onChange(next)} aria-label={label} title={label} className={ICON_BTN}>
      <Languages className="h-5 w-5" aria-hidden="true" />
      <span aria-hidden="true" lang={lang}>{LANG_SHORT[lang]}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Navbar                                                              */
/*  - Desktop (lg+): full top bar with links.                          */
/*  - Phones/tablets: slim top bar (name, language, theme, account)    */
/*    plus an app-style bottom navigation.                             */
/* Props: user (null when logged out), onLogout.                       */
/* Optional controlled props: lang, onLangChange                       */
/* ------------------------------------------------------------------ */
export default function Navbar({ user = null, onLogout, lang: langProp, onLangChange }) {
  const reduce = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();

  const [ownLang, setOwnLang] = useLang();
  const lang = langProp ?? ownLang;
  const setLang = onLangChange ?? setOwnLang;
  const t = DICT[lang] || DICT.en;

  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef(null);

  const loggedIn = Boolean(user);

  // Sign In page offers Sign Up; Sign Up page (and every other logged-out page) offers Login
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const authCta = path === ROUTES.login
    ? { to: ROUTES.signup, label: t.signup, short: t.signupS, icon: UserPlus }
    : { to: ROUTES.login, label: t.login, short: t.loginS, icon: LogIn };

  // Desktop top-bar links
  const primary = loggedIn
    ? [
        { to: ROUTES.dashboard, label: t.home, icon: Home, end: true },
        { to: ROUTES.navigate, label: t.findRoute, icon: Route },
        { to: ROUTES.track, label: t.trackReport, icon: FileSearch },
        { to: ROUTES.myReports, label: t.myReport, icon: ClipboardList },
      ]
    : [
        { to: ROUTES.home, label: t.home, icon: Home, end: true },
        { to: ROUTES.navigate, label: t.findRoute, icon: Route },
        { to: ROUTES.track, label: t.trackReport, icon: FileSearch },
      ];

  // Phone bottom bar: always five items. Settings and Logout live in the account menu up top.
  const bottom = loggedIn
    ? [
        { to: ROUTES.dashboard, label: t.homeS, icon: Home, end: true },
        { to: ROUTES.navigate, label: t.routeS, icon: Route },
        { to: ROUTES.track, label: t.trackS, icon: FileSearch },
        { to: ROUTES.myReports, label: t.reportS, icon: ClipboardList },
        { to: ROUTES.profile, label: t.profileS, icon: User },
      ]
    : [
        { to: ROUTES.home, label: t.homeS, icon: Home, end: true },
        { to: ROUTES.navigate, label: t.routeS, icon: Route },
        { to: ROUTES.track, label: t.trackS, icon: FileSearch },
        { to: authCta.to, label: authCta.short, icon: authCta.icon },
      ];

  const account = [
    { to: ROUTES.profile, label: t.profile, icon: User },
    { to: ROUTES.settings, label: t.settings, icon: Settings },
  ];

  const handleLogout = () => {
    setAcctOpen(false);
    onLogout?.();
    navigate(ROUTES.home);
  };

  // Close the account menu when the route changes
  useEffect(() => { setAcctOpen(false); }, [location.pathname]);

  // Escape and outside click close the account menu
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setAcctOpen(false); };
    const onDoc = (e) => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDoc);
    };
  }, []);

  const initial = (user?.name || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <>
      {/* ---------------- Top bar ---------------- */}
      <header className="sticky top-0 z-[800] border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
          {/* Brand */}
          <Link to={loggedIn ? ROUTES.dashboard : ROUTES.home} className="flex shrink-0 items-center gap-2 rounded-xl py-1 pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-700 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="hidden text-[18px] font-bold tracking-tight text-slate-900 min-[340px]:inline dark:text-white">{t.brand}</span>
          </Link>

          {/* Desktop links */}
          <nav aria-label={t.main} className="ml-4 hidden items-center gap-1 lg:flex">
            {primary.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className="relative block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600">
                {({ isActive }) => (
                  <span className={cn(
                    "relative flex min-h-[44px] items-center gap-2 rounded-xl px-3.5 text-[14.5px] font-semibold transition-colors",
                    isActive
                      ? "text-teal-700 dark:text-teal-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
                  )}>
                    {isActive && (
                      <motion.span layoutId="topnav-active-pill" transition={reduce ? { duration: 0 } : SPRING}
                        className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-teal-700 dark:bg-teal-300" />
                    )}
                    <n.icon className="relative z-10 h-4 w-4 shrink-0" />
                    <span className="relative z-10 whitespace-nowrap">{n.label}</span>
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Language + theme: on every screen size, one click each */}
          <LangButton lang={lang} onChange={setLang} t={t} />
          <ThemeToggle />

          {/* Account menu (logged in) on every screen size */}
          {loggedIn && (
            <div className="relative" ref={acctRef}>
              <button type="button" onClick={() => setAcctOpen((v) => !v)}
                aria-haspopup="menu" aria-expanded={acctOpen} aria-label={t.account}
                className="flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300/60 bg-white/40 py-1 pl-1.5 pr-1.5 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 sm:pr-2.5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-700 text-[14px] font-bold text-white">{initial}</span>
                <ChevronDown className={cn("hidden h-4 w-4 text-slate-500 transition-transform sm:block dark:text-slate-400", acctOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {acctOpen && (
                  <motion.div role="menu"
                    initial={reduce ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-slate-900">
                    {user?.name && (
                      <p className="truncate px-3 pb-2 pt-1.5 text-[13px] font-semibold text-slate-500 dark:text-slate-400">{user.name}</p>
                    )}
                    {account.map((a) => (
                      <NavLink key={a.to} to={a.to} role="menuitem"
                        className={({ isActive }) => cn(
                          "flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-[14px] font-semibold",
                          isActive
                            ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-white"
                            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                        )}>
                        <a.icon className="h-4 w-4" />{a.label}
                      </NavLink>
                    ))}
                    <div className="my-1.5 border-t border-slate-100 dark:border-white/10" />
                    <button type="button" role="menuitem" onClick={handleLogout}
                      className="flex min-h-[44px] w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-[14px] font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                      <LogOut className="h-4 w-4" />{t.logout}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Login / Sign Up button (logged out): desktop only, phones use the bottom bar */}
          {!loggedIn && (
            <Link to={authCta.to}
              className="hidden min-h-[44px] items-center gap-2 rounded-xl bg-teal-700 px-4 text-[14.5px] font-bold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 lg:inline-flex">
              <authCta.icon className="h-4 w-4" />{authCta.label}
            </Link>
          )}
        </div>
      </header>

      {/* ---------------- Phone bottom navigation ---------------- */}
      <nav aria-label={t.mobileNav} className="fixed inset-x-3 z-[600] lg:hidden"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className={`mx-auto grid max-w-xl gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-white/10 dark:bg-slate-950 ${loggedIn ? "grid-cols-5" : "grid-cols-4"}`}>
          {bottom.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className="relative block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600">
              {({ isActive }) => (
                <span className={cn(
                  "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10.5px] font-bold leading-tight transition-colors",
                  isActive ? "text-white dark:text-slate-950" : "text-slate-600 dark:text-slate-300"
                )}>
                  {isActive && (
                    <motion.span layoutId="bottom-nav-pill" transition={reduce ? { duration: 0 } : SPRING}
                      className="absolute inset-0 rounded-xl bg-teal-700 dark:bg-teal-300" />
                  )}
                  <n.icon className="relative z-10 h-5 w-5 shrink-0" />
                  <span className="relative z-10 max-w-full truncate">{n.label}</span>
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}