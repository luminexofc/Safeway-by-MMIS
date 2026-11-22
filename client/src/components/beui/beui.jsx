// Beui-style labelled input. This file used to carry a card, skeleton, live
// island, toast stack and command palette as well; nothing imported them, and
// the palette hard-coded destinations that have since moved. Only the input
// survived, so only the input is kept.
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "../../../../shared/cn";

export function BeuiCard({ children, className = "" }) {
  return <div className={cn("rounded-2xl border border-rule bg-white dark:border-white/10 dark:bg-slate-900", className)}>{children}</div>;
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`} />;
}

export function BeuiInput({ label, hint, error, success, icon: Icon, rightElement, className = "", ...props }) {
  const reduce = useReducedMotion();
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-[13.5px] font-semibold text-slate-800">{label}</span>}
      <motion.span
        className="block"
        {...(reduce || !error ? {} : { animate: { x: [0, -7, 7, -4, 4, 0] }, transition: { duration: 0.35 } })}
      >
        <span className={cn("flex min-h-[48px] items-center gap-2.5 rounded-xl border bg-surface px-3.5 transition-colors dark:bg-paper",
          error ? "border-red-400 dark:border-red-500" : success ? "border-safe dark:border-safe" : "border-slate-300 focus-within:border-focus focus-within:ring-2 focus-within:ring-accent-weak dark:border-slate-700 dark:focus-within:border-focus dark:focus-within:ring-accent-weak")}>
          {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />}
          <input
            {...props}
            className={cn(
              "w-full bg-transparent py-3 text-[14.5px] font-medium text-ink outline-none placeholder:text-muted-2",
              props.readOnly && "cursor-default text-slate-800 font-semibold",
              props.className
            )}
          />
          {rightElement}
          {success && <CheckCircle2 className="h-4 w-4 shrink-0 text-safe dark:text-safe" />}
        </span>
      </motion.span>
      {hint && !error && <span className="mt-1 block text-[12.5px] text-slate-500 dark:text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-[12.5px] font-semibold text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
