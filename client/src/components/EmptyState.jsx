// EmptyState: centered empty placeholder with optional action.
import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300/70 bg-white/40 px-6 py-10 text-center dark:border-white/15 dark:bg-white/5 ${className}`}>
      <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      {title ? <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p> : null}
      {description ? <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}