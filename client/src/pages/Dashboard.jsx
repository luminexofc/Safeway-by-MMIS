import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "../lib/cn";
import { COUNTRY_CENTER, reverseGeocodeAddress } from "../services/geo";
import { useTheme } from "../lib/theme";
import { callFunction, fetchFeed, reportType, depthLabel } from "../lib/appwrite";
import { friendlyError } from "../lib/errors";
import {
  Search, X, LocateFixed, Plus, Minus, Navigation,
  TriangleAlert, ShieldCheck, ChevronDown, ChevronUp,
  Camera, Car, Bike, MapPin, Layers, Check,
} from "lucide-react";

/* ─── constants ─────────────────────────────────────────────────────── */

const DEFAULT_CENTER = COUNTRY_CENTER; // [23.685, 90.3563]

const TYPES = {
  safe:     { label: "Safe Route",   color: "#15803d" },
  cautious: { label: "Caution",      color: "#ca8a04" },
  danger:   { label: "Danger",       color: "#dc2626" },
  blocked:  { label: "Blocked Road", color: "#dc2626" },
};

// Walk uses Navigation (confirmed in existing imports), Bike and Car are standard Lucide
const MODES = {
  walk:  { osrm: "routed-foot", label: "Walk",  Icon: Navigation },
  bike:  { osrm: "routed-bike", label: "Bike",  Icon: Bike       },
  drive: { osrm: "routed-car",  label: "Drive", Icon: Car        },
};

// Hazard-level display config
const HL = {
  safe: {
    Icon: Check,
    iconCls:   "text-emerald-700 dark:text-emerald-300",
    bannerCls: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30",
    textCls:   "text-emerald-800 dark:text-emerald-300",
  },
  cautious: {
    Icon: TriangleAlert,
    iconCls:   "text-amber-600 dark:text-amber-400",
    bannerCls: "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30",
    textCls:   "text-amber-800 dark:text-amber-300",
  },
  danger: {
    Icon: TriangleAlert,
    iconCls:   "text-red-600 dark:text-red-400",
    bannerCls: "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30",
    textCls:   "text-red-800 dark:text-red-300",
  },
};

/* ─── helpers ────────────────────────────────────────────────────────── */

const fmtDist = (m) => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
const fmtTime = (s) => {
  const m = Math.max(1, Math.round(s / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

async function fetchRoute(mode, a, b, signal) {
  const url =
    `https://routing.openstreetmap.de/${MODES[mode].osrm}/route/v1/driving/` +
    `${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
  const res  = await fetch(url, { signal });
  const json = await res.json();
  if (!json.routes?.length) throw new Error("No route found between these points.");
  const r = json.routes[0];
  return {
    coords:   r.geometry.coordinates.map(([x, y]) => [y, x]),
    distance: r.distance,
    duration: r.duration,
  };
}

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
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#0d9488;border:3px solid white;box-shadow:0 0 0 3px rgba(13,148,136,.28),0 2px 8px rgba(0,0,0,.3)"></div>`,
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
const destPinIcon = makePinIcon("#0f766e");
const reportIcons = {
  safe:     makePinIcon("#15803d"),
  cautious: makePinIcon("#ca8a04"),
  danger:   makePinIcon("#dc2626"),
  blocked:  makePinIcon("#dc2626"),
};

/* ─── Map bridge sub-component ───────────────────────────────────────── */

function MapBridge({ mapRef, onZoom, tapping, onTap }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
    onZoom(map.getZoom());
  }, [map]); // eslint-disable-line
  useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
    click:   (e) => tapping && onTap(e.latlng),
  });
  return null;
}

/* ─── Shared card wrapper ────────────────────────────────────────────── */

const CARD = "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900";

/* ─── Route card content (shared between left panel and bottom sheet) ── */

function RouteCard({ route, routing, mode, setMode, dest, nearby, hazardText, hazardLevel, clearRoute, compact = false }) {
  const hl = HL[hazardLevel];
  const HlIcon = hl.Icon;
  return (
    <div className={CARD}>
      {/* Transport mode tabs */}
      <div className="flex border-b border-slate-100 dark:border-white/10">
        {Object.entries(MODES).map(([key, { label, Icon }]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={cn(
              "flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-[11.5px] font-bold transition-colors",
              mode === key
                ? "-mb-px border-b-2 border-teal-700 text-teal-700 dark:border-teal-400 dark:text-teal-400"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className={cn("space-y-3 p-4", compact && "py-3")}>
        {routing ? (
          <p className="animate-pulse text-[13px] text-slate-400">Finding route…</p>
        ) : route ? (
          <>
            {/* ETA + distance */}
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold leading-none text-slate-900 dark:text-slate-100 sm:text-[26px]">
                {fmtTime(route.duration)}
              </span>
              <span className="text-[13px] text-slate-400">{fmtDist(route.distance)}</span>
            </div>

            {/* Safety banner */}
            <div className={cn("flex items-start gap-2 rounded-xl border px-3 py-2", hl.bannerCls)}>
              <HlIcon className={cn("mt-0.5 h-4 w-4 shrink-0", hl.iconCls)} />
              <div>
                <p className={cn("text-[12.5px] font-bold", hl.textCls)}>{hazardText}</p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  Safety colors active once API connects
                </p>
              </div>
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
          <p className="text-[13px] text-slate-400">Select a destination to get directions.</p>
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

/* ─── Dashboard ──────────────────────────────────────────────────────── */

export default function Dashboard() {
  const { resolved } = useTheme();
  const dark = resolved === "dark";

  const mapRef = useRef(null);

  const [userPos,  setUserPos]  = useState(null);
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
  const [routing, setRouting] = useState(false);

  // Tap-to-report
  const [tapping, setTapping] = useState(false);
  const [draft,   setDraft]   = useState(null);

  // UI panels
  const [toast,      setToast]      = useState("");
  const [legendOpen, setLegendOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const base    = userPos || DEFAULT_CENTER;
  const reports = useMemo(() => feed.map((r) => ({
    id: r.$id,
    type: reportType(r),
    lat: r.lat,
    lng: r.lng,
    depth: r.depth,
    status: r.status,
    note: r.note || `${depthLabel(r.depth)} — ${r.status === "verified" ? "verified" : "unverified"}`,
  })), [feed]);

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
        notify(friendlyError(err, "Live report feed is unavailable right now. Showing your last loaded data."));
      })
      .finally(() => setFeedBusy(false));
  }, [notify]);

  useEffect(() => { reloadFeed(); }, [reloadFeed]);

  /* ── Geolocation ──────────────────────────────────────────────────── */

  const locate = useCallback((fly = true) => {
    if (!navigator.geolocation) return notify("Geolocation is not supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const ll = [coords.latitude, coords.longitude];
        setUserPos(ll);
        if (fly) mapRef.current?.flyTo(ll, 15, { duration: 1.4 });
      },
      () => notify("Location unavailable. Allow access or search an address instead."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [notify]);

  useEffect(() => { locate(true); }, []); // eslint-disable-line

  /* ── Debounced geocode (Nominatim, Bangladesh-biased) ─────────────── */

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setDropOpen(false); return; }
    const ctrl  = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=bd&q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
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
    const center = mapRef.current?.getCenter();
    setFrom(userPos || (center ? [center.lat, center.lng] : DEFAULT_CENTER));
    const name = r.display_name.split(",").slice(0, 2).join(",").trim();
    setDest({ name, ll: [parseFloat(r.lat), parseFloat(r.lon)] });
    setQuery(name);
    setResults([]);
    setDropOpen(false);
    mapRef.current?.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 14, { duration: 1.2 });
  };

  const clearRoute = () => {
    setDest(null); setRoute(null);
    setQuery(""); setResults([]); setDropOpen(false);
  };

  /* ── OSRM routing ─────────────────────────────────────────────────── */

  useEffect(() => {
    if (!dest || !from) return;
    const ctrl = new AbortController();
    setRouting(true);
    fetchRoute(mode, from, dest.ll, ctrl.signal)
      .then((r) => {
        setRoute(r);
        mapRef.current?.fitBounds(L.latLngBounds(r.coords), {
          paddingTopLeft:     [340, 24],
          paddingBottomRight: [24, 100],
        });
      })
      .catch((e) => {
        if (e.name !== "AbortError") { setRoute(null); notify(e.message || "Couldn't find a route."); }
      })
      .finally(() => setRouting(false));
    return () => ctrl.abort();
  }, [dest, from, mode]); // eslint-disable-line

  /* ── Hazard proximity ─────────────────────────────────────────────── */

  const nearby = useMemo(() => {
    if (!route) return null;
    const pts = route.coords.filter((_, i) => i % 3 === 0).map((c) => L.latLng(c));
    const out = { cautious: 0, danger: 0, blocked: 0 };
    reports.forEach((r) => {
      if (!(r.type in out)) return;
      if (pts.some((q) => q.distanceTo(L.latLng(r.lat, r.lng)) < 150)) out[r.type]++;
    });
    return out;
  }, [route, reports]);

  const hazardLevel = nearby
    ? (nearby.blocked || nearby.danger ? "danger" : nearby.cautious ? "cautious" : "safe")
    : "safe";

  const hazardText = nearby ? (() => {
    const parts = [];
    if (nearby.blocked)  parts.push(`${nearby.blocked} blocked road${nearby.blocked  > 1 ? "s" : ""}`);
    if (nearby.danger)   parts.push(`${nearby.danger} danger zone${nearby.danger     > 1 ? "s" : ""}`);
    if (nearby.cautious) parts.push(`${nearby.cautious} caution area${nearby.cautious > 1 ? "s" : ""}`);
    return parts.length ? `${parts.join(", ")} within 150 m` : "No hazards on this route";
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
      notify("Report filed. It enters the verification queue.");
      reloadFeed();
    } catch (ex) {
      console.error("[dashboard] quick report failed:", ex?.code ?? ex?.message ?? ex);
      notify(friendlyError(ex, "Could not file the report. Please try again."));
    } finally {
      setSaving(false);
    }
  };
  const cancelReport = () => { setDraft(null); setTapping(false); };

  /* ── Tiles ────────────────────────────────────────────────────────── */

  // Light starts on OSM, dark on CARTO. If either provider fails (flaky
  // network, rate limit), swap to the other one instead of a blank map.
  const [tileFailed, setTileFailed] = useState(false);
  const tileUrl   = tileFailed
    ? (dark ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png")
    : (dark ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png");
  const tileAttr  = tileUrl.includes("cartocdn") || tileUrl.includes("carto")
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors';

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
          border-radius:14px!important;padding:0!important;
          box-shadow:0 4px 20px rgba(0,0,0,.13)!important;
          border:1px solid #e2e8f0;
        }
        .leaflet-popup-content{margin:0!important}
        .leaflet-popup-tip-container{display:none}
        .dark .leaflet-popup-content-wrapper{background:#1e293b;border-color:rgba(255,255,255,.1)}
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
        className="relative -mx-4 -mt-5 overflow-hidden bg-slate-200 dark:bg-slate-950 sm:-mx-6"
        style={{ height: "calc(100dvh - 64px)", minHeight: 300 }}
      >

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  LEAFLET MAP                                                 ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        <MapContainer
          center={base}
          zoom={userPos ? 15 : 7}
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            key={`${dark ? "dark" : "light"}-${tileFailed ? "fb" : "primary"}`}
            attribution={tileAttr}
            url={tileUrl}
            eventHandlers={{ tileerror: () => setTileFailed(true) }}
          />
          <MapBridge
            mapRef={mapRef}
            onZoom={() => {}}
            tapping={tapping}
            onTap={(ll) =>
              setDraft((d) => ({ type: d?.type || "cautious", lat: ll.lat, lng: ll.lng, note: d?.note || "" }))
            }
          />

          {/* Route polylines */}
          {route && (
            <>
              <Polyline positions={route.coords} pathOptions={{ color: "#fff",    weight: 10, opacity: 0.85 }} />
              <Polyline positions={route.coords} pathOptions={{ color: "#0f766e", weight: 5,  lineCap: "round", lineJoin: "round" }} />
            </>
          )}

          {/* Safety markers */}
          {reports.filter((r) => show[r.type]).map((r) => (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={reportIcons[r.type] ?? reportIcons.cautious}>
              <Popup>
                <div className="p-3">
                  <p className="text-[13px] font-bold" style={{ color: TYPES[r.type]?.color }}>
                    {TYPES[r.type]?.label}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">{r.note}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* User location dot */}
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
              icon={makeDraftDot(TYPES[draft.type]?.color ?? "#64748b")}
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
          <div className={CARD}>
            <div className="flex items-center gap-2 px-3 py-2.5">
              {dest
                ? <Navigation className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
                : <Search     className="h-4 w-4 shrink-0 text-slate-400" />
              }
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => results.length > 0 && setDropOpen(true)}
                placeholder="Search anywhere in Bangladesh…"
                aria-label="Search destinations"
                className="flex-1 bg-transparent text-[14px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {(query || dest) && (
                <button
                  onClick={clearRoute}
                  aria-label="Clear"
                  className="shrink-0 cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Suggestions — max-height + scroll so a long list never pushes off-screen */}
            {dropOpen && (results.length > 0 || searching) && (
              <div className="max-h-[40vh] overflow-y-auto border-t border-slate-100 dark:border-white/10">
                {searching && (
                  <p className="px-4 py-2.5 text-[13px] text-slate-400">Searching…</p>
                )}
                {results.map((r) => (
                  <button
                    key={r.place_id}
                    onClick={() => pickResult(r)}
                    className="flex w-full cursor-pointer items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="text-[13px] leading-snug text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">{r.display_name.split(",")[0]}</span>
                      <span className="text-slate-400 dark:text-slate-500">
                        {", " + r.display_name.split(",").slice(1, 3).join(",")}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Route card — DESKTOP ONLY (lg+) ─────────────────────── */}
          {dest && (
            <div className="hidden lg:block">
              <RouteCard
                route={route}
                routing={routing}
                mode={mode}
                setMode={setMode}
                dest={dest}
                nearby={nearby}
                hazardText={hazardText}
                hazardLevel={hazardLevel}
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
              routing={routing}
              mode={mode}
              setMode={setMode}
              dest={dest}
              nearby={nearby}
              hazardText={hazardText}
              hazardLevel={hazardLevel}
              clearRoute={clearRoute}
              compact
            />
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  TOP-RIGHT  — Layer / filter toggle                          ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        <div className="absolute right-3 top-3 z-[1000]">
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              aria-label="Filter map markers"
              title="Filter layers"
              className={cn(
                "flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border shadow-md transition-colors",
                filterOpen
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/5"
              )}
            >
              <Layers className="h-4 w-4" />
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-12 w-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-900 sm:w-52">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">
                  Show on map
                </p>
                {Object.entries(TYPES).map(([key, { label, color }]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={show[key]}
                      onChange={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
                      className="h-4 w-4 cursor-pointer accent-teal-700"
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
              Tap the map to drop your report pin
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
              <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">Pin placed</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
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
                        ? "text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
                    )}
                    style={draft.type === key ? { borderColor: color, backgroundColor: color } : {}}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: draft.type === key ? "rgba(255,255,255,.9)" : color }}
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
                placeholder="Short note — e.g. ankle-deep, left lane passable"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-600 dark:border-white/15 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400"
              />

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={cancelReport}
                  className="min-h-[40px] flex-1 cursor-pointer rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={saveReport}
                  disabled={saving}
                  className="min-h-[40px] flex-1 cursor-pointer rounded-xl bg-teal-700 text-[13px] font-bold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Submitting…" : "Submit"}
                </button>
              </div>

              <Link
                to="/report"
                className="block text-center text-[12px] font-semibold text-teal-700 underline dark:text-teal-400"
              >
                Use the full verified report form
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
            title={tapping ? "Cancel report" : "Report flooding"}
            aria-label={tapping ? "Cancel report" : "Report flooding"}
            className={cn(
              "flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl shadow-lg transition-colors sm:h-12 sm:w-12",
              tapping
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-teal-700 text-white hover:bg-teal-800"
            )}
          >
            <Camera className="h-5 w-5" />
          </button>

          {/* My location */}
          <button
            onClick={() => locate(true)}
            title="Center on my location"
            aria-label="Center on my location"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/5 sm:h-10 sm:w-10"
          >
            <LocateFixed className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* Zoom in / out — stacked pair */}
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md dark:border-white/10 dark:bg-slate-900">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              aria-label="Zoom in"
              className="flex h-9 w-9 cursor-pointer items-center justify-center border-b border-slate-100 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5 sm:h-10 sm:w-10"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              aria-label="Zoom out"
              className="flex h-9 w-9 cursor-pointer items-center justify-center text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5 sm:h-10 sm:w-10"
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
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md dark:border-white/10 dark:bg-slate-900">
            <button
              onClick={() => setLegendOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[12px] font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" />
              <span className="hidden sm:inline">Safety legend</span>
              <span className="sm:hidden">Legend</span>
              {legendOpen
                ? <ChevronDown className="ml-auto h-3 w-3 text-slate-400" />
                : <ChevronUp   className="ml-auto h-3 w-3 text-slate-400" />
              }
            </button>

            {legendOpen && (
              <div className="space-y-2 border-t border-slate-100 px-3 py-2.5 dark:border-white/10">
                {[
                  { color: "#15803d", label: "Safe",    sub: "×1.0 — Verified clear" },
                  { color: "#ca8a04", label: "Caution", sub: "×1.5–×5"               },
                  { color: "#dc2626", label: "Avoid",   sub: "×∞ — Waterlogged"       },
                ].map(({ color, label, sub }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                    <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{label}</span>
                    <span className="hidden text-[11px] text-slate-400 dark:text-slate-500 sm:inline">{sub}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 border-t border-slate-100 pt-1.5 dark:border-white/10">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${feedBusy ? "animate-pulse bg-amber-400" : "bg-emerald-500"}`}
                    aria-hidden="true"
                  />
                  <p className="text-[10.5px] text-slate-400">
                    {feedBusy ? "Loading live reports…" : `${reports.length} live report${reports.length === 1 ? "" : "s"} · tap markers for details`}
                  </p>
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
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-1.5 text-[12.5px] font-bold text-slate-600 shadow-md transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <Camera className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              File a verified report
            </Link>
          </div>
        )}

        {/* ╔══════════════════════════════════════════════════════════════╗
            ║  TOAST — transient status messages                           ║
            ╚══════════════════════════════════════════════════════════════╝ */}
        {toast && (
          <div
            role="status"
            className="absolute left-1/2 z-[2000] bottom-safe-toast -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-[13px] font-semibold text-white shadow-xl dark:bg-slate-800"
          >
            {toast}
          </div>
        )}

      </div>
    </>
  );
}
