// StatusStamp: pill-shaped status badge for verified/pending/failed etc.
// Tones are semantic (road-state colors) but used ONLY for status, never decor.
const TONES = {
  neutral: "border-slate-300/70 bg-slate-100 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200",
  teal: "border-teal-700/30 bg-teal-50 text-teal-800 dark:border-teal-400/30 dark:bg-teal-900/30 dark:text-teal-200",
  green: "border-emerald-700/30 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-900/30 dark:text-emerald-200",
  amber: "border-amber-700/30 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-900/30 dark:text-amber-200",
  red: "border-red-700/30 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-900/30 dark:text-red-200",
  blue: "border-sky-700/30 bg-sky-50 text-sky-800 dark:border-sky-400/30 dark:bg-sky-900/30 dark:text-sky-200",
};

export default function StatusStamp({ tone = "neutral", className = "", children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONES[tone] || TONES.neutral} ${className}`}>
      {children}
    </span>
  );
}