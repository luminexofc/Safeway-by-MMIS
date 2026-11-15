import { useEffect, useId, useRef, useState, useMemo } from "react";
import { LocateFixed, TriangleAlert, ShieldCheck } from "lucide-react";
import { BeuiInput } from "../components/beui/beui";
import MapView from "../components/MapView";
import PageHeader from "../components/PageHeader";
import {
  geocode,
  fetchRoutes,
  useGeolocation,
  emptyPointMessage,
  fetchRouteWithDetour,
  parseReportSegment,
} from "../services/geo";
import { fetchFeed } from "../lib/appwrite";
import { useLang } from "../lib/lang";
import { SuggestionListSkeleton } from "../components/Skeletons";
import "./navigate.css";

const DICT = {
  en: {
    title: "Compare routes",
    subtitle: "Enter where you're going to compare driving time and distance across the road network.",
    fastest: "Fastest",
    shortest: "Shortest",
    sortLabel: "Sort routes",
    searchPanel: "Route search",
    routeOptions: "Route options",
    from: "From",
    to: "Destination",
    fromPh: "Your address or current location",
    toPh: "Anywhere in Bangladesh",
    myLocation: "Your current location",
    useMyLoc: "Use my location",
    locating: "Locating…",
    findRoute: "Find route",
    finding: "Finding route…",
    loading: "Checking road network and active water blockades…",
    chipTo: "Route to ",
    routesFound: (n) => `${n} route${n > 1 ? "s" : ""} found on the road network`,
    selected: "Selected",
    min: "min",
    km: "km",
    fastestOption: "Fastest route",
    shortestOption: "Shortest route",
    safeAlt: "Safe Alternative",
    safeAltTag: "Safe bypass",
    blockedRoad: "Direct (Road Closed)",
    blockedTag: "Water blockade",
    bypassesNote: (name) => `🛡️ Safe alternative: bypasses water blockade at ${name}.`,
    blockedNote: (name) => `⚠️ Warning: Direct route crosses a verified water blockade at ${name}. Use the Safe Alternative.`,
    altN: (n) => `Other road option ${n}`,
    estimateTitle: "About these estimates",
    estimateBody: "Routes actively account for verified water blockades. When a road is closed by flood water, safe alternative routes are automatically calculated.",
    emptyTitle: "Type a destination to see its route on the map",
    emptyBody: "Addresses are geocoded across Bangladesh. Your origin can be your current GPS position.",
    suggestions: "Address suggestions",
    notFound: (q) => `Could not find "${q}". Try a nearby landmark.`,
    noRoute: "No drivable route between those two points. Try a nearby landmark or a different starting point.",
    routeFailed: "The route lookup failed. Check your connection and try again.",
    generic: "Something went wrong. Try again.",
    emptyStart: "Enter a starting point.",
    emptyDest: "Enter a destination.",
    geoDenied: "Location permission is off. Type your starting point instead.",
    geoUnavailable: "Your location isn't available right now. Type your starting point instead.",
    tilesFailed: "Map tiles are not loading. Check your connection.",
    retryMap: "Retry map",
  },
  bn: {
    title: "রুট তুলনা করুন",
    subtitle: "গন্তব্য লিখে সড়ক নেটওয়ার্কে গাড়ির সময় ও দূরত্ব তুলনা করুন।",
    fastest: "দ্রুততম",
    shortest: "সংক্ষিপ্ততম",
    sortLabel: "রুট সাজান",
    searchPanel: "রুট খোঁজা",
    routeOptions: "রুটের বিকল্প",
    from: "শুরু",
    to: "গন্তব্য",
    fromPh: "আপনার ঠিকানা বা বর্তমান অবস্থান",
    toPh: "বাংলাদেশের যেকোনো স্থান",
    myLocation: "আপনার বর্তমান অবস্থান",
    useMyLoc: "আমার অবস্থান ব্যবহার করুন",
    locating: "খোঁজা হচ্ছে…",
    findRoute: "রুট খুঁজুন",
    finding: "রুট খোঁজা হচ্ছে…",
    loading: "সড়ক নেটওয়ার্ক ও লাইভ জলাবদ্ধতার তথ্য পরীক্ষা করা হচ্ছে…",
    chipTo: "গন্তব্য: ",
    routesFound: (n) => `সড়ক নেটওয়ার্কে ${n}টি রুট পাওয়া গেছে`,
    selected: "নির্বাচিত",
    min: "মিনিট",
    km: "কিমি",
    fastestOption: "হিসাব অনুযায়ী দ্রুততম",
    shortestOption: "দূরত্বে সবচেয়ে ছোট",
    safeAlt: "নিরাপদ বিকল্প পথ",
    safeAltTag: "নিরাপদ বিকল্প",
    blockedRoad: "সরাসরি পথ (সড়ক বন্ধ)",
    blockedTag: "জলাবদ্ধতা",
    bypassesNote: (name) => `🛡️ নিরাপদ বিকল্প সক্রিয়: ${name}-এর জলাবদ্ধতা এড়িয়ে চলে।`,
    blockedNote: (name) => `⚠️ সতর্কতা: এই সড়কটি ${name}-এ জলাবদ্ধতার কারণে বন্ধ। নিরাপদ বিকল্প সড়ক ব্যবহার করুন।`,
    altN: (n) => `অন্য সড়কপথ ${n}`,
    estimateTitle: "এই হিসাব সম্পর্কে",
    estimateBody: "রুটগুলো সরাসরি যাচাইকৃত জলাবদ্ধতার তথ্য বিশ্লেষণ করে। সড়ক বন্ধ থাকলে নিরাপদ বিকল্প পথ স্বয়ংক্রিয়ভাবে প্রদান করা হয়।",
    emptyTitle: "মানচিত্রে রুট দেখতে গন্তব্য লিখুন",
    emptyBody: "বাংলাদেশজুড়ে ঠিকানা খোঁজা যায়। আপনার শুরুর স্থান হতে পারে আপনার বর্তমান জিপিএস অবস্থান।",
    suggestions: "ঠিকানার পরামর্শ",
    notFound: (q) => `"${q}" খুঁজে পাওয়া যায়নি। কাছাকাছি কোনো পরিচিত স্থান লিখে দেখুন।`,
    noRoute: "এই দুই স্থানের মধ্যে গাড়ির রুট পাওয়া যায়নি। কাছাকাছি কোনো পরিচিত স্থান বা অন্য শুরুর স্থান চেষ্টা করুন।",
    routeFailed: "রুট খোঁজা ব্যর্থ হয়েছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।",
    generic: "কিছু ভুল হয়েছে। আবার চেষ্টা করুন।",
    emptyStart: "শুরুর স্থান লিখুন।",
    emptyDest: "গন্তব্য লিখুন।",
    geoDenied: "অবস্থানের অনুমতি বন্ধ আছে। শুরুর স্থান নিজে লিখুন।",
    geoUnavailable: "আপনার অবস্থান এখন পাওয়া যাচ্ছে না। শুরুর স্থান নিজে লিখুন।",
    tilesFailed: "মানচিত্রের টাইল লোড হচ্ছে না। সংযোগ দেখুন।",
    retryMap: "মানচিত্র আবার লোড করুন",
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
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState("route-0");
  const [fitSignal, setFitSignal] = useState(0);
  const [tab, setTab] = useState("fastest");

  // Verified reports & water blockades
  const [feed, setFeed] = useState([]);
  const [segmentGeoms, setSegmentGeoms] = useState({});

  useEffect(() => {
    fetchFeed()
      .then(setFeed)
      .catch(() => {});
  }, []);

  const blockades = useMemo(() => {
    return feed
      .filter((r) => r.status === "verified" || r.depth === "road_closed")
      .map((r) => {
        const segment = parseReportSegment(r);
        const placeSplit = r.placeLabel ? r.placeLabel.split(/\s+to\s+/i) : null;
        const fromLabel = placeSplit && placeSplit.length === 2 ? placeSplit[0].trim() : r.placeLabel;
        const toLabel = placeSplit && placeSplit.length === 2 ? placeSplit[1].trim() : null;
        return {
          id: r.$id,
          lat: r.lat,
          lng: r.lng,
          depth: r.depth,
          placeLabel: r.placeLabel,
          fromLabel,
          toLabel,
          segment,
          note: r.note,
        };
      });
  }, [feed]);

  // Load geometry for 2-point water blockades
  useEffect(() => {
    blockades.forEach((b) => {
      if (!b.segment || segmentGeoms[b.id]) return;
      const [start, end] = [b.segment.start, b.segment.end];
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
            const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            const dist = data.routes[0].distance;
            setSegmentGeoms((prev) => ({ ...prev, [b.id]: { coords, distance: dist } }));
          } else {
            setSegmentGeoms((prev) => ({ ...prev, [b.id]: { coords: [start, end], distance: null } }));
          }
        })
        .catch(() => {
          setSegmentGeoms((prev) => ({ ...prev, [b.id]: { coords: [start, end], distance: null } }));
        });
    });
  }, [blockades, segmentGeoms]);

  const geo = useGeolocation(false);
  const boxRef = useRef(null);
  const fromFieldRef = useRef(null);
  const toFieldRef = useRef(null);
  const routeRefs = useRef([]);
  const uid = useId();
  const fromListId = `${uid}-from-suggestions`;
  const toListId = `${uid}-to-suggestions`;

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

  const describeFailure = (err) => {
    const message = String(err?.message || "");
    if (/no route/i.test(message)) return t.noRoute;
    if (/routing failed|search failed|lookup failed|failed to fetch|network/i.test(message)) return t.routeFailed;
    return message || t.generic;
  };

  const check = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    setSuggestFor(null);
    try {
      const origin = await resolvePoint(from, fromCoord, "starting point");
      const dest = await resolvePoint(to, toCoord, "destination");
      setFromCoord(origin);
      setToCoord(dest);

      // Routing with water blockade detection and alternative detour path
      const res = await fetchRouteWithDetour("drive", origin, dest, blockades, segmentGeoms);
      const routeList = [];

      if (res.alt) {
        // Alternative safe route avoiding the water blockade
        routeList.push({
          id: "route-alt",
          coords: res.alt.coords,
          distanceKm: res.alt.distanceKm,
          timeMin: res.alt.timeMin,
          isSafeAlt: true,
          bypasses: res.hitBlockade,
        });
        // Direct blocked route
        routeList.push({
          id: "route-direct",
          coords: res.primary.coords,
          distanceKm: res.primary.distanceKm,
          timeMin: res.primary.timeMin,
          isBlocked: true,
          hitBlockade: res.hitBlockade,
        });
      } else if (res.hitBlockade) {
        routeList.push({
          id: "route-direct",
          coords: res.primary.coords,
          distanceKm: res.primary.distanceKm,
          timeMin: res.primary.timeMin,
          isBlocked: true,
          hitBlockade: res.hitBlockade,
        });
      } else {
        // Direct route is safe; get standard OSRM alternatives if available
        try {
          // This screen routes vehicles; pass the mode explicitly so the
          // correct OSRM profile is used instead of relying on a default.
          const live = await fetchRoutes(origin, dest, { mode: "drive" });
          routeList.push(...live);
        } catch {
          routeList.push({
            id: "route-0",
            coords: res.primary.coords,
            distanceKm: res.primary.distanceKm,
            timeMin: res.primary.timeMin,
          });
        }
      }

      setRoutes(routeList);
      setSelected(routeList[0].id);
      setFitSignal((s) => s + 1);
    } catch (err) {
      setError(describeFailure(err));
      setRoutes([]);
    } finally {
      setChecking(false);
    }
  };

  const ordered = [...routes].sort((a, b) => {
    // Keep safe alternatives prioritized at top
    if (a.isSafeAlt && !b.isSafeAlt) return -1;
    if (!a.isSafeAlt && b.isSafeAlt) return 1;
    return tab === "shortest" ? a.distanceKm - b.distanceKm : a.timeMin - b.timeMin;
  });

  const active = ordered.find((r) => r.id === selected) || ordered[0] || null;

  // Build map lines:
  const lines = [];

  // 1. Add route lines
  ordered.forEach((r) => {
    const isSel = r.id === active?.id;
    if (r.isBlocked) {
      lines.push({
        id: r.id,
        positions: r.coords,
        color: "var(--color-danger)",
        weight: isSel ? 7 : 4,
        dashed: true,
      });
    } else if (r.isSafeAlt) {
      lines.push({
        id: r.id,
        positions: r.coords,
        color: "var(--color-safe)",
        weight: isSel ? 7 : 5,
      });
    } else {
      lines.push({
        id: r.id,
        positions: r.coords,
        color: isSel ? "var(--color-accent)" : "var(--color-rule-strong)",
        weight: isSel ? 7 : 5,
      });
    }
  });

  // 2. Add verified water blockade road segments on the map
  blockades.forEach((b) => {
    const geom = segmentGeoms[b.id];
    const positions = geom?.coords || (b.segment ? [b.segment.start, b.segment.end] : null);
    if (positions) {
      lines.push({
        id: `blockade-line-${b.id}`,
        positions,
        color: "var(--color-danger)",
        weight: 6,
        dashed: true,
      });
    }
  });

  // Build map markers
  const markers = [];
  if (fromCoord || geo.pos) {
    const p = fromCoord || geo.pos;
    markers.push({ id: "origin", pos: [p.lat, p.lng], tone: "user" });
  }
  if (toCoord) markers.push({ id: "dest", pos: [toCoord.lat, toCoord.lng], tone: "info" });

  // Add blockade markers (endpoints of water blockades)
  blockades.forEach((b) => {
    if (b.segment) {
      markers.push({ id: `blockade-start-${b.id}`, pos: b.segment.start, tone: "danger" });
      markers.push({ id: `blockade-end-${b.id}`, pos: b.segment.end, tone: "danger" });
    } else {
      markers.push({ id: `blockade-pt-${b.id}`, pos: [b.lat, b.lng], tone: "danger" });
    }
  });

  const fromOpen = suggestFor === "from" && (suggestions.length > 0 || suggesting);
  const toOpen = suggestFor === "to" && (suggestions.length > 0 || suggesting);

  const focusFirstSuggestion = (fieldRef) => {
    fieldRef.current?.querySelector(".nav-suggest button")?.focus();
  };

  const onFieldKeyDown = (e, fieldRef, open) => {
    if (e.key === "Escape") {
      setSuggestFor(null);
      return;
    }
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      focusFirstSuggestion(fieldRef);
    }
  };

  const onRouteKey = (e, index) => {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    let next = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = Math.min(index + 1, ordered.length - 1);
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = Math.max(index - 1, 0);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = ordered.length - 1;
    setSelected(ordered[next].id);
    routeRefs.current[next]?.focus();
  };

  const routeLabel = (r, index) => {
    if (r.isSafeAlt) return t.safeAlt;
    if (r.isBlocked) return t.blockedRoad;
    if (index === 0) return tab === "shortest" ? t.shortestOption : t.fastestOption;
    return t.altN(index);
  };

  return (
    <div className="navigate" lang={lang}>
      <PageHeader title={t.title} description={t.subtitle} />

      <div className="nav-workspace">
        <section className="nav-panel" aria-label={t.searchPanel}>
          <form onSubmit={check} className="nav-form" ref={boxRef} noValidate>
            <div className="nav-field" ref={fromFieldRef}>
              <BeuiInput
                label={t.from}
                value={from}
                onChange={(e) => { setFrom(e.target.value); setFromCoord(null); setSuggestFor("from"); }}
                onFocus={() => setSuggestFor("from")}
                onKeyDown={(e) => onFieldKeyDown(e, fromFieldRef, fromOpen)}
                placeholder={t.fromPh}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={fromOpen}
                aria-controls={fromOpen ? fromListId : undefined}
              />
              {fromOpen && (
                <SuggestionList
                  id={fromListId}
                  t={t}
                  items={suggestions}
                  loading={suggesting}
                  onPick={(s) => pickSuggestion("from", s)}
                  onClose={() => setSuggestFor(null)}
                  fieldRef={fromFieldRef}
                  inputLabel={t.from}
                />
              )}
            </div>

            <button type="button" onClick={useMyLocation} className="nav-btn nav-btn-secondary nav-locate">
              <LocateFixed size={16} aria-hidden="true" />
              {geo.status === "locating" ? t.locating : t.useMyLoc}
            </button>

            <div className="nav-field" ref={toFieldRef}>
              <BeuiInput
                label={t.to}
                value={to}
                onChange={(e) => { setTo(e.target.value); setToCoord(null); setSuggestFor("to"); }}
                onFocus={() => setSuggestFor("to")}
                onKeyDown={(e) => onFieldKeyDown(e, toFieldRef, toOpen)}
                placeholder={t.toPh}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={toOpen}
                aria-controls={toOpen ? toListId : undefined}
              />
              {toOpen && (
                <SuggestionList
                  id={toListId}
                  t={t}
                  items={suggestions}
                  loading={suggesting}
                  onPick={(s) => pickSuggestion("to", s)}
                  onClose={() => setSuggestFor(null)}
                  fieldRef={toFieldRef}
                  inputLabel={t.to}
                />
              )}
            </div>

            <button type="submit" className="nav-btn nav-btn-primary nav-btn-block" aria-busy={checking} disabled={checking}>
              {checking ? t.finding : t.findRoute}
            </button>

            {error && (
              <div className="nav-notice" role="alert">
                <TriangleAlert size={18} aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}

            {geo.error && !fromCoord && !error && (
              <div className="nav-notice">
                <TriangleAlert size={18} aria-hidden="true" />
                <p>{geo.status === "denied" ? t.geoDenied : t.geoUnavailable}</p>
              </div>
            )}

            {checking && (
              <div className="nav-loading" role="status">
                <p>{t.loading}</p>
                <div className="nav-loading-bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </form>
        </section>

        <div className="nav-map">
          <div className="nav-map-frame">
            <MapView
              markers={markers}
              lines={lines}
              fitSignal={fitSignal}
              radius={isMyLoc(from) && geo.pos?.accuracy ? { at: [geo.pos.lat, geo.pos.lng], meters: geo.pos.accuracy } : null}
              chip={to ? `${t.chipTo}${to}` : null}
              tileErrorText={t.tilesFailed}
              retryText={t.retryMap}
            />
          </div>
        </div>

        <section className="nav-results" aria-label={t.routeOptions}>
          {!checking && !active && !error && (
            <div className="nav-guidance">
              <h2>{t.emptyTitle}</h2>
              <p>{t.emptyBody}</p>
            </div>
          )}

          {!checking && active && (
            <>
              <div className="nav-results-head">
                <p className="nav-count">{t.routesFound(ordered.length)}</p>
                {ordered.length > 1 && (
                  <div className="nav-sort" role="group" aria-label={t.sortLabel}>
                    <button type="button" aria-pressed={tab === "fastest"} onClick={() => setTab("fastest")}>{t.fastest}</button>
                    <button type="button" aria-pressed={tab === "shortest"} onClick={() => setTab("shortest")}>{t.shortest}</button>
                  </div>
                )}
              </div>

              <dl className="nav-endpoints">
                <div>
                  <dt>{t.from}</dt>
                  <dd>{from}</dd>
                </div>
                <div>
                  <dt>{t.to}</dt>
                  <dd>{to}</dd>
                </div>
              </dl>

              <div className="nav-cards" role="radiogroup" aria-label={t.routeOptions}>
                {ordered.map((r, i) => {
                  const isSel = r.id === active.id;
                  const label = routeLabel(r, i);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={isSel}
                      tabIndex={isSel ? 0 : -1}
                      ref={(el) => { routeRefs.current[i] = el; }}
                      onClick={() => setSelected(r.id)}
                      onKeyDown={(e) => onRouteKey(e, i)}
                      className={`nav-route ${r.isSafeAlt ? "nav-route-safe" : r.isBlocked ? "nav-route-blocked" : ""}`}
                    >
                      <span className="nav-route-head">
                        <span className="nav-route-title flex items-center gap-1.5">
                          {r.isSafeAlt && <ShieldCheck size={16} className="text-safe dark:text-safe" aria-hidden="true" />}
                          {r.isBlocked && <TriangleAlert size={16} className="text-red-500" aria-hidden="true" />}
                          {label}
                        </span>
                        {r.isSafeAlt && <span className="nav-tag nav-tag-safe">{t.safeAltTag}</span>}
                        {r.isBlocked && <span className="nav-tag nav-tag-danger">{t.blockedTag}</span>}
                        {isSel && !r.isSafeAlt && !r.isBlocked && <span className="nav-tag">{t.selected}</span>}
                      </span>
                      <span className="nav-route-metrics">
                        <strong>{r.timeMin}</strong> {t.min}
                        <span className="nav-sep" aria-hidden="true">·</span>
                        <strong>{r.distanceKm.toFixed(1)}</strong> {t.km}
                      </span>
                      {r.isSafeAlt && (
                        <span className="nav-route-safe-note">
                          {t.bypassesNote(r.bypasses?.placeLabel || r.bypasses?.fromLabel || "the waterlogged road")}
                        </span>
                      )}
                      {r.isBlocked && (
                        <span className="nav-route-blocked-note">
                          {t.blockedNote(r.hitBlockade?.placeLabel || r.hitBlockade?.fromLabel || "this road")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="nav-note">
                <strong>{t.estimateTitle}</strong>
                {t.estimateBody}
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function SuggestionList({ id, t, items, loading, onPick, onClose, fieldRef, inputLabel }) {
  const btnRefs = useRef([]);

  const onKey = (e, i) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      btnRefs.current[Math.min(i + 1, items.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i === 0) fieldRef.current?.querySelector("input")?.focus();
      else btnRefs.current[i - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      fieldRef.current?.querySelector("input")?.focus();
    } else if (e.key === "Tab") {
      onClose();
    }
  };

  return (
    <div className="nav-suggest" id={id} role="group" aria-label={`${t.suggestions} — ${inputLabel}`}>
      {loading && items.length === 0 && <SuggestionListSkeleton />}
      {items.length > 0 && (
        <ul>
          {items.map((s, i) => (
            <li key={`${s.lat}-${s.lng}-${i}`}>
              <button
                type="button"
                ref={(el) => { btnRefs.current[i] = el; }}
                onKeyDown={(e) => onKey(e, i)}
                onClick={() => onPick(s)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
