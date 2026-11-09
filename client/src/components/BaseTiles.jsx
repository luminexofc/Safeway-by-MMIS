import { useRef, useState } from "react";
import { TileLayer } from "react-leaflet";

// CARTO's keyless basemaps now answer with "API KEY REQUIRED" placeholder
// images (HTTP 200, so Leaflet cannot detect them), and the OSM tile server
// occasionally blocks clients. Use genuinely keyless providers and fall
// through the list on tile errors instead of leaving a blank map.
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ESRI_ATTR =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

const PROVIDERS = [
  { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: OSM_ATTR },
  {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: ESRI_ATTR,
  },
  { url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", attribution: OSM_ATTR },
];

export default function BaseTiles({ onFailed }) {
  const [idx, setIdx] = useState(0);
  const dead = useRef(new Set());

  const handleError = () => {
    if (dead.current.has(idx)) return;
    dead.current.add(idx);
    if (idx < PROVIDERS.length - 1) setIdx(idx + 1);
    else onFailed?.(true);
  };

  const provider = PROVIDERS[idx];
  return (
    <TileLayer
      key={idx}
      url={provider.url}
      attribution={provider.attribution}
      eventHandlers={{ tileerror: handleError }}
    />
  );
}
