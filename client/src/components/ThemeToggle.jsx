import { Sun, Moon } from "lucide-react";
import { useTheme, nextThemeMode } from "../../../shared/theme";
import { useLang } from "../lib/lang";

const ICONS = { light: Sun, dark: Moon };
const NAMES = {
  en: { light: "Light", dark: "Dark", theme: "Theme", switchTo: "Switch to" },
  bn: { light: "লাইট", dark: "ডার্ক", theme: "থিম", switchTo: "পরিবর্তন করুন:" },
};

/** One-click theme button: light <-> dark. */
export default function ThemeToggle({ className = "" }) {
  const { mode, setMode } = useTheme();
  const [lang] = useLang();
  const n = NAMES[lang] || NAMES.en;
  const Icon = ICONS[mode] || Sun;
  const next = nextThemeMode(mode);
  const label = `${n.theme}: ${n[mode]}. ${n.switchTo} ${n[next]}`;
  return (
    <button type="button" onClick={() => setMode(next)} aria-label={label} title={label}
      className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 ${className}`}>
      <Icon className="h-5 w-5" />
    </button>
  );
}
