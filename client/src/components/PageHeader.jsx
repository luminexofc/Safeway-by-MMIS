// PageHeader: consistent title block with hairline rule below.
export default function PageHeader({ eyebrow, title, description, actions, className = "" }) {
  return (
    <header className={`mb-6 border-b border-slate-200 pb-4 dark:border-white/10 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="sw-eyebrow mb-1">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}