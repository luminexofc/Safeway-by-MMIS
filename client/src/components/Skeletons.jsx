import {
  ShimmeringSkeletonWrapper,
  SkeletonBox,
  SkeletonCircle,
  SkeletonLine,
} from "./wensity/shimmering-skeleton-wrapper.tsx";
import { useLang } from "../lib/lang";

// Screen-reader announcements while data loads. Both the visible sr-only text
// and the aria-label come from here so a language switch reaches them too.
const COPY = {
  en: {
    session: "Loading your Safeway session",
    sessionShort: "Loading Safeway…",
    reports: "Loading your reports",
    reportsShort: "Loading your reports…",
    details: "Loading your details",
    detailsShort: "Loading your details…",
    alerts: "Loading alert preferences",
    alertsShort: "Loading alert preferences…",
    suggestions: "Searching address suggestions",
    suggestionsShort: "Searching addresses…",
    route: "Loading route data",
    routeShort: "Loading route data…",
    live: "Loading live reports",
    liveShort: "Loading live reports…",
  },
  bn: {
    session: "আপনার সেফওয়ে সেশন লোড হচ্ছে",
    sessionShort: "সেফওয়ে লোড হচ্ছে…",
    reports: "আপনার রিপোর্ট লোড হচ্ছে",
    reportsShort: "আপনার রিপোর্ট লোড হচ্ছে…",
    details: "আপনার তথ্য লোড হচ্ছে",
    detailsShort: "আপনার তথ্য লোড হচ্ছে…",
    alerts: "সতর্কতার পছন্দ লোড হচ্ছে",
    alertsShort: "সতর্কতার পছন্দ লোড হচ্ছে…",
    suggestions: "ঠিকানার পরামর্শ খোঁজা হচ্ছে",
    suggestionsShort: "ঠিকানা খোঁজা হচ্ছে…",
    route: "রুটের তথ্য লোড হচ্ছে",
    routeShort: "রুটের তথ্য লোড হচ্ছে…",
    live: "লাইভ রিপোর্ট লোড হচ্ছে",
    liveShort: "লাইভ রিপোর্ট লোড হচ্ছে…",
  },
};

const useCopy = () => {
  const [lang] = useLang();
  return COPY[lang] || COPY.en;
};

export function SessionLoadingSkeleton() {
  const copy = useCopy();
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5" role="status" aria-label={copy.session}>
      <ShimmeringSkeletonWrapper className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <SkeletonBox width={42} height={42} radius={13} />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="42%" height={13} />
            <SkeletonLine width="68%" height={10} />
          </div>
        </div>
        <div className="mt-7 space-y-3">
          <SkeletonLine width="78%" height={18} />
          <SkeletonLine width="100%" height={11} />
          <SkeletonLine width="88%" height={11} />
        </div>
        <SkeletonBox className="mt-6" width="100%" height={46} radius={12} />
      </ShimmeringSkeletonWrapper>
      <span className="sr-only">{copy.sessionShort}</span>
    </main>
  );
}

export function ReportRowsSkeleton({ count = 4 }) {
  const copy = useCopy();
  return (
    <ShimmeringSkeletonWrapper className="myr-list" role="status" aria-label={copy.reports}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="myr-row myr-row--skeleton" aria-hidden="true">
          <div className="myr-row-main">
            <SkeletonLine width={`${46 + (index % 3) * 12}%`} height={14} />
            <SkeletonLine width={`${72 - (index % 2) * 10}%`} height={11} />
          </div>
          <SkeletonBox width={44} height={44} radius={8} />
        </div>
      ))}
      <span className="sr-only">{copy.reportsShort}</span>
    </ShimmeringSkeletonWrapper>
  );
}

export function ProfileCardSkeleton() {
  const copy = useCopy();
  return (
    <ShimmeringSkeletonWrapper className="prf-form" role="status" aria-label={copy.details}>
      <div className="prf-grid">
        <div className="prf-field">
          <SkeletonLine width="30%" height={11} />
          <SkeletonBox width="100%" height={46} radius={8} />
        </div>
        <div className="prf-field">
          <SkeletonLine width="20%" height={11} />
          <SkeletonBox width="100%" height={46} radius={8} />
        </div>
      </div>
      <div className="prf-field">
        <SkeletonLine width="12%" height={11} />
        <SkeletonBox width="100%" height={64} radius={8} />
      </div>
      <SkeletonBox width={132} height={46} radius={8} />
      <span className="sr-only">{copy.detailsShort}</span>
    </ShimmeringSkeletonWrapper>
  );
}

export function NotificationSettingsSkeleton() {
  const copy = useCopy();
  return (
    <ShimmeringSkeletonWrapper className="stg-form" role="status" aria-label={copy.alerts}>
      <div className="stg-rows">
        {[0, 1].map((item) => (
          <div key={item} className="stg-row">
            <div className="stg-row-text">
              <SkeletonLine width="42%" height={13} />
              <SkeletonLine width={`${80 - item * 12}%`} height={11} />
            </div>
            <SkeletonBox width={52} height={44} radius={999} />
          </div>
        ))}
      </div>
      <div className="stg-field">
        <SkeletonLine width="30%" height={12} />
        <SkeletonBox width="100%" height={44} radius={8} />
      </div>
      <div className="stg-field">
        <SkeletonLine width="24%" height={12} />
        <SkeletonBox width="100%" height={46} radius={8} />
      </div>
      <SkeletonBox width={122} height={46} radius={8} />
      <span className="sr-only">{copy.alertsShort}</span>
    </ShimmeringSkeletonWrapper>
  );
}

export function SuggestionListSkeleton() {
  const copy = useCopy();
  return (
    <ShimmeringSkeletonWrapper className="space-y-3 p-4" role="status" aria-label={copy.suggestions}>
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-center gap-3">
          <SkeletonCircle size={20} />
          <div className="flex-1 space-y-1.5">
            <SkeletonLine width={`${82 - item * 9}%`} height={12} />
            <SkeletonLine width={`${48 + item * 5}%`} height={9} />
          </div>
        </div>
      ))}
      <span className="sr-only">{copy.suggestionsShort}</span>
    </ShimmeringSkeletonWrapper>
  );
}

export function RouteLoadingSkeleton() {
  const copy = useCopy();
  return (
    <ShimmeringSkeletonWrapper
      className="mt-3 space-y-3 rounded-xl"
      base="rgb(255 255 255 / 0.10)"
      highlight="rgb(255 255 255 / 0.22)"
      role="status"
      aria-label={copy.route}
    >
      <SkeletonLine width="82%" height={10} />
      <SkeletonLine width="100%" height={10} />
      <SkeletonLine width="58%" height={10} />
      <div className="flex gap-2 pt-1"><SkeletonBox width={72} height={24} radius={999} /><SkeletonBox width={92} height={24} radius={999} /></div>
      <span className="sr-only">{copy.routeShort}</span>
    </ShimmeringSkeletonWrapper>
  );
}

export function LiveReportStatusSkeleton() {
  const copy = useCopy();
  return (
    <ShimmeringSkeletonWrapper className="flex items-center gap-1.5" role="status" aria-label={copy.live}>
      <SkeletonCircle size={8} />
      <SkeletonLine width={104} height={9} />
      <span className="sr-only">{copy.liveShort}</span>
    </ShimmeringSkeletonWrapper>
  );
}
