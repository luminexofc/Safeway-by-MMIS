import { cn } from "../../../../shared/cn";
import { ShieldCheck, TriangleAlert } from "lucide-react";
import { useLang } from "../../lib/lang";

const CARD = "overflow-hidden rounded-2xl border border-rule bg-white shadow-lg dark:border-white/10 dark:bg-slate-900";

const COPY = {
  en: {
    finding: "Finding routes & safe alternatives…",
    routeOptions: "Route options",
    safeAlt: "Safe Alternative",
    bypassesWater: "Bypasses water",
    directBlocked: "Direct (Blocked)",
    roadClosed: "Road closed",
    safeActive: "🛡️ Safe route active: automatically navigates around {place}.",
    floodFallback: "the flooded road",
    warning: "⚠️ Warning: Direct route crosses a water blockade. Use the Safe Alternative to avoid getting stuck.",
    yourLocation: "Your location",
    selectDest: "Select a destination to get directions.",
    endRoute: "End route",
    kmUnit: "km",
    kmUnitShort: "km",
    minUnit: "min",
    hourUnit: "h",
  },
  bn: {
    finding: "রুট ও নিরাপদ বিকল্প খোঁজা হচ্ছে…",
    routeOptions: "রুটের বিকল্প",
    safeAlt: "নিরাপদ বিকল্প পথ",
    bypassesWater: "জলাবদ্ধতা এড়িয়ে যায়",
    directBlocked: "সরাসরি পথ (বন্ধ)",
    roadClosed: "সড়ক বন্ধ",
    safeActive: "🛡️ নিরাপদ রুট সক্রিয়: {place} স্বয়ংক্রিয়ভাবে এড়িয়ে যাচ্ছে।",
    floodFallback: "জলাবদ্ধ সড়কটি",
    warning: "⚠️ সতর্কতা: সরাসরি পথটি জলাবদ্ধতা অতিক্রম করে। আটকে যেতে এড়াতে নিরাপদ বিকল্প পথ নিন।",
    yourLocation: "আপনার অবস্থান",
    selectDest: "দিকনির্দেশনা পেতে গন্তব্য বাছুন।",
    endRoute: "রুট শেষ করুন",
    kmUnit: "কিমি",
    kmUnitShort: "কিমি",
    minUnit: "মিনিট",
    hourUnit: "ঘণ্টা",
  },
};

export default function RouteCard({
  route,
  primaryRoute,
  altRoute,
  activeRouteTab = "alt",
  onSelectRouteTab,
  blockadeOnRoute,
  routing,
  mode,
  setMode,
  modes,
  dest,
  hazardText,
  hazardLevel,
  hazardStyle,
  clearRoute,
  compact = false,
}) {
  const [lang] = useLang();
  const copy = COPY[lang] || COPY.en;
  const fmtDist = (m) =>
    m < 1000 ? `${Math.round(m)} ${copy.kmUnitShort}` : `${(m / 1000).toFixed(1)} ${copy.kmUnitShort}`;
  const fmtTime = (s) => {
    const m = Math.max(1, Math.round(s / 60));
    if (m < 60) return `${m} ${copy.minUnit}`;
    return `${Math.floor(m / 60)} ${copy.hourUnit} ${m % 60} ${copy.minUnit}`;
  };
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
                ? "-mb-px border-b-2 border-solid text-ink dark:border-focus dark:text-accent"
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
          <p className="text-[13px] text-slate-500 dark:text-slate-400">{copy.finding}</p>
        ) : route ? (
          <>
            {/* If an alternative bypass route exists, show selection tabs */}
            {altRoute && primaryRoute && onSelectRouteTab && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {copy.routeOptions}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {/* Option 1: Safe Alternative */}
                  <button
                    type="button"
                    onClick={() => onSelectRouteTab("alt")}
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                      activeRouteTab === "alt"
                        ? "border-safe bg-safe-soft dark:bg-safe-soft dark:border-safe shadow-sm ring-1 ring-safe"
                        : "border-slate-200 bg-paper-2 dark:border-white/10 dark:bg-white/5 hover:border-slate-300"
                    )}
                  >
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-safe dark:text-safe">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {copy.safeAlt}
                    </span>
                    <span className="mt-0.5 text-[16px] font-bold text-ink">
                      {fmtTime(altRoute.duration)}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {fmtDist(altRoute.distance)} · {copy.bypassesWater}
                    </span>
                  </button>

                  {/* Option 2: Direct (Blocked) Route */}
                  <button
                    type="button"
                    onClick={() => onSelectRouteTab("direct")}
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                      activeRouteTab === "direct"
                        ? "border-red-500 bg-red-50/90 dark:bg-red-950/40 dark:border-red-500 shadow-sm ring-1 ring-red-500/50"
                        : "border-slate-200 bg-paper-2 dark:border-white/10 dark:bg-white/5 hover:border-slate-300"
                    )}
                  >
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400">
                      <TriangleAlert className="h-3.5 w-3.5" />
                      {copy.directBlocked}
                    </span>
                    <span className="mt-0.5 text-[16px] font-bold text-ink">
                      {fmtTime(primaryRoute.duration)}
                    </span>
                    <span className="text-[11px] text-red-600 font-semibold">
                      {fmtDist(primaryRoute.distance)} · {copy.roadClosed}
                    </span>
                  </button>
                </div>

                {activeRouteTab === "alt" ? (
                  <p className="text-[11.5px] font-medium text-ink dark:text-safe bg-safe-soft dark:bg-safe-soft px-2.5 py-1.5 rounded-lg border border-rule-strong dark:border-rule-strong">
                    {copy.safeActive.replace("{place}", blockadeOnRoute?.placeLabel || copy.floodFallback)}
                  </p>
                ) : (
                  <p className="text-[11.5px] font-medium text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/30 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800/40">
                    {copy.warning}
                  </p>
                )}
              </div>
            )}

            {/* ETA + distance */}
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold leading-none text-ink sm:text-[26px]">
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
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span className="truncate">{copy.yourLocation}</span>
                <span className="shrink-0">→</span>
                <span className="truncate font-semibold text-slate-700">{dest?.name}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-[13px] text-slate-500 dark:text-slate-400">{copy.selectDest}</p>
        )}

        <button
          onClick={clearRoute}
          className="w-full min-h-[38px] cursor-pointer rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          {copy.endRoute}
        </button>
      </div>
    </div>
  );
}
