import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { LocateFixed, TriangleAlert } from "lucide-react";
import BeuiButton from "../components/beui/BeuiButton";
import BeuiBadge from "../components/beui/BeuiBadge";
import { BeuiCard, BeuiInput } from "../components/beui/beui";
import { BeuiTabs, BeuiTabsList, BeuiTab } from "../components/beui/BeuiTabs";
import MapView from "../components/MapView";
import { geocode, fetchRoutes, useGeolocation, emptyPointMessage } from "../services/geo";
import { useLang } from "../lib/lang";

const DICT = {
  en: {
    title: "Find a safe route",
    subtitle: "Address search with road geometry drawn per search. Safety colors arrive with the API connection.",
    fastest: "Fastest",
    shortest: "Shortest",
    from: "From",
    to: "Destination",
    fromPh: "Your address or current location",
    toPh: "Anywhere in Bangladesh",
    myLocation: "Your current location",
    useMyLoc: "Use my location",
    locating: "Locating…",
    findRoute: "Find route",
    finding: "Finding route…",
    loading: "Geocoding addresses & fetching the road network…",
    chipTo: "Route to ",
    chipDefault: "Your route",
    safetyPending: "Safety check pending",
    geomPre: "Road geometry is fetched per search. Waterlogging scoring lights up once",
    geomPost: "is connected.",
    routesFound: (n) => `${n} route${n > 1 ? "s" : ""} found on the road network`,
    selected: "Selected",
    alternative: "Alternative",
    min: "min",
    km: "km",
    recommended: "Recommended route",
    alternate: "Alternate route",
    routeDesc: "Driving geometry for the addresses above. Safety check pending API connection. Tap to preview.",
    howTitle: "How safety scoring will attach",
    howBody: "Each segment gets a safety multiplier (clear, unverified, reported, waterlogged) and the cheapest safe path wins. The green, yellow, and red overlay draws on this exact geometry once connected.",
    emptyTitle: "Type a destination to see its route on the map",
    emptyBody: "Addresses are geocoded across Bangladesh. Your origin can be your current GPS position.",
    suggestions: "Address suggestions",
    searching: "Searching addresses…",
    notFound: (q) => `Could not find "${q}". Try a nearby landmark.`,
    generic: "Something went wrong. Try again.",
  },
  bn: {
    title: "নিরাপদ রুট খুঁজুন",
    subtitle: "ঠিকানা দিয়ে খুঁজুন, প্রতিটি অনুসন্ধানে সড়কের রুট আঁকা হয়। API সংযোগ হলে নিরাপত্তার রঙ যোগ হবে।",
    fastest: "দ্রুততম",
    shortest: "সংক্ষিপ্ততম",
    from: "শুরু",
    to: "গন্তব্য",
    fromPh: "আপনার ঠিকানা বা বর্তমান অবস্থান",
    toPh: "বাংলাদেশের যেকোনো স্থান",
    myLocation: "আপনার বর্তমান অবস্থান",
    useMyLoc: "আমার অবস্থান ব্যবহার করুন",
    locating: "খোঁজা হচ্ছে…",
    findRoute: "রুট খুঁজুন",
    finding: "রুট খোঁজা হচ্ছে…",
    loading: "ঠিকানা খুঁজে সড়ক নেটওয়ার্ক আনা হচ্ছে…",
    chipTo: "গন্তব্য: ",
    chipDefault: "আপনার রুট",
    safetyPending: "নিরাপত্তা যাচাই বাকি",
    geomPre: "প্রতিটি অনুসন্ধানে সড়কের রুট আনা হয়। জলাবদ্ধতার স্কোর চালু হবে যখন",
    geomPost: "সংযুক্ত হবে।",
    routesFound: (n) => `সড়ক নেটওয়ার্কে ${n}টি রুট পাওয়া গেছে`,
    selected: "নির্বাচিত",
    alternative: "বিকল্প",
    min: "মিনিট",
    km: "কিমি",
    recommended: "প্রস্তাবিত রুট",
    alternate: "বিকল্প রুট",
    routeDesc: "উপরের ঠিকানার জন্য গাড়ি চলাচলের রুট। API সংযোগের অপেক্ষায় নিরাপত্তা যাচাই বাকি। দেখতে ট্যাপ করুন।",
    howTitle: "নিরাপত্তা স্কোর যেভাবে যুক্ত হবে",
    howBody: "প্রতিটি অংশ একটি নিরাপত্তা গুণক পাবে (পরিষ্কার, অযাচাইকৃত, রিপোর্টকৃত, জলাবদ্ধ) এবং সবচেয়ে কম খরচের নিরাপদ পথ বেছে নেওয়া হবে। সংযোগ হলে এই একই রুটের ওপর সবুজ, হলুদ ও লাল স্তর আঁকা হবে।",
    emptyTitle: "মানচিত্রে রুট দেখতে গন্তব্য লিখুন",
    emptyBody: "বাংলাদেশজুড়ে ঠিকানা খোঁজা যায়। আপনার শুরুর স্থান হতে পারে আপনার বর্তমান জিপিএস অবস্থান।",
    suggestions: "ঠিকানার পরামর্শ",
    searching: "ঠিকানা খোঁজা হচ্ছে…",
    notFound: (q) => `"${q}" খুঁজে পাওয়া যায়নি। কাছাকাছি কোনো পরিচিত স্থান লিখে দেখুন।`,
    generic: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।",
    emptyStart: "শুরুর স্থান লিখুন।",
    emptyDest: "গন্তব্য লিখুন।",
  },
};

// The "current location" label exists in both languages; treat either one as the GPS placeholder.
const isMyLoc = (s) => s === DICT.en.myLocation || s === DICT.bn.myLocation;

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setV(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return v;
}

export default function Navigate() {
  const [lang] = useLang();
  const t = DICT[lang] || DICT.en;

  const [from, setFrom] = useState(DICT[lang].myLocation);
  const [to, setTo] = useState("");
  const [fromCoord, setFromCoord] = useState(null);
  const [toCoord, setToCoord] = useState(null);
  const [suggestFor, setSuggestFor] = useState(null); // 'from' | 'to' | null
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [routes, setRoutes] = useState([]); // live OSRM routes
  const [selected, setSelected] = useState("live-0");
  const [fitSignal, setFitSignal] = useState(0);
  const [tab, setTab] = useState("fastest");
  const reduce = useReducedMotion();
  const geo = useGeolocation(false);
  const boxRef = useRef(null);

  const debouncedTo = useDebounced(suggestFor === "to" ? to : "");
  const debouncedFrom = useDebounced(suggestFor === "from" ? from : "");

  // Keep the "current location" placeholder in the active language
  useEffect(() => {
    setFrom((cur) => (isMyLoc(cur) ? DICT[lang].myLocation : cur));
  }, [lang]);

  // Close suggestions on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setSuggestFor(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Live address suggestions (Bangladesh-biased, OpenStreetMap)
  useEffect(() => {
    const q = suggestFor === "to" ? debouncedTo : suggestFor === "from" ? debouncedFrom : "";
    if (!suggestFor || !q.trim() || isMyLoc(q)) {
      setSuggestions([]);
      return;
    }
    let alive = true;
    setSuggesting(true);
    geocode(q)
      .then((r) => { if (alive) setSuggestions(r); })
      .catch(() => { if (alive) setSuggestions([]); })
      .finally(() => { if (alive) setSuggesting(false); });
    return () => { alive = false; };
  }, [debouncedTo, debouncedFrom, suggestFor]);

  // Adopt browser position as the origin when it arrives
  useEffect(() => {
    if (geo.pos && !fromCoord) {
      setFromCoord(geo.pos);
      setFrom(t.myLocation);
    }
  }, [geo.pos, fromCoord, t.myLocation]);

  const pickSuggestion = (which, s) => {
    if (which === "to") {
      setTo(s.label);
      setToCoord({ lat: s.lat, lng: s.lng });
    } else {
      setFrom(s.label);
      setFromCoord({ lat: s.lat, lng: s.lng });
    }
    setSuggestFor(null);
    setSuggestions([]);
  };

  const useMyLocation = () => {
    geo.locate();
    setFrom(t.myLocation);
    setFromCoord(null); // resolved from geo.pos by the effect above
  };

  const emptyMessage = (field) => {
    if (lang === "en") return emptyPointMessage(field);
    return field === "starting point" ? t.emptyStart : t.emptyDest;
  };

  const resolvePoint = async (text, coord, field) => {
    if (coord) return coord;
    const txt = text.trim();
    if (!txt || (field === "starting point" && isMyLoc(txt))) {
      if (field === "starting point" && geo.pos) return geo.pos;
      throw new Error(emptyMessage(field));
    }
    const r = await geocode(txt, 1);
    if (!r.length) throw new Error(t.notFound(txt));
    return { lat: r[0].lat, lng: r[0].lng };
  };

  const check = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      const origin = await resolvePoint(from, fromCoord, "starting point");
      const dest = await resolvePoint(to, toCoord, "destination");
      setFromCoord(origin);
      setToCoord(dest);
      const live = await fetchRoutes(origin, dest);
      setRoutes(live);
      setSelected(live[0].id);
      setFitSignal((s) => s + 1);
    } catch (err) {
      setError(err.message || t.generic);
      setRoutes([]);
    } finally {
      setChecking(false);
    }
  };

  const ordered = [...routes].sort((a, b) =>
    tab === "shortest" ? a.distanceKm - b.distanceKm : a.timeMin - b.timeMin
  );
  const active = ordered.find((r) => r.id === selected) || ordered[0] || null;

  const lines = ordered.map((r) => ({
    id: r.id,
    positions: r.coords,
    color: r.id === active?.id ? "#0f766e" : "#94a3b8",
    weight: r.id === active?.id ? 7 : 5,
  }));
  const markers = [];
  if (fromCoord || geo.pos) {
    const p = fromCoord || geo.pos;
    markers.push({ id: "origin", pos: [p.lat, p.lng], tone: "user" });
  }
  if (toCoord) markers.push({ id: "dest", pos: [toCoord.lat, toCoord.lng], tone: "info" });

  return (
    <div className="space-y-4" lang={lang}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight sm:text-[30px]">{t.title}</h1>
          <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>
        <BeuiTabs value={tab} onValueChange={setTab}>
          <BeuiTabsList>
            <BeuiTab value="fastest">{t.fastest}</BeuiTab>
            <BeuiTab value="shortest">{t.shortest}</BeuiTab>
          </BeuiTabsList>
        </BeuiTabs>
      </div>

      <BeuiCard className="p-5">
        <form onSubmit={check} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" ref={boxRef}>
          <div className="relative">
            <BeuiInput
              label={t.from} value={from}
              onChange={(e) => { setFrom(e.target.value); setFromCoord(null); setSuggestFor("from"); }}
              onFocus={() => setSuggestFor("from")}
              placeholder={t.fromPh}
            />
            <div className="mt-1.5">
              <button type="button" onClick={useMyLocation} className="inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl px-2 text-[13px] font-bold text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-white/5">
                <LocateFixed className="h-4 w-4" />
                {geo.status === "locating" ? t.locating : t.useMyLoc}
              </button>
            </div>
            {suggestFor === "from" && (suggestions.length > 0 || suggesting) && (
              <SuggestionList t={t} items={suggestions} loading={suggesting} onPick={(s) => pickSuggestion("from", s)} />
            )}
          </div>
          <div className="relative">
            <BeuiInput
              label={t.to} value={to}
              onChange={(e) => { setTo(e.target.value); setToCoord(null); setSuggestFor("to"); }}
              onFocus={() => setSuggestFor("to")}
              placeholder={t.toPh}
            />
            {suggestFor === "to" && (suggestions.length > 0 || suggesting) && (
              <SuggestionList t={t} items={suggestions} loading={suggesting} onPick={(s) => pickSuggestion("to", s)} />
            )}
          </div>
          <div className="flex items-end"><BeuiButton type="submit" loading={checking} className="w-full md:w-auto">{checking ? t.finding : t.findRoute}</BeuiButton></div>
        </form>
        {geo.error && !fromCoord && (
          <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">{geo.error}</p>
        )}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4" role="alert">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-[14px] font-semibold text-red-800">{error}</p>
          </div>
        )}
        {checking && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl bg-slate-950 p-4 text-white" role="status">
            <div className="flex items-center gap-3 text-[14px] font-semibold">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-teal-300 border-t-transparent" />
              {t.loading}
            </div>
          </motion.div>
        )}
      </BeuiCard>

      {active && !checking && (
        <div className="grid gap-4 xl:grid-cols-[1.45fr_.95fr]">
          <BeuiCard className="overflow-hidden">
            <div className="h-[420px] sm:h-[520px]">
              <MapView
                markers={markers}
                lines={lines}
                fitSignal={fitSignal}
                radius={isMyLoc(from) && geo.pos?.accuracy ? { at: [geo.pos.lat, geo.pos.lng], meters: geo.pos.accuracy } : null}
                chip={to ? `${t.chipTo}${to.slice(0, 42)}` : t.chipDefault}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-4 dark:border-white/10">
              <BeuiBadge tone="caution">{t.safetyPending}</BeuiBadge>
              <span className="text-[13px] text-slate-500 dark:text-slate-400">{t.geomPre} <span className="font-mono">POST /v1/map/route</span> {t.geomPost}</span>
            </div>
          </BeuiCard>

          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t.routesFound(ordered.length)}</p>
            {ordered.map((r) => {
              const isSel = r.id === active.id;
              return (
                <motion.button key={r.id} onClick={() => setSelected(r.id)} aria-pressed={isSel}
                  whileTap={reduce ? undefined : { scale: 0.985 }}
                  className={`w-full cursor-pointer rounded-2xl border-2 p-4 text-left transition-colors ${isSel ? "border-slate-900 bg-slate-50 dark:border-white dark:bg-white/10" : "border-slate-200 bg-white hover:border-slate-400 dark:border-white/10 dark:bg-transparent dark:hover:border-white/30"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <BeuiBadge tone={isSel ? "info" : "neutral"}>{isSel ? t.selected : t.alternative}</BeuiBadge>
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{r.timeMin} {t.min} · {r.distanceKm.toFixed(1)} {t.km}</span>
                  </div>
                  <p className="mt-2 text-[16px] font-bold tracking-tight">
                    {r.id === ordered[0].id ? t.recommended : t.alternate}
                  </p>
                  <p className="text-[13.5px] text-slate-600 dark:text-slate-400">{t.routeDesc}</p>
                </motion.button>
              );
            })}
            <BeuiCard className="bg-slate-950 !border-slate-800 p-4 text-white">
              <p className="text-[13.5px] font-bold text-teal-300">{t.howTitle}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{t.howBody}</p>
            </BeuiCard>
          </div>
        </div>
      )}

      {!active && !checking && !error && (
        <BeuiCard className="p-6 text-center">
          <p className="text-[15px] font-bold">{t.emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-[52ch] text-[14px] text-slate-500 dark:text-slate-400">{t.emptyBody}</p>
        </BeuiCard>
      )}
    </div>
  );
}

function SuggestionList({ t, items, loading, onPick }) {
  return (
    <div className="absolute inset-x-0 top-full z-[700] mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop dark:border-white/10 dark:bg-slate-900" role="listbox" aria-label={t.suggestions}>
      {loading && items.length === 0 && <p className="px-4 py-3 text-[13.5px] text-slate-500 dark:text-slate-400">{t.searching}</p>}
      {items.map((s, i) => (
        <button key={`${s.lat}-${s.lng}-${i}`} type="button" role="option" aria-selected="false"
          onClick={() => onPick(s)}
          className="block w-full cursor-pointer px-4 py-2.5 text-left text-[13.5px] hover:bg-slate-50 dark:hover:bg-white/5">
          <span className="font-semibold text-slate-800 dark:text-slate-100">{s.label}</span>
        </button>
      ))}
    </div>
  );
}
