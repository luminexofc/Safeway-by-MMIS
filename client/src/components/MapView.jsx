import { useEffect, useRef, useState } from "react";
import { MapContainer, Polyline, Circle, CircleMarker, Marker, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import BaseTiles from "./BaseTiles";
import L from "leaflet";
// Leaflet's positioning CSS must travel with the component, not with whichever
// page happens to import it. Without it tiles and marker panes lose their
// absolute positioning and everything drifts off its coordinate.
import "leaflet/dist/leaflet.css";
import { COUNTRY_FALLBACK, COUNTRY_CENTER } from "../services/geo";
import { useLang } from "../lib/lang";
import { useTheme } from "../../../shared/theme";
import "./map-view.css";

const MAP_COPY = {
  en: {
    tileError: "Map tiles are not loading. Check your connection.",
    retry: "Retry map",
  },
  bn: {
    tileError: "মানচিত্রের টাইল লোড হচ্ছে না। ইন্টারনেট সংযোগ দেখুন।",
    retry: "মানচিত্র আবার লোড করুন",
  },
};

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

function makeDot(color = "var(--color-accent)", size = 18) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid var(--color-surface);box-shadow:0 2px 8px oklch(20% 0.018 216 / 0.22)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const dotIcon = makeDot("var(--color-accent)", 18);

const TONE_COLOR = { safe: "var(--color-safe)", caution: "var(--color-caution)", danger: "var(--color-danger)", info: "var(--color-accent)", neutral: "var(--color-muted)" };

/**
 * Live map. One API:
 * - center [lat,lng], zoom (initial view; later moves go through fitSignal)
 * - markers: [{id, pos:[lat,lng], tone}] ("user" tone draws the location dot)
 * - lines: [{id, positions, color, weight, dashed}]
 * - radius: {at:[lat,lng], meters} | null
 * - pin: {pos:[lat,lng]} + onPinMove({lat,lng}) for the draggable report pin
 * - onMapClick({lat,lng}) | null: tapping the map (report pin placement)
 * - fitSignal: bump to refit to current markers+lines
 * - chip: string | null (null hides the overlay chip; long text ellipsises in CSS)
 * - tileErrorText / retryText: localised strings for the tile-failure notice
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
  tileErrorText = null,
  retryText = null,
  interactive = true,
}) {
  const [lang] = useLang();
  const copy = MAP_COPY[lang] || MAP_COPY.en;
  const tileError = tileErrorText ?? copy.tileError;
  const retry = retryText ?? copy.retry;
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
    <div className={`map-view${darkTiles ? " sw-dark-tiles" : ""}`}>
      <MapContainer
        center={resolvedCenter}
        zoom={resolvedZoom}
        zoomControl={false}
        scrollWheelZoom={interactive}
        dragging={interactive}
        className="map-view-map"
      >
        <ZoomControl position="bottomright" />
        <BaseTiles key={tileBust} onFailed={setTileFailed} />
        {radius && (
          <Circle
            center={radius.at}
            radius={radius.meters ?? 5000}
            pathOptions={{ color: "var(--color-accent)", weight: 1.5, dashArray: "6 6", fillColor: "var(--color-accent)", fillOpacity: 0.06 }}
          />
        )}
        {lines.map((l) => (
          <Polyline
            key={l.id}
            positions={l.positions}
            pathOptions={{
              color: l.color || "var(--color-accent)",
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
                color: "var(--color-surface)",
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
        <div className="map-tile-error" role="alert">
          <p>{tileError}</p>
          <button
            className="map-retry"
            onClick={() => { setTileFailed(false); setTileBust((b) => b + 1); }}
          >
            {retry}
          </button>
        </div>
      )}

      {chip !== null && !tileFailed && (
        <div className="map-credit">
          <span className="map-credit-dot" aria-hidden="true" />
          <span className="map-credit-text">{chip}</span>
        </div>
      )}
    </div>
  );
}
