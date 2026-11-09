import { cn } from "../../../../shared/cn";

const CARD = "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900";

const fmtDist = (m) => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
const fmtTime = (s) => {
  const m = Math.max(1, Math.round(s / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export default function RouteCard({ route, routing, mode, setMode, modes, dest, hazardText, hazardLevel, hazardStyle, clearRoute, compact = false }) {
  const hl = hazardStyle[hazardLevel];
  const HlIcon = hl.Icon;
  return (
    <div className={CARD}>
      {/* Transport mode tabs */}
      <div className="flex border-b border-slate-100 dark:border-white/10">
        {Object.entries(modes).map(([key, { label, Icon }]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              "flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-[11.5px] font-bold transition-colors",
              mode === key
                ? "-mb-px border-b-2 border-teal-700 text-teal-700 dark:border-teal-400 dark:text-teal-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className={cn("space-y-3 p-4", compact && "py-3")}>
        {routing ? (
          <p className="text-[13px] text-slate-500 dark:text-slate-400">Finding route…</p>
        ) : route ? (
          <>
            {/* ETA + distance */}
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold leading-none text-slate-900 dark:text-slate-100 sm:text-[26px]">
                {fmtTime(route.duration)}
              </span>
              <span className="text-[13px] text-slate-500 dark:text-slate-400">{fmtDist(route.distance)}</span>
            </div>

            {/* Safety banner */}
            <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2", hl.bannerCls)}>
              <HlIcon className={cn("mt-0.5 h-4 w-4 shrink-0", hl.iconCls)} />
              <p className={cn("text-[12.5px] font-bold", hl.textCls)}>{hazardText}</p>
            </div>

            {/* From → To (desktop only; too verbose on mobile) */}
            {!compact && (
              <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 shrink-0 rounded-full bg-teal-700 dark:bg-teal-400" />
                <span className="truncate">Your location</span>
                <span className="shrink-0">→</span>
                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{dest?.name}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-[13px] text-slate-500 dark:text-slate-400">Select a destination to get directions.</p>
        )}

        <button
          onClick={clearRoute}
          className="w-full min-h-[38px] cursor-pointer rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          End route
        </button>
      </div>
    </div>
  );
}
