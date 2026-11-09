import { useEffect, useRef, useState } from "react";
import { MapContainer, Polyline, Circle, CircleMarker, Marker, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import BaseTiles from "./BaseTiles";
import L from "leaflet";
import { COUNTRY_FALLBACK, COUNTRY_CENTER } from "../services/geo";
import { useTheme } from "../../../shared/theme";

const FALLBACK_CENTER = [COUNTRY_FALLBACK?.lat ?? COUNTRY_CENTER[0], COUNTRY_FALLBACK?.lng ?? COUNTRY_CENTER[1]];

// Fits only when the signal changes (or on mount). Points ride a ref so
// ordinary re-renders from typing or toasts never yank the user's pan.
function FitController({ fitSignal, points }) {
  const map = useMap();
  const pointsRef = useRef(points);
  pointsRef.current = points;
  useEffect(() => {
    const pts = pointsRef.current;
    if (!pts?.length) return;
    try {
      map.fitBounds(L.latLngBounds(pts).pad(0.22));
    } catch {
      /* ignore */
    }
  }, [map, fitSignal]);
  return null;
}

function ClickController({ onPick }) {
  useMapEvents({
    click(e) {
      if (onPick) onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function makeDot(color = "#0d9488", size = 18) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const dotIcon = makeDot("#0d9488", 18);

const TONE_COLOR = { safe: "#15803d", caution: "#ca8a04", danger: "#dc2626", info: "#0d9488", neutral: "#64748b" };

/**
 * Live map. One API:
 * - center [lat,lng], zoom (initial view; later moves go through fitSignal)
 * - markers: [{id, pos:[lat,lng], tone}] ("user" tone draws the location dot)
 * - lines: [{id, positions, color, weight, dashed}]
 * - radius: {at:[lat,lng], meters} | null
 * - pin: {pos:[lat,lng]} + onPinMove({lat,lng}) for the draggable report pin
 * - onMapClick({lat,lng}) | null: tapping the map (report pin placement)
 * - fitSignal: bump to refit to current markers+lines
 * - chip: string | null (null hides the overlay chip)
 */
export default function MapView({
  center,
  zoom,
  markers = [],
  lines = [],
  radius = null,
  pin = null,
  onPinMove = null,
  onMapClick = null,
  fitSignal = 0,
  chip = null,
  height = "100%",
  interactive = true,
}) {
  const resolvedCenter = center || FALLBACK_CENTER;
  const resolvedZoom = zoom ?? 7;

  const fitPoints = [
    ...lines.flatMap((l) => l.positions),
    ...markers.map((m) => m.pos),
    ...(pin ? [pin.pos] : []),
    ...(radius ? [radius.at] : []),
  ];

  const pinRef = useRef(null);
  const [tileBust, setTileBust] = useState(0);
  const [tileFailed, setTileFailed] = useState(false);
  const { resolved } = useTheme();
  const darkTiles = resolved === "dark";

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-white/10 dark:bg-slate-900${darkTiles ? " sw-dark-tiles" : ""}`} style={{ minHeight: 320, height }}>
      <MapContainer
        center={resolvedCenter}
        zoom={resolvedZoom}
        zoomControl={false}
        scrollWheelZoom={interactive}
        dragging={interactive}
        style={{ height: "100%", width: "100%", minHeight: 320 }}
      >
        <ZoomControl position="bottomright" />
        <BaseTiles key={tileBust} onFailed={setTileFailed} />
        {radius && (
          <Circle
            center={radius.at}
            radius={radius.meters ?? 5000}
            pathOptions={{ color: "#0d9488", weight: 1.5, dashArray: "6 6", fillColor: "#0d9488", fillOpacity: 0.06 }}
          />
        )}
        {lines.map((l) => (
          <Polyline
            key={l.id}
            positions={l.positions}
            pathOptions={{
              color: l.color || "#0d9488",
              weight: l.weight || 6,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
              smoothFactor: 0,
              dashArray: l.dashed ? "2 8" : undefined,
            }}
          />
        ))}
        {markers.map((m) =>
          m.tone === "user" ? (
            <Marker key={m.id} position={m.pos} icon={dotIcon} />
          ) : (
            <CircleMarker
              key={m.id}
              center={m.pos}
              radius={8}
              pathOptions={{
                color: "#fff",
                weight: 2.5,
                fillColor: TONE_COLOR[m.tone] || TONE_COLOR.neutral,
                fillOpacity: 0.95,
              }}
            />
          )
        )}
        {pin && (
          <Marker
            position={pin.pos}
            draggable={!!interactive}
            ref={pinRef}
            eventHandlers={{
              dragend: () => {
                const m = pinRef.current;
                if (m && onPinMove) {
                  const ll = m.getLatLng();
                  onPinMove({ lat: ll.lat, lng: ll.lng });
                }
              },
            }}
          />
        )}
        {interactive && onMapClick && <ClickController onPick={onMapClick} />}
        <FitController fitSignal={fitSignal} points={fitPoints} />
      </MapContainer>

      {tileFailed && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900" role="alert">
          <p className="min-w-[200px] flex-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">Map tiles are not loading. Check your connection.</p>
          <button
            onClick={() => { setTileFailed(false); setTileBust((b) => b + 1); }}
            className="pressable min-h-[40px] cursor-pointer rounded-xl bg-slate-900 px-4 text-[13.5px] font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Retry map
          </button>
        </div>
      )}

      {chip !== null && !tileFailed && (
        <div className="pointer-events-none absolute left-3 top-3 z-[500] flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3 dark:border-white/10 dark:bg-slate-900">
          <span className="h-2.5 w-2.5 rounded-full bg-teal-700 dark:bg-teal-400" aria-hidden="true" />
          <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{chip}</span>
        </div>
      )}
    </div>
  );
}
