import { Link, NavLink } from "react-router-dom";
import { ClipboardList, FilePlus2, LogOut, Map, Navigation, Settings, ShieldCheck, UserRound } from "lucide-react";
import { useLang, setLang } from "../lib/lang";
import ThemeToggle from "./ThemeToggle";

const LABELS = {
  en: { map: "Map", route: "Find route", report: "Report road", reports: "My reports", profile: "Profile", settings: "Settings", signIn: "Sign in", logout: "Log out", nav: "Main navigation", mobile: "Mobile navigation", language: "বাংলা" },
  bn: { map: "মানচিত্র", route: "রুট খুঁজুন", report: "সড়ক রিপোর্ট", reports: "আমার রিপোর্ট", profile: "প্রোফাইল", settings: "সেটিংস", signIn: "লগইন", logout: "লগআউট", nav: "প্রধান নেভিগেশন", mobile: "মোবাইল নেভিগেশন", language: "English" },
};

function Brand({ to }) {
  return <Link to={to} className="sw-app-brand" aria-label="Safeway home"><span className="sw-app-brand-mark"><ShieldCheck size={19} aria-hidden="true" /></span><span>Safeway</span></Link>;
}

export default function Navbar({ user, onLogout }) {
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

  const LanguageControl = () => (
    <button type="button" className="sw-utility-button" onClick={() => setLang(lang === "en" ? "bn" : "en")} aria-label={lang === "en" ? "Switch to Bengali" : "Switch to English"}>{t.language}</button>
  );

  const TaskLinks = ({ mobile = false }) => (
    <nav className={mobile ? "sw-mobile-task-nav" : "sw-side-task-nav"} aria-label={mobile ? t.mobile : t.nav}>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={label} to={to} end={end}
          className={({ isActive }) => `sw-task-link${isActive ? " is-active" : ""}`}>
          <Icon size={19} aria-hidden="true" /><span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="sw-sidebar" aria-label={t.nav}>
        <Brand to={home} />
        <TaskLinks />
        <div className="sw-sidebar-bottom">
          {loggedIn && <div className="sw-account-summary"><span className="sw-account-mark"><UserRound size={16} aria-hidden="true" /></span><span className="sw-account-name">{user.name || user.email || "Account"}</span></div>}
          <div className="sw-utility-row"><LanguageControl /><ThemeToggle /></div>
          {loggedIn && <div className="sw-account-links"><Link to="/profile"><UserRound size={17} aria-hidden="true" />{t.profile}</Link><Link to="/settings"><Settings size={17} aria-hidden="true" />{t.settings}</Link></div>}
          {loggedIn ? <button className="sw-logout" type="button" onClick={onLogout}><LogOut size={17} aria-hidden="true" />{t.logout}</button> : <Link className="sw-sign-in-link" to="/login">{t.signIn}</Link>}
        </div>
      </aside>

      <header className="sw-mobile-header">
        <Brand to={home} />
        <div className="sw-mobile-utilities"><LanguageControl /><ThemeToggle />{!loggedIn && <Link to="/login" className="sw-mobile-sign-in">{t.signIn}</Link>}</div>
      </header>
      <TaskLinks mobile />
    </>
  );
}
