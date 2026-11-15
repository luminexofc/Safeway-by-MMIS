import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import { MapContainer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from "react-leaflet";
import BaseTiles from "../components/BaseTiles";
import { Link, useSearchParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "../../../shared/cn";
import {
  COUNTRY_CENTER,
  geocode,
  useGeolocation,
  reverseGeocodeAddress,
  fetchRouteWithDetour,
  routeHitsBlockade,
  parseReportSegment,
} from "../services/geo";
import { useTheme } from "../../../shared/theme";
import { callFunction, fetchFeed, reportType } from "../lib/appwrite";
import { friendlyError } from "../lib/errors";
import {
  Search, X, LocateFixed, Plus, Minus, Navigation, Footprints,
  TriangleAlert, ShieldCheck, ChevronDown, ChevronUp,
  Camera, Car, Bike, MapPin, Layers, Check,
} from "lucide-react";
import RouteCard from "../components/dashboard/RouteCard";
import { useLang } from "../lib/lang";
import { LiveReportStatusSkeleton, SuggestionListSkeleton } from "../components/Skeletons";

/* ─── constants ─────────────────────────────────────────────────────── */

const DEFAULT_CENTER = COUNTRY_CENTER; // [23.685, 90.3563]

const TYPE_COLORS = {
  safe:     "var(--color-safe)",
  cautious: "var(--color-caution)",
  danger:   "var(--color-danger)",
  blocked:  "var(--color-danger)",
};

// Walk uses Footprints; Bike and Car are standard Lucide glyphs.
const MODE_ICONS = { walk: Footprints, bike: Bike, drive: Car };
const MODE_OSRM = { walk: "routed-foot", bike: "routed-bike", drive: "routed-car" };

// Every user-facing string on this screen, in both languages. Labels for the
// report types and travel modes live here too, so the legend, filter menu and
// route card all switch together.
const COPY = {
  en: {
    types: { safe: "Safe Route", cautious: "Caution", danger: "Danger", blocked: "Blocked Road" },
    modes: { walk: "Walk", bike: "Bike", drive: "Drive" },
    depths: { ankle: "ankle-deep", knee: "knee-deep", waist: "waist-deep", road_closed: "road closed" },
    verified: "verified",
    unverified: "unverified",
    feedFailed: "Live report feed is unavailable right now. Showing your last loaded data.",
    geoUnsupported: "Geolocation is not supported in this browser.",
    geoUnavailable: "Location unavailable. Allow access or search an address instead.",
    routeFailed: "Couldn't find a route.",
    reportFiled: "Report filed. It enters the verification queue.",
    reportFailed: "Could not file the report. Please try again.",
    searchPlaceholder: "Search anywhere in Bangladesh…",
    searchLabel: "Search destinations",
    clear: "Clear",
    tileFailed: "Map tiles are not loading. Check your connection.",
    retry: "Retry",
    filterMarkers: "Filter map markers",
    filterLayers: "Filter layers",
    showOnMap: "Show on map",
    tapToPlace: "Tap the map to drop your report pin",
    pinPlaced: "Pin placed",
    notePlaceholder: "Short note — e.g. ankle-deep, left lane passable",
    cancel: "Cancel",
    submitting: "Submitting…",
    submit: "Submit",
    fullForm: "Use the full verified report form",
    cancelReport: "Cancel report",
    reportFlooding: "Report flooding",
    centerOnMe: "Center on my location",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    safetyLegend: "Safety legend",
    legend: "Legend",
    legendSafe: "Safe",
    legendSafeSub: "×1.0 — Verified clear",
    legendCaution: "Caution",
    legendCautionSub: "×1.5–×5",
    legendAvoid: "Avoid",
    legendAvoidSub: "×∞ — Waterlogged",
    liveReports: (n) => `${n} live report${n === 1 ? "" : "s"} · tap markers for details`,
    fileVerified: "File a verified report",
    fromA: "From (A):",
    toB: "To (B):",
    startLocation: "Start location",
    endLocation: "End location",
    blockedStretch: "Blocked stretch:",
    roadStretch: "Road stretch",
    pointA: "Point A · From",
    pointB: "Point B · To",
    safeAltActive: "Safe alternative route active · bypasses water blockade",
    blockedRoads: (n) => `${n} blocked road${n > 1 ? "s" : ""}`,
    dangerZones: (n) => `${n} danger zone${n > 1 ? "s" : ""}`,
    cautionAreas: (n) => `${n} caution area${n > 1 ? "s" : ""}`,
    within150: "within 150 m",
    noHazards: "No hazards on this route",
  },
  bn: {
    types: { safe: "নিরাপদ রুট", cautious: "সতর্কতা", danger: "বিপদ", blocked: "সড়ক বন্ধ" },
    modes: { walk: "হাঁটা", bike: "সাইকেল", drive: "গাড়ি" },
    depths: { ankle: "গোড়ালি-গভীর", knee: "হাঁটু-গভীর", waist: "কোমর-গভীর", road_closed: "সড়ক বন্ধ" },
    verified: "যাচাইকৃত",
    unverified: "যাচাই হয়নি",
    feedFailed: "লাইভ রিপোর্টের ফিড এখন পাওয়া যাচ্ছে না। সর্বশেষ লোড করা তথ্য দেখানো হচ্ছে।",
    geoUnsupported: "এই ব্রাউজারে অবস্থান শনাক্তকরণ সমর্থিত নয়।",
    geoUnavailable: "অবস্থান পাওয়া যাচ্ছে না। অনুমতি দিন অথবা ঠিকানা খুঁজুন।",
    routeFailed: "রুট পাওয়া যায়নি।",
    reportFiled: "রিপোর্ট জমা হয়েছে। এটি যাচাইয়ের সারিতে যুক্ত হয়েছে।",
    reportFailed: "রিপোর্ট জমা দেওয়া যায়নি। আবার চেষ্টা করুন।",
    searchPlaceholder: "বাংলাদেশের যেকোনো স্থান খুঁজুন…",
    searchLabel: "গন্তব্য খুঁজুন",
    clear: "মুছুন",
    tileFailed: "মানচিত্রের টাইল লোড হচ্ছে না। ইন্টারনেট সংযোগ দেখুন।",
    retry: "আবার চেষ্টা",
    filterMarkers: "মানচিত্রের চিহ্ন ফিল্টার করুন",
    filterLayers: "লেয়ার ফিল্টার",
    showOnMap: "মানচিত্রে দেখান",
    tapToPlace: "রিপোর্ট পিন বসাতে মানচিত্রে চাপ দিন",
    pinPlaced: "পিন বসানো হয়েছে",
    notePlaceholder: "সংক্ষিপ্ত নোট — যেমন হাঁটু-গভীর, বাম লেন চলাচলযোগ্য",
    cancel: "বাতিল",
    submitting: "জমা হচ্ছে…",
    submit: "জমা দিন",
    fullForm: "সম্পূর্ণ যাচাইকৃত রিপোর্ট ফর্ম ব্যবহার করুন",
    cancelReport: "রিপোর্ট বাতিল",
    reportFlooding: "জলাবদ্ধতা জানান",
    centerOnMe: "আমার অবস্থানে যান",
    zoomIn: "জুম ইন",
    zoomOut: "জুম আউট",
    safetyLegend: "নিরাপত্তা নির্দেশিকা",
    legend: "নির্দেশিকা",
    legendSafe: "নিরাপদ",
    legendSafeSub: "×১.০ — যাচাইকৃত পরিষ্কার",
    legendCaution: "সতর্কতা",
    legendCautionSub: "×১.৫–×৫",
    legendAvoid: "এড়িয়ে যান",
    legendAvoidSub: "×∞ — জলাবদ্ধ",
    liveReports: (n) => `${n}টি লাইভ রিপোর্ট · বিস্তারিত দেখতে চিহ্নে চাপ দিন`,
    fileVerified: "যাচাইকৃত রিপোর্ট জমা দিন",
    fromA: "শুরু (A):",
    toB: "শেষ (B):",
    startLocation: "শুরুর স্থান",
    endLocation: "শেষের স্থান",
    blockedStretch: "বন্ধ অংশ:",
    roadStretch: "সড়কের অংশ",
    pointA: "বিন্দু A · শুরু",
    pointB: "বিন্দু B · শেষ",
    safeAltActive: "নিরাপদ বিকল্প রুট সক্রিয় · জলাবদ্ধতা এড়িয়ে চলে",
    blockedRoads: (n) => `${n}টি বন্ধ সড়ক`,
    dangerZones: (n) => `${n}টি বিপদ এলাকা`,
    cautionAreas: (n) => `${n}টি সতর্ক এলাকা`,
    within150: "১৫০ মিটারের মধ্যে",
    noHazards: "এই রুটে কোনো বিপদ নেই",
  },
};

// Hazard-level display config
const HL = {
  safe: {
    Icon: Check,
    iconCls:   "sw-hazard-safe-text",
    bannerCls: "sw-hazard-safe-banner",
    textCls:   "sw-hazard-safe-text",
  },
  cautious: {
    Icon: TriangleAlert,
    iconCls:   "sw-hazard-caution-text",
    bannerCls: "sw-hazard-caution-banner",
    textCls:   "sw-hazard-caution-text",
  },
  danger: {
    Icon: TriangleAlert,
    iconCls:   "sw-hazard-danger-text",
    bannerCls: "sw-hazard-danger-banner",
    textCls:   "sw-hazard-danger-text",
  },
};

/* ─── Leaflet icon factories ─────────────────────────────────────────── */

const makePinIcon = (color) =>
  L.divIcon({
    className: "",
    html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,.38))">
      <svg viewBox="0 0 24 32" width="24" height="32" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.2 0 11.6 0 20 12 32 12 32s12-12 12-20.4C24 5.2 18.6 0 12 0z"
              fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="11.5" r="4.5" fill="white" opacity=".9"/>
      </svg>
    </div>`,
    iconSize:    [24, 32],
    iconAnchor:  [12, 32],
    popupAnchor: [0, -34],
  });

const makeUserDot = () =>
  L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:var(--color-accent);border:3px solid var(--color-surface);box-shadow:0 2px 8px rgba(0,0,0,.22)"></div>`,
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
  });

const makeDraftDot = (color) =>
  L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:.82"></div>`,
    iconSize:   [22, 22],
    iconAnchor: [11, 11],
  });

const userDotIcon = makeUserDot();
const destPinIcon = makePinIcon("var(--color-accent)");
const reportIcons = {
  safe:     makePinIcon("var(--color-safe)"),
  cautious: makePinIcon("var(--color-caution)"),
  danger:   makePinIcon("var(--color-danger)"),
  blocked:  makePinIcon("var(--color-danger)"),
};

const makeSegmentPinIcon = (color, label = "A") =>
  L.divIcon({
    className: "",
    html: `<div style="filter:drop-shadow(0 2px 6px rgba(0,0,0,.38));display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 32" width="26" height="34" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.2 0 11.6 0 20 12 32 12 32s12-12 12-20.4C24 5.2 18.6 0 12 0z"
              fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="11.5" r="5.8" fill="white" opacity="1"/>
        <text x="12" y="15" text-anchor="middle" font-size="9.5" font-weight="800" fill="${color}" font-family="sans-serif">${label}</text>
      </svg>
    </div>`,
    iconSize:    [26, 34],
    iconAnchor:  [13, 34],
    popupAnchor: [0, -36],
  });

/* ─── Map bridge sub-component ───────────────────────────────────────── */

function MapBridge({ mapRef, onZoom, tapping, onTap, initialCenter, initialZoom }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    onZoom(map.getZoom());
    if (initialCenter) {
      map.setView(initialCenter, initialZoom || 15);
    }
    const container = map.getContainer();
    if (typeof ResizeObserver !== "undefined" && container) {
      const ro = new ResizeObserver(() => {
        map.invalidateSize();
      });
      ro.observe(container);
      return () => ro.disconnect();
    }
  }, [map]); // eslint-disable-line
  useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    click:   (e) => tapping && onTap(e.latlng),
  });
  return null;
}

/* ─── Shared card wrapper ────────────────────────────────────────────── */

const CARD = "overflow-hidden rounded-2xl border border-rule bg-white shadow-lg dark:border-white/10 dark:bg-slate-900";

/* ─── Dashboard ──────────────────────────────────────────────────────── */

export default function Dashboard() {
  const { resolved } = useTheme();
  const dark = resolved === "dark";
  const [lang] = useLang();
  const copy = COPY[lang] || COPY.en;

  // Localised views of the type + mode tables. The map, legend, filter menu and
  // route card all read from these, so one language switch updates the lot.
  const TYPES = Object.fromEntries(
    Object.entries(TYPE_COLORS).map(([key, color]) => [key, { label: copy.types[key], color }])
  );
  const MODES = Object.fromEntries(
    Object.keys(MODE_ICONS).map((key) => [
      key,
      { osrm: MODE_OSRM[key], label: copy.modes[key], Icon: MODE_ICONS[key] },
    ])
  );
  // Stable identity so the derived report list only rebuilds when the copy does.
  const depthText = useCallback((d) => copy.depths[d] ?? d, [copy]);

  const mapRef = useRef(null);

  const [userPos,  setUserPos]  = useState(null);
  const [userAcc,  setUserAcc]  = useState(null);
  const [feed,     setFeed]     = useState([]);   // live rows from the reports table
  const [feedBusy, setFeedBusy] = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [show, setShow] = useState({ safe: true, cautious: true, danger: true, blocked: true });

  // Search
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [searching,setSearching]= useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  // Route
  const [dest,    setDest]    = useState(null);
  const [from,    setFrom]    = useState(null);
  const [mode,    setMode]    = useState("drive");
  const [route,   setRoute]   = useState(null);
  const [primaryRoute, setPrimaryRoute] = useState(null);
  const [altRoute, setAltRoute] = useState(null);
  const [activeRouteTab, setActiveRouteTab] = useState("alt");
  const [blockadeOnRoute, setBlockadeOnRoute] = useState(null);
  const [routing, setRouting] = useState(false);

  // Tap-to-report
  const [tapping, setTapping] = useState(false);
  const [draft,   setDraft]   = useState(null);

  // UI panels
  const [toast,      setToast]      = useState("");
  const [legendOpen, setLegendOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setFilterOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [filterOpen]);

  const [searchParams] = useSearchParams();
  const qLat = parseFloat(searchParams.get("lat"));
  const qLng = parseFloat(searchParams.get("lng"));
  const qZoom = parseInt(searchParams.get("zoom"), 10);
  const paramCenter = useMemo(() => {
    return Number.isFinite(qLat) && Number.isFinite(qLng) ? [qLat, qLng] : null;
  }, [qLat, qLng]);
  const paramZoom = Number.isFinite(qZoom) ? qZoom : 15;

  // Optional URL parameters to seed a demo route (e.g. across a water blockade)
  const qFromLat = parseFloat(searchParams.get("fromLat"));
  const qFromLng = parseFloat(searchParams.get("fromLng"));
  const qToLat = parseFloat(searchParams.get("toLat"));
  const qToLng = parseFloat(searchParams.get("toLng"));
  const qToName = searchParams.get("toName") || "Bogura Destination";

  useEffect(() => {
    if (Number.isFinite(qFromLat) && Number.isFinite(qFromLng) && Number.isFinite(qToLat) && Number.isFinite(qToLng)) {
      setFrom([qFromLat, qFromLng]);
      setDest({ name: qToName, ll: [qToLat, qToLng] });
      setQuery(qToName);
    }
  }, [qFromLat, qFromLng, qToLat, qToLng, qToName]);

  const base    = userPos || paramCenter || DEFAULT_CENTER;
  const reports = useMemo(() => feed.map((r) => {
    let segment = null;
    if (r.note) {
      const m = r.note.match(/Segment:\s*\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)\s*->\s*\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/i);
      if (m) {
        segment = {
          start: [parseFloat(m[1]), parseFloat(m[2])],
          end: [parseFloat(m[3]), parseFloat(m[4])],
        };
      }
    }
    const fromMatch = r.note?.match(/From:\s*([^\r\n]+)/i);
    const toMatch = r.note?.match(/To:\s*([^\r\n]+)/i);
    const placeSplit = r.placeLabel ? r.placeLabel.split(/\s+to\s+/i) : null;
    const fromLabel = fromMatch ? fromMatch[1].trim() : (placeSplit && placeSplit.length === 2 ? placeSplit[0].trim() : r.placeLabel);
    const toLabel = toMatch ? toMatch[1].trim() : (placeSplit && placeSplit.length === 2 ? placeSplit[1].trim() : null);

    const cleanNote = r.note
      ? r.note
          .replace(/\[Report Type:[^\]]+\]\s*/gi, "")
          .replace(/Segment:[^\r\n]+\s*/gi, "")
          .replace(/From:[^\r\n]+\s*/gi, "")
          .replace(/To:[^\r\n]+\s*/gi, "")
          .replace(/End location:[^\r\n]+\s*/gi, "")
          .trim()
      : `${depthText(r.depth)} — ${r.status === "verified" ? copy.verified : copy.unverified}`;

    return {
      id: r.$id,
      type: reportType(r),
      lat: r.lat,
      lng: r.lng,
      depth: r.depth,
      status: r.status,
      placeLabel: r.placeLabel,
      fromLabel,
      toLabel,
      segment,
      cleanNote,
      note: cleanNote || r.note,
    };
  }), [feed, copy, depthText]);

  const [segmentGeometries, setSegmentGeometries] = useState({});

  useEffect(() => {
    reports.forEach((r) => {
      if (!r.segment || segmentGeometries[r.id]) return;
      const [start, end] = [r.segment.start, r.segment.end];
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
            const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            const dist = data.routes[0].distance;
            setSegmentGeometries((prev) => ({ ...prev, [r.id]: { coords, distance: dist } }));
          } else {
            setSegmentGeometries((prev) => ({ ...prev, [r.id]: { coords: [start, end], distance: null } }));
          }
        })
        .catch(() => {
          setSegmentGeometries((prev) => ({ ...prev, [r.id]: { coords: [start, end], distance: null } }));
        });
    });
  }, [reports, segmentGeometries]);

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3600);
  }, []);

  const reloadFeed = useCallback(() => {
    setFeedBusy(true);
    return fetchFeed()
      .then(setFeed)
      .catch((err) => {
        console.error("[dashboard] feed failed:", err?.code ?? err?.message ?? err);
        notify(friendlyError(err, copy.feedFailed, lang));
      })
      .finally(() => setFeedBusy(false));
  }, [notify, copy.feedFailed, lang]);

  useEffect(() => { reloadFeed(); }, [reloadFeed]);

  /* ── Geolocation ──────────────────────────────────────────────────── */

  // One implementation, shared with the other screens (see services/geo).
  const geo = useGeolocation(false);

  useEffect(() => {
    if (!geo.pos) return;
    setUserPos([geo.pos.lat, geo.pos.lng]);
    setUserAcc(geo.pos.accuracy);
    mapRef.current?.flyTo([geo.pos.lat, geo.pos.lng], 17, { duration: 1.2 });
  }, [geo.pos]);

  useEffect(() => {
    if (geo.status === "unsupported") return notify(copy.geoUnsupported);
    if (geo.status === "error" || geo.status === "denied") {
      notify(copy.geoUnavailable);
    }
  }, [geo.status, notify, copy.geoUnsupported, copy.geoUnavailable]);

  // Recenter immediately on the known fix, then ask for a fresh one: pressing
  // Locate twice must still move the map, and a new reading may be identical.
  const locate = useCallback(() => {
    if (geo.pos) mapRef.current?.flyTo([geo.pos.lat, geo.pos.lng], 17, { duration: 1.2 });
    geo.locate();
  }, [geo]);

  /* ── Debounced geocode (Nominatim, Bangladesh-biased) ─────────────── */

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setDropOpen(false); return; }
    const ctrl  = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        // One normalised shape for every geocode caller: {lat, lng, label}.
        const data = await geocode(q, 6);
        if (ctrl.signal.aborted) return;
        setResults(data);
        setDropOpen(data.length > 0);
      } catch (e) {
        if (e.name !== "AbortError") setResults([]);
      }
      setSearching(false);
    }, 400);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  const pickResult = (r) => {
    const lat = Number(r?.lat);
    const lng = Number(r?.lng);
    // Never move the map to a half-parsed coordinate.
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const center = mapRef.current?.getCenter();
    setFrom(userPos || (center ? [center.lat, center.lng] : DEFAULT_CENTER));
    const name = (r.label || r.full || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
      .split(",")
      .slice(0, 2)
      .join(",")
      .trim();
    setDest({ name, ll: [lat, lng] });
    setQuery(name);
    setResults([]);
    setDropOpen(false);
    mapRef.current?.flyTo([lat, lng], 14, { duration: 1.2 });
  };

  const clearRoute = () => {
    setDest(null);
    setRoute(null);
    setPrimaryRoute(null);
    setAltRoute(null);
    setActiveRouteTab("alt");
    setBlockadeOnRoute(null);
    setQuery("");
    setResults([]);
    setDropOpen(false);
  };

  /* ── OSRM routing with intelligent water blockade avoidance ─────────── */

  useEffect(() => {
    if (!dest || !from) return;
    const ctrl = new AbortController();
    setRouting(true);
    const activeBlockades = reports.filter((r) => r.type === "blocked" || r.depth === "road_closed");
    fetchRouteWithDetour(mode, from, dest.ll, activeBlockades, segmentGeometries, ctrl.signal)
      .then((res) => {
        setPrimaryRoute(res.primary);
        setAltRoute(res.alt);
        setBlockadeOnRoute(res.hitBlockade);

        if (res.alt) {
          setActiveRouteTab("alt");
          setRoute(res.alt);
          const allPoints = [...res.primary.coords, ...res.alt.coords];
          mapRef.current?.fitBounds(L.latLngBounds(allPoints), {
            paddingTopLeft:     [340, 24],
            paddingBottomRight: [24, 100],
          });
        } else {
          setActiveRouteTab("direct");
          setRoute(res.primary);
          mapRef.current?.fitBounds(L.latLngBounds(res.primary.coords), {
            paddingTopLeft:     [340, 24],
            paddingBottomRight: [24, 100],
          });
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setRoute(null);
          setPrimaryRoute(null);
          setAltRoute(null);
          setBlockadeOnRoute(null);
          notify(copy.routeFailed);
        }
      })
      .finally(() => setRouting(false));
    return () => ctrl.abort();
  }, [dest, from, mode, reports, segmentGeometries]); // eslint-disable-line

  /* ── Hazard proximity ─────────────────────────────────────────────── */

  const nearby = useMemo(() => {
    if (!route) return null;
    const pts = route.coords.filter((_, i) => i % 3 === 0).map((c) => L.latLng(c));
    const out = { cautious: 0, danger: 0, blocked: 0 };
    reports.forEach((r) => {
      if (!(r.type in out)) return;
      const geomCoords = segmentGeometries[r.id]?.coords;
      const testPoints = geomCoords && geomCoords.length > 0
        ? geomCoords.filter((_, i) => i % 2 === 0).map((c) => L.latLng(c))
        : [
            L.latLng(r.lat, r.lng),
            ...(r.segment ? [L.latLng(r.segment.end[0], r.segment.end[1])] : []),
          ];
      if (pts.some((q) => testPoints.some((tp) => q.distanceTo(tp) < 150))) {
        out[r.type]++;
      }
    });
    return out;
  }, [route, reports, segmentGeometries]);

  const hazardLevel = nearby
    ? (nearby.blocked || nearby.danger ? "danger" : nearby.cautious ? "cautious" : "safe")
    : "safe";

  const hazardText = nearby ? (() => {
    if (activeRouteTab === "alt" && altRoute) {
      return copy.safeAltActive;
    }
    const parts = [];
    if (nearby.blocked)  parts.push(copy.blockedRoads(nearby.blocked));
    if (nearby.danger)   parts.push(copy.dangerZones(nearby.danger));
    if (nearby.cautious) parts.push(copy.cautionAreas(nearby.cautious));
    return parts.length ? `${parts.join(", ")} ${copy.within150}` : copy.noHazards;
  })() : "";

  /* ── Report actions ───────────────────────────────────────────────── */

  const startReport  = () => { setTapping(true); setDraft(null); };
  const saveReport   = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      // Quick report carries no depth input; map the pin type onto one.
      const depth = draft.type === "blocked" ? "road_closed" : draft.type === "danger" ? "knee" : "ankle";
      let placeLabel = `Pinned location, ${draft.lat.toFixed(4)}, ${draft.lng.toFixed(4)}`;
      let division = "unknown", district;
      try {
        const addr = await reverseGeocodeAddress(draft.lat, draft.lng);
        placeLabel = addr.label; division = addr.division; district = addr.district;
      } catch { /* keep fallbacks */ }
      await callFunction("submit-report", {
        placeLabel,
        division,
        district,
        lat: draft.lat,
        lng: draft.lng,
        depth,
        note: draft.note?.trim() || undefined,
      });
      setDraft(null); setTapping(false);
      notify(copy.reportFiled);
      reloadFeed();
    } catch (ex) {
      console.error("[dashboard] quick report failed:", ex?.code ?? ex?.message ?? ex);
      notify(friendlyError(ex, copy.reportFailed, lang));
    } finally {
      setSaving(false);
    }
  };
  const cancelReport = () => { setDraft(null); setTapping(false); };

  /* ── Tiles ────────────────────────────────────────────────────────── */
  const [tileFailed, setTileFailed] = useState(false);
  const [tileBust,   setTileBust]   = useState(0);

  /* ─────────────────────────────────────────────────────────────────── *
   *  Responsive bottom offset                                           *
   *  < lg  : AppShell shows a fixed bottom nav (pb-28 = 7rem = 112px). *
   *          We add extra buffer so our FABs sit above it.              *
   *  lg+   : No bottom nav. A small gutter is enough.                  *
   * ─────────────────────────────────────────────────────────────────── */

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <>
      {/* Leaflet overrides — minimal: popup chrome + crosshair cursor */}
      <style>{`
        .leaflet-popup-content-wrapper{
          border-radius:16px!important;padding:0!important;
          box-shadow:var(--shadow-overlay)!important;
          border:1px solid var(--color-rule);
        }
        .leaflet-popup-content{margin:0!important}
        .leaflet-popup-tip-container{display:none}
        .dark .leaflet-popup-content-wrapper{background:var(--color-surface);border-color:var(--color-rule)}
        .leaflet-control-attribution{font-size:10px!important}
        ${tapping ? ".leaflet-container{cursor:crosshair!important}" : ""}
      `}</style>

      {/*
        ┌─────────────────────────────────────────────────────────────────┐
        │  Full-page breakout container                                   │
        │  • Cancels AppShell's   px-4 py-5 sm:px-6   padding            │
        │  • Height  = 100dvh − 64 px (sticky top navbar h-16)           │
        │  • min-h keeps the map usable on landscape phones               │
        └─────────────────────────────────────────────────────────────────┘
      */}
      <div
        className="relative -mx-4 -mt-5 overflow-hidden bg-paper-2 dark:bg-paper sm:-mx-6"
        style={{ height: "calc(100dvh - 64px)", minHeight: 300 }}
      >

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  LEAFLET MAP                                                 ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        <MapContainer
          center={base}
          zoom={userPos ? 15 : paramCenter ? paramZoom : 7}
          zoomControl={false}
          className={`h-full w-full${dark ? " sw-dark-tiles" : ""}`}
        >
          <BaseTiles key={tileBust} onFailed={setTileFailed} />
          <MapBridge
            mapRef={mapRef}
            onZoom={() => {}}
            tapping={tapping}
            initialCenter={paramCenter}
            initialZoom={paramZoom}
            onTap={(ll) =>
              setDraft((d) => ({ type: d?.type || "cautious", lat: ll.lat, lng: ll.lng, note: d?.note || "" }))
            }
          />

          {/* Route polylines */}
          {/* 1. Direct Route (red dashed when safe detour alternative exists) */}
          {primaryRoute && altRoute && (
            <Polyline
              positions={primaryRoute.coords}
              pathOptions={{
                color: "var(--color-danger)",
                weight: activeRouteTab === "direct" ? 7 : 4,
                opacity: activeRouteTab === "direct" ? 0.95 : 0.45,
                dashArray: "6 6",
                lineCap: "round",
              }}
            />
          )}

          {/* 2. Safe alternative route: solid ink over a light casing */}
          {altRoute && (
            <>
              <Polyline
                positions={altRoute.coords}
                pathOptions={{
                  color: "#ffffff",
                  weight: activeRouteTab === "alt" ? 11 : 7,
                  opacity: 0.9,
                }}
              />
              <Polyline
                positions={altRoute.coords}
                pathOptions={{
                  color: "var(--color-safe)",
                  weight: activeRouteTab === "alt" ? 6 : 4,
                  opacity: activeRouteTab === "alt" ? 0.95 : 0.5,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
            </>
          )}

          {/* 3. Regular single route (when no alternative is needed) */}
          {route && !altRoute && (
            <>
              <Polyline positions={route.coords} pathOptions={{ color: "#fff", weight: 10, opacity: 0.85 }} />
              <Polyline positions={route.coords} pathOptions={{ color: "var(--color-accent)", weight: 5, lineCap: "round", lineJoin: "round", smoothFactor: 0 }} />
            </>
          )}

          {/* Safety markers & two-point segment blockades */}
          {reports.filter((r) => show[r.type]).map((r) => {
            const seg = r.segment;
            const geom = segmentGeometries[r.id];
            const linePositions = geom?.coords || (seg ? [seg.start, seg.end] : null);
            const distM = geom?.distance || (seg ? L.latLng(seg.start).distanceTo(L.latLng(seg.end)) : null);
            const distText = distM ? (distM > 1000 ? `${(distM / 1000).toFixed(1)} km` : `${Math.round(distM)} m`) : null;

            const renderBlockadePopup = (endpointLabel) => (
              <Popup>
                <div className="p-3.5 max-w-[280px]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: TYPES[r.type]?.color || "var(--color-danger)" }}
                    />
                    <p className="text-[13px] font-bold" style={{ color: TYPES[r.type]?.color || "var(--color-danger)" }}>
                      {TYPES[r.type]?.label} {endpointLabel ? `(${endpointLabel})` : ""}
                    </p>
                  </div>

                  {seg && (
                    <div className="space-y-1.5 text-[12px] bg-slate-50 dark:bg-surface p-2.5 rounded-xl mb-2 border border-rule dark:border-white/10">
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-red-600 shrink-0">{copy.fromA}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{r.fromLabel || copy.startLocation}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-red-600 shrink-0">{copy.toB}</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{r.toLabel || copy.endLocation}</span>
                      </div>
                      {distText && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-rule dark:border-white/5">
                          <span>{copy.blockedStretch}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{distText}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {r.cleanNote || r.note}
                  </p>
                </div>
              </Popup>
            );

            if (seg) {
              return (
                <Fragment key={r.id}>
                  {/* Road stretch polyline with high-visibility casing */}
                  {linePositions && (
                    <>
                      <Polyline
                        positions={linePositions}
                        pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.9 }}
                      />
                      <Polyline
                        positions={linePositions}
                        pathOptions={{
                          color: TYPES[r.type]?.color || "var(--color-danger)",
                          weight: 5,
                          opacity: 0.95,
                          dashArray: "8 8",
                          lineCap: "round",
                        }}
                      >
                        {renderBlockadePopup(copy.roadStretch)}
                      </Polyline>
                    </>
                  )}

                  {/* Start Point (A) */}
                  <Marker
                    position={seg.start}
                    icon={makeSegmentPinIcon(TYPES[r.type]?.color || "var(--color-danger)", "A")}
                  >
                    {renderBlockadePopup(copy.pointA)}
                  </Marker>

                  {/* End Point (B) */}
                  <Marker
                    position={seg.end}
                    icon={makeSegmentPinIcon(TYPES[r.type]?.color || "var(--color-danger)", "B")}
                  >
                    {renderBlockadePopup(copy.pointB)}
                  </Marker>
                </Fragment>
              );
            }

            return (
              <Marker key={r.id} position={[r.lat, r.lng]} icon={reportIcons[r.type] ?? reportIcons.cautious}>
                {renderBlockadePopup(null)}
              </Marker>
            );
          })}

          {/* User location dot + GPS accuracy */}
          {userPos && userAcc != null && (
            <Circle
              center={userPos}
              radius={userAcc}
              interactive={false}
              pathOptions={{ color: "var(--color-accent)", weight: 1, fillColor: "var(--color-accent)", fillOpacity: 0.08 }}
            />
          )}
          {userPos && <Marker position={userPos} icon={userDotIcon} interactive={false} />}

          {/* Origin dot when routing */}
          {route && from && <Marker position={from} icon={userDotIcon} interactive={false} />}

          {/* Destination pin */}
          {dest && (
            <Marker position={dest.ll} icon={destPinIcon}>
              <Popup>
                <div className="p-3 text-[13px] font-semibold text-slate-800 dark:text-slate-100">{dest.name}</div>
              </Popup>
            </Marker>
          )}

          {/* Draft report dot */}
          {draft && (
            <Marker
              position={[draft.lat, draft.lng]}
              icon={makeDraftDot(TYPES[draft.type]?.color ?? "var(--color-muted)")}
              interactive={false}
            />
          )}
        </MapContainer>

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  TOP-LEFT PANEL  — Search card + Route card (lg+)           ║
            ╚══════════════════════════════════════════════════════════════╝

            Width breakdown:
            • Mobile  (< sm):  full width minus filter btn (3.5 rem) and gap (0.75 rem)
            • sm–lg:           fixed 288 px
            • lg+:             fixed 320 px
        */}
        <div className="absolute left-3 top-3 z-[1000] flex w-[calc(100%-3.75rem)] flex-col gap-2 sm:w-72 lg:w-80">

          {/* ── Search card ─────────────────────────────────────────── */}
          <div className={`${CARD} focus-within:ring-2 focus-within:ring-[var(--color-focus)]`}>
            <div className="flex items-center gap-2 px-3 py-2.5">
              {dest
                ? <Navigation className="h-4 w-4 shrink-0 text-ink dark:text-accent" />
                : <Search     className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
              }
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setDropOpen(true)}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchLabel}
                className="flex-1 bg-transparent text-[14px] text-slate-800 outline-none placeholder:text-slate-500"
              />
              {(query || dest) && (
                <button
                  onClick={clearRoute}
                  aria-label={copy.clear}
                  className="shrink-0 cursor-pointer rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Suggestions — max-height + scroll so a long list never pushes off-screen */}
            {dropOpen && (results.length > 0 || searching) && (
              <div className="max-h-[40vh] overflow-y-auto border-t border-slate-100 dark:border-white/10">
                {searching && (
                  <SuggestionListSkeleton />
                )}
                {results.map((r) => (
                  <button
                    key={r.place_id}
                    onClick={() => pickResult(r)}
                    className="flex w-full cursor-pointer items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
                    <span className="text-[13px] leading-snug text-slate-700">
                      <span className="font-semibold">{(r.label || r.full || "").split(",")[0]}</span>
                      <span className="text-slate-500">
                        {", " + (r.label || r.full || "").split(",").slice(1, 3).join(",")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {tileFailed && (
            <div className={`${CARD} flex items-center gap-2 px-3 py-2.5`} role="alert">
              <p className="flex-1 text-[13px] font-semibold text-slate-700">{copy.tileFailed}</p>
              <button
                onClick={() => { setTileFailed(false); setTileBust((b) => b + 1); }}
                className="pressable shrink-0 cursor-pointer rounded-xl bg-solid px-3 py-1.5 text-[12.5px] font-bold text-solid-ink hover:bg-solid-hover"
              >
                {copy.retry}
              </button>
            </div>
          )}

          {/* ── Route card — DESKTOP ONLY (lg+) ─────────────────────── */}
          {dest && (
            <div className="hidden lg:block">
              <RouteCard
                route={route}
                primaryRoute={primaryRoute}
                altRoute={altRoute}
                activeRouteTab={activeRouteTab}
                onSelectRouteTab={(tab) => {
                  setActiveRouteTab(tab);
                  setRoute(tab === "alt" ? altRoute : primaryRoute);
                }}
                blockadeOnRoute={blockadeOnRoute}
                routing={routing}
                mode={mode}
                setMode={setMode}
                modes={MODES}
                dest={dest}
                hazardText={hazardText}
                hazardLevel={hazardLevel}
                hazardStyle={HL}
                clearRoute={clearRoute}
              />
            </div>
          )}
        </div>

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  ROUTE BOTTOM SHEET — mobile / tablet only (< lg)           ║
            ║                                                              ║
            ║  Sits above the fixed bottom nav bar.                        ║
            ║  Hidden when the draft card is visible (avoids overlap).     ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        {dest && !draft && (
          <div
            className="absolute left-2 right-14 z-[1001] bottom-safe lg:hidden"
          >
            <RouteCard
              route={route}
              primaryRoute={primaryRoute}
              altRoute={altRoute}
              activeRouteTab={activeRouteTab}
              onSelectRouteTab={(tab) => {
                setActiveRouteTab(tab);
                setRoute(tab === "alt" ? altRoute : primaryRoute);
              }}
              blockadeOnRoute={blockadeOnRoute}
              routing={routing}
              mode={mode}
              setMode={setMode}
              modes={MODES}
              dest={dest}
              hazardText={hazardText}
              hazardLevel={hazardLevel}
              hazardStyle={HL}
              clearRoute={clearRoute}
              compact
            />
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  TOP-RIGHT  — Layer / filter toggle                          ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        <div className="absolute right-3 top-3 z-[1000]" ref={filterRef}>
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              aria-label={copy.filterMarkers}
              aria-expanded={filterOpen}
              title={copy.filterLayers}
              className={cn(
                "flex h-10 w-10 cursor-pointer select-none touch-manipulation items-center justify-center rounded-xl border shadow-md transition-colors",
                filterOpen
                  ? "border-solid bg-solid text-solid-ink shadow-sm"
                  : "border-rule-strong bg-surface text-ink-2 hover:bg-paper-2 hover:text-ink active:bg-rule dark:border-white/15 dark:bg-surface dark:text-ink dark:hover:bg-white/10"
              )}
            >
              <Layers className="h-5 w-5" />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-12 w-48 rounded-2xl border border-rule bg-surface p-3 shadow-xl dark:border-white/15 sm:w-52">
                <p className="mb-2 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                  {copy.showOnMap}
                </p>
                {Object.entries(TYPES).map(([key, { label, color }]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={show[key]}
                      onChange={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
                      className="h-4 w-4 cursor-pointer accent-solid"
                    />
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  TOP-CENTER  — Tap-to-report banner                          ║
            ║  No whitespace-nowrap — text wraps on narrow screens.        ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        {tapping && (
          <div className="absolute left-1/2 top-3 z-[1000] flex w-[min(400px,calc(100%-5rem))] -translate-x-1/2 items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 shadow-lg dark:border-amber-500/30 dark:bg-amber-500/10 sm:gap-3 sm:px-4 sm:py-2.5">
            <TriangleAlert className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <p className="flex-1 text-[12.5px] font-bold text-amber-800 dark:text-amber-300 sm:text-[13px]">
              {copy.tapToPlace}
            </p>
            <button
              onClick={cancelReport}
              className="shrink-0 cursor-pointer rounded-lg p-1 text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  DRAFT REPORT CARD — appears after pin is dropped            ║
            ║  Centered horizontally. On mobile sits above the bottom nav. ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        {draft && tapping && (
          <div
            className="absolute left-1/2 z-[1002] bottom-safe w-[min(340px,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900"
          >
            <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
              <p className="text-[14px] font-bold text-ink">{copy.pinPlaced}</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
              </p>
            </div>
            <div className="space-y-3 p-4">
              {/* Type selector */}
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TYPES).filter(([key]) => key !== "safe").map(([key, { label, color }]) => (
                  <button
                    key={key}
                    onClick={() => setDraft((d) => ({ ...d, type: key }))}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-[12.5px] font-bold transition-colors",
                      draft.type === key
                        ? "text-white dark:text-paper"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
                    )}
                    style={draft.type === key ? { borderColor: color, backgroundColor: color } : {}}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: draft.type === key ? "var(--color-surface)" : color }}
                    />
                    {label}
                  </button>
                ))}
              </div>

              {/* Note */}
              <input
                value={draft.note || ""}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                maxLength={140}
                placeholder={copy.notePlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-500 focus:border-focus dark:border-white/15 dark:bg-paper dark:focus:border-focus"
              />

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={cancelReport}
                  className="min-h-[40px] flex-1 cursor-pointer rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  {copy.cancel}
                </button>
                <button
                  onClick={saveReport}
                  disabled={saving}
                  className="min-h-[40px] flex-1 cursor-pointer rounded-xl bg-solid text-[13px] font-bold text-solid-ink transition-colors hover:bg-solid-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? copy.submitting : copy.submit}
                </button>
              </div>

              <Link
                to="/report"
                className="block text-center text-[12px] font-semibold text-ink underline dark:text-accent"
              >
                {copy.fullForm}
              </Link>
            </div>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  BOTTOM-RIGHT — FAB column                                   ║
            ║                                                              ║
            ║  Stacked vertically: Report FAB → Locate → Zoom in/out      ║
            ║                                                              ║
            ║  Bottom offset mirrors AppShell pb-28 on mobile, shrinks    ║
            ║  to a small gutter on lg+ (no bottom nav).                  ║
            ║  z-[1002] ensures FABs float above the route bottom sheet.  ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        <div
          className="absolute right-3 z-[1002] bottom-safe flex flex-col items-center gap-2"
        >          {/* Report / Cancel FAB */}
          <button
            onClick={tapping ? cancelReport : startReport}
            title={tapping ? copy.cancelReport : copy.reportFlooding}
            aria-label={tapping ? copy.cancelReport : copy.reportFlooding}
            className={cn(
              "flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl shadow-lg transition-colors sm:h-12 sm:w-12",
              tapping
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-solid text-solid-ink hover:bg-solid-hover"
            )}
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* My location */}
          <button
            onClick={() => locate()}
            title={copy.centerOnMe}
            aria-label={copy.centerOnMe}
            className="flex h-9 w-9 cursor-pointer select-none touch-manipulation items-center justify-center rounded-xl border border-rule-strong bg-surface text-ink-2 shadow-md transition-colors hover:bg-paper-2 hover:text-ink active:bg-rule dark:border-white/15 dark:bg-surface dark:text-ink dark:hover:bg-white/10 sm:h-10 sm:w-10"
          >
            <LocateFixed className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Zoom in / out — stacked pair */}
          <div className="overflow-hidden rounded-xl border border-rule-strong bg-surface shadow-md dark:border-white/15 dark:bg-surface">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              aria-label={copy.zoomIn}
              className="flex h-9 w-9 cursor-pointer select-none touch-manipulation items-center justify-center border-b border-rule text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink active:bg-rule dark:border-white/15 dark:text-ink dark:hover:bg-white/10 sm:h-10 sm:w-10"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              aria-label={copy.zoomOut}
              className="flex h-9 w-9 cursor-pointer select-none touch-manipulation items-center justify-center text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink active:bg-rule dark:text-ink dark:hover:bg-white/10 sm:h-10 sm:w-10"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  BOTTOM-LEFT — Collapsible safety legend                     ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        <div
          className="absolute left-3 z-[1000] bottom-safe"
        >
          <div className="overflow-hidden rounded-2xl border border-rule bg-white shadow-md dark:border-white/10 dark:bg-slate-900">
            <button
              onClick={() => setLegendOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-ink dark:text-accent" />
              <span className="hidden sm:inline">{copy.safetyLegend}</span>
              <span className="sm:hidden">{copy.legend}</span>
              {legendOpen
                ? <ChevronUp className="ml-auto h-3 w-3 text-slate-500 dark:text-slate-400" />
                : <ChevronDown className="ml-auto h-3 w-3 text-slate-500 dark:text-slate-400" />
              }
            </button>

            {legendOpen && (
              <div className="space-y-2 border-t border-slate-100 px-3 py-2.5 dark:border-white/10">
                {[
                  { color: "var(--color-safe)", label: copy.legendSafe, sub: copy.legendSafeSub },
                  { color: "var(--color-caution)", label: copy.legendCaution, sub: copy.legendCautionSub },
                  { color: "var(--color-danger)", label: copy.legendAvoid, sub: copy.legendAvoidSub },
                ].map(({ color, label, sub }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{label}</span>
                    <span className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:inline">{sub}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 border-t border-slate-100 pt-1.5 dark:border-white/10">
                  {feedBusy ? <LiveReportStatusSkeleton /> : <>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                      {copy.liveReports(reports.length)}
                    </p>
                  </>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  BOTTOM-CENTER — "File a verified report" shortcut link      ║
            ║  Hidden on small phones (Camera FAB is sufficient there).    ║
            ║  Hidden when route sheet or draft card is visible.           ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        {!draft && !tapping && !dest && (
          <div
            className="absolute left-1/2 z-[1000] bottom-safe hidden -translate-x-1/2 sm:block"
          >
            <Link
              to="/report"
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-white px-4 py-1.5 text-[12.5px] font-bold text-slate-600 shadow-md transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <Camera className="h-3.5 w-3.5 text-ink dark:text-accent" />
              {copy.fileVerified}
            </Link>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  TOAST — transient status messages                           ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        {toast && (
          <div
            role="status"
            className="absolute left-1/2 z-[2000] bottom-safe-toast -translate-x-1/2 rounded-2xl bg-inverse px-5 py-3 text-[13px] font-semibold text-inverse-ink shadow-xl"
          >
            {toast}
          </div>
        )}

      </div>
    </>
  );
}
