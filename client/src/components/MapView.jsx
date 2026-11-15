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

// The report pin. Leaflet's default marker is a bitmap it fetches itself, which
// under the bundler resolves to a missing or blurry PNG; drawing the pin as an
// SVG divIcon keeps it on the design tokens and crisp at any zoom. The anchor
// sits on the tip, so the coordinate is the point of the pin and dragging keeps
// the tip under the finger.
function makePin(color = "var(--color-accent)") {
  return L.divIcon({
    className: "map-pin",
    html: `<div class="map-pin-body">
      <svg viewBox="0 0 24 32" width="24" height="32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 0C5.4 0 0 5.2 0 11.6 0 20 12 32 12 32s12-12 12-20.4C24 5.2 18.6 0 12 0z"
              fill="${color}" stroke="var(--color-surface)" stroke-width="1.5"/>
        <circle cx="12" cy="11.5" r="4.5" fill="var(--color-surface)" opacity=".9"/>
      </svg>
    </div>`,
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -34],
  });
}

const pinIcon = makePin();

// A labelled point (A/B on a flooded stretch) is something the user taps, so
// it is drawn as a 44px hit box around a compact dot: the visual stays a
// readable badge while the touch target meets the tap-size the rest of the app
// uses. The letter lives inside the dot, which a CircleMarker cannot do.
function makeBadge(color, label, size = 44) {
  const dot = Math.round(size * 0.7);
  return L.divIcon({
    className: "map-badge",
    html: `<div class="map-badge-hit" style="width:${size}px;height:${size}px">
      <span class="map-badge-dot" style="width:${dot}px;height:${dot}px;background:${color}">${label}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const TONE_COLOR = { safe: "var(--color-safe)", caution: "var(--color-caution)", danger: "var(--color-danger)", info: "var(--color-accent)", neutral: "var(--color-muted)" };

/**
 * Live map. One API:
 * - center [lat,lng], zoom (initial view; later moves go through fitSignal)
 * - markers: [{id, pos:[lat,lng], tone, label, size}] ("user" tone draws the
 *   location dot; a label turns the marker into a lettered tap target)
 * - lines: [{id, positions, color, weight, dashed}]
 * - radius: {at:[lat,lng], meters, tone} | null (tone picks the zone colour)
 * - pin: {pos:[lat,lng]} + onPinMove({lat,lng}) for the draggable report pin
 * - onMapClick({lat,lng}) | null: tapping the map (report pin placement)
 * - onMarkerClick(id) | null: tapping a marker (marker taps never also
 *   register as a map tap, so a point can be removed instead of moved)
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
  onMarkerClick = null,
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
          // A zone has to read as an area at a glance: a 1.5px dashed hairline
          // over a 6% wash disappeared against the tiles, so the ring is drawn
          // at 2px with a long dash and a wash that still leaves labels legible.
          <Circle
            center={radius.at}
            radius={radius.meters ?? 5000}
            interactive={false}
            pathOptions={{
              color: TONE_COLOR[radius.tone] || TONE_COLOR.info,
              weight: 2,
              dashArray: "9 7",
              lineCap: "round",
              fillColor: TONE_COLOR[radius.tone] || TONE_COLOR.info,
              fillOpacity: 0.14,
            }}
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
        {markers.map((m) => {
          const tap = onMarkerClick ? () => onMarkerClick(m.id) : undefined;
          if (m.tone === "user") {
            return <Marker key={m.id} position={m.pos} icon={dotIcon} />;
          }
          if (m.label) {
            return (
              <Marker
                key={m.id}
                position={m.pos}
                icon={makeBadge(TONE_COLOR[m.tone] || TONE_COLOR.neutral, m.label, m.size ?? 44)}
                eventHandlers={tap ? { click: tap } : undefined}
                bubblingMouseEvents={false}
              />
            );
          }
          return (
            <CircleMarker
              key={m.id}
              center={m.pos}
              radius={m.size ? m.size / 2 : 8}
              pathOptions={{
                color: "var(--color-surface)",
                weight: 2.5,
                fillColor: TONE_COLOR[m.tone] || TONE_COLOR.neutral,
                fillOpacity: 0.95,
              }}
              eventHandlers={tap ? { click: tap } : undefined}
              bubblingMouseEvents={false}
            />
          );
        })}
        {pin && (
          <Marker
            position={pin.pos}
            draggable={!!interactive}
            icon={pinIcon}
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
