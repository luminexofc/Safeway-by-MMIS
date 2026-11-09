// beui-adapted Button: spring press feedback plus variants.
// Design language from @beui/button (motion SPRING_PRESS, reduced-motion safe).
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { cn } from "../../../../shared/cn";
import { SPRING_PRESS } from "../../lib/ease";

const VARIANTS = {
  primary: "bg-teal-700 text-white hover:bg-teal-800",
  dark: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-slate-100 dark:hover:border-white/30 dark:hover:bg-white/5",
  outlineLight: "border border-white/30 bg-transparent text-white hover:bg-white/10",
};

export default function BeuiButton({
  to, children, variant = "primary", loading = false,
  className = "", onClick, type = "button", disabled = false,
}) {
  const reduce = useReducedMotion();
  const cls = cn(
    "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60",
    VARIANTS[variant] || VARIANTS.primary,
    className
  );
  const inner = (
    <>
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      <span className="inline-flex items-center gap-2">{children}</span>
    </>
  );
  const motionProps = reduce ? {} : { whileTap: { scale: 0.97 }, transition: SPRING_PRESS };
  if (to) {
    return (
      <motion.span {...motionProps} className="inline-flex">
        <Link to={to} className={cls} aria-disabled={disabled}>{inner}</Link>
      </motion.span>
    );
  }
  return (
    <motion.button type={type} onClick={onClick} disabled={disabled || loading} className={cls} {...motionProps}>
      {inner}
    </motion.button>
  );
}
