import { Check, TriangleAlert, X, Info, Circle } from "lucide-react";
import { cn } from "../../../../shared/cn";

const STATUS = {
  safe: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  caution: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  info: "border-teal-600/30 bg-teal-600/10 text-teal-800 dark:text-teal-300",
  neutral: "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
  loading: "border-teal-600/30 bg-teal-600/10 text-teal-800 dark:text-teal-300",
};

const ICONS = {
  safe: Check,
  success: Check,
  caution: TriangleAlert,
  warning: TriangleAlert,
  danger: X,
  info: Info,
  neutral: Circle,
  loading: Info,
};

// Static status pill. Tones carry the safety meaning (green/amber/red) or
// neutral UI states; the icon names the tone at a glance.
export default function BeuiBadge({ tone = "neutral", children, className = "" }) {
  const Icon = ICONS[tone] || Circle;
  return (
    <span
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold tabular-nums",
        STATUS[tone] || STATUS.neutral,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="inline-flex whitespace-nowrap">{children}</span>
    </span>
  );
}
