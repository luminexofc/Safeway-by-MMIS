import { Check, TriangleAlert, X, Info, Circle } from "lucide-react";
import { cn } from "../../../../shared/cn";

const STATUS = {
  safe: "sw-status-safe",
  success: "sw-status-neutral",
  caution: "sw-status-caution",
  warning: "sw-status-caution",
  danger: "sw-status-danger",
  info: "sw-status-info",
  neutral: "sw-status-neutral",
  loading: "sw-status-info",
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

// Green, amber, and red are reserved for road condition semantics.
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
