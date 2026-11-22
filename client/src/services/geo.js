import { useCallback, useEffect, useRef, useState } from "react";

// Live geo services for the public app. No API keys needed:
// - Geocoding: OpenStreetMap Nominatim (biased to Bangladesh)
// - Routing: OSRM public demo server (driving profile)
// - Position: browser Geolocation API
// Waterlogging marker data comes from the Safeway backend (map-feed function).
// See README.

const BD_VIEWBOX = "88.0,20.5,92.7,26.7"; // lng-top, lat-top, lng-bottom, lat-bottom
export const COUNTRY_CENTER = [23.685, 90.3563];
export const COUNTRY_FALLBACK = { lat: COUNTRY_CENTER[0], lng: COUNTRY_CENTER[1], label: "Bangladesh" };

// The 8 divisions, keyed by the slug the backend stores.
export const BD_DIVISIONS = [
  { slug: "dhaka", name: "Dhaka" },
  { slug: "chattogram", name: "Chattogram" },
  { slug: "khulna", name: "Khulna" },
  { slug: "rajshahi", name: "Rajshahi" },
  { slug: "barishal", name: "Barishal" },
  { slug: "sylhet", name: "Sylhet" },
  { slug: "rangpur", name: "Rangpur" },
  { slug: "mymensingh", name: "Mymensingh" },
];

// Nominatim returns e.g. "Dhaka Division"; map back to our slugs, else "unknown".
export function normalizeDivision(raw) {
  if (!raw) return "unknown";
  const bare = String(raw).toLowerCase().replace(/\s*division$/i, "").trim();
  const hit = BD_DIVISIONS.find((d) => d.slug === bare || d.name.toLowerCase() === bare);
  return hit ? hit.slug : "unknown";
}

// Shorten a Nominatim display name to its first three parts for dropdown rows.
export function formatPlaceLabel(displayName, fallback = "") {
  if (!displayName) return fallback;
  return displayName
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

// Message for a point the user left empty. Kept here so the wording is
// tested in one place instead of living inside the form component.
export function emptyPointMessage(field) {
  return `Type a ${field}.`;
}

// Nominatim returns place names in the language asked for. Reading the same
// stored preference the UI uses keeps search results in the UI's language too.
// Read defensively so this module still loads under `node --test`.
function currentLang() {
  try {
    return globalThis.localStorage?.getItem("lang") === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
}

export async function geocode(query, limit = 5, lang = currentLang()) {
  const q = query.trim();
  if (!q) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}` +
    `&countrycodes=bd&viewbox=${BD_VIEWBOX}&addressdetails=1&accept-language=${lang}` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = await res.json();
  // Nominatim can return an entry whose coordinates do not parse. Dropping
  // those here keeps every caller from having to guard against NaN.
  return (Array.isArray(data) ? data : [])
    .map((d) => ({
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      label: formatPlaceLabel(d.display_name, q),
      full: d.display_name || q,
    }))
    .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng));
}

async function fetchReverseAddress(lat, lng, lang = currentLang()) {
  const url =
    // zoom 18 resolves the individual street/building; 14 only resolved the
    // suburb, which is why labels named a neighbourhood instead of the road.
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}` +
    `&zoom=18&addressdetails=1&accept-language=${lang}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
  return res.json();
}

// Full address for form submission: label + division slug + district.
export async function reverseGeocodeAddress(lat, lng, lang = currentLang()) {
  const d = await fetchReverseAddress(lat, lng, lang);
  const a = d.address || {};
  // Prefer the most specific feature available. A road name locates a point
  // far better than the suburb it sits in.
  const place =
    a.road || a.pedestrian || a.footway || a.path || a.residential || a.neighbourhood ||
    a.quarter || a.suburb || a.village || a.hamlet || a.town || a.city || a.county || a.state || "";
  const houseNumber = a.house_number ? `${a.house_number} ` : "";
  const city = a.city || a.town || a.village || a.county || a.state || "Bangladesh";
  const district = (a.county || a.state_district || a.city_district || "").replace(/\s*district$/i, "").trim();
  return {
    // Six decimals is ~11 cm; four was ~11 m and rounded marks off their road.
    label: place
      ? `${houseNumber}${place}, ${city}`
      : city || d.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    division: normalizeDivision(a.state || a.region || a.county),
    district: district || undefined,
  };
}

export async function reverseGeocode(lat, lng) {
  const { label } = await reverseGeocodeAddress(lat, lng);
  return label;
}

// Distance from point p [lat, lng] to line segment a-b [lat, lng] in meters
export function distToSegmentMeters(p, a, b) {
  const x = (p[1] - a[1]) * 101600;
  const y = (p[0] - a[0]) * 110800;
  const dx = (b[1] - a[1]) * 101600;
  const dy = (b[0] - a[0]) * 110800;

  const dot = x * dx + y * dy;
  const lenSq = dx * dx + dy * dy;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = 0; yy = 0;
  } else if (param > 1) {
    xx = dx; yy = dy;
  } else {
    xx = param * dx;
    yy = param * dy;
  }

  const ddx = x - xx;
  const ddy = y - yy;
  return Math.sqrt(ddx * ddx + ddy * ddy);
}

export function distMeters(p1, p2) {
  const dLat = (p2[0] - p1[0]) * 110800;
  const dLng = (p2[1] - p1[1]) * 101600;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

export function parseReportSegment(r) {
  if (!r?.note) return null;
  const m = r.note.match(/Segment:\s*\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)\s*->\s*\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/i);
  if (!m) return null;
  return {
    start: [parseFloat(m[1]), parseFloat(m[2])],
    end: [parseFloat(m[3]), parseFloat(m[4])],
  };
}

// A report may move a route only once an operator has verified it, and only
// when it actually closes the road. Pending reports are one person's claim;
// routing around them would let any account redirect traffic, which is the
// opposite of what the product promises. Both the dashboard and the route
// planner ask this one question so the rule cannot drift between them again.
export function isRouteBlockade(report) {
  if (!report) return false;
  if (report.status !== "verified") return false;
  return report.depth === "road_closed";
}

export function routeHitsBlockade(coords, report, geomCoords) {
  if (geomCoords && geomCoords.length > 1) {
    for (let i = 0; i < geomCoords.length - 1; i++) {
      const segA = geomCoords[i];
      const segB = geomCoords[i + 1];
      if (coords.some((p) => distToSegmentMeters(p, segA, segB) < 120)) {
        return true;
      }
    }
    return false;
  }
  const seg = report.segment || parseReportSegment(report);
  if (seg) {
    return coords.some((p) => distToSegmentMeters(p, seg.start, seg.end) < 120);
  }
  return coords.some((p) => distMeters(p, [report.lat, report.lng]) < 120);
}

// OSRM routing with intelligent water blockade avoidance
export async function fetchRouteWithDetour(mode = "drive", from, to, blockades = [], segmentGeoms = {}, signal) {
  const a = Array.isArray(from) ? from : [from.lat, from.lng];
  const b = Array.isArray(to) ? to : [to.lat, to.lng];
  const profile = mode === "walk" ? "routed-foot" : mode === "bike" ? "routed-bike" : "routed-car";

  const primaryUrl =
    `https://routing.openstreetmap.de/${profile}/route/v1/driving/` +
    `${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson&alternatives=3`;

  let json;
  try {
    const res = await fetch(primaryUrl, { signal });
    // A 429/500 still resolves, so without this check the fallback below is
    // skipped and the user is told no road exists between two real places.
    if (!res.ok) throw new Error(`Routing failed (${res.status})`);
    json = await res.json();
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    // Fallback to project-osrm router if routing.openstreetmap.de is unreachable
    const fbUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${a[1]},${a[0]};${b[1]},${b[0]}?overview=full&geometries=geojson&alternatives=3`;
    const res = await fetch(fbUrl, { signal });
    if (!res.ok) throw new Error(`Routing failed (${res.status})`);
    json = await res.json();
  }

  if (!json?.routes?.length) throw new Error("No route found between these points.");

  const directRaw = json.routes[0];
  const directRoute = {
    id: "route-direct",
    coords: directRaw.geometry.coordinates.map(([x, y]) => [y, x]),
    distance: directRaw.distance,
    distanceKm: directRaw.distance / 1000,
    duration: directRaw.duration,
    timeMin: Math.max(1, Math.round(directRaw.duration / 60)),
  };

  // Check if direct route collides with any water blockade
  let hitBlockade = null;
  for (const bl of blockades) {
    if (routeHitsBlockade(directRoute.coords, bl, segmentGeoms[bl.id]?.coords)) {
      hitBlockade = bl;
      break;
    }
  }

  // If direct route is clear, return directly
  if (!hitBlockade) {
    return { primary: directRoute, alt: null, hitBlockade: null };
  }

  // Check if any standard OSRM alternative is already clear
  for (let i = 1; i < (json.routes || []).length; i++) {
    const rRaw = json.routes[i];
    const coords = rRaw.geometry.coordinates.map(([x, y]) => [y, x]);
    const hitsAny = blockades.some((bl) => routeHitsBlockade(coords, bl, segmentGeoms[bl.id]?.coords));
    if (!hitsAny) {
      return {
        primary: directRoute,
        alt: {
          id: `route-alt-${i}`,
          coords,
          distance: rRaw.distance,
          distanceKm: rRaw.distance / 1000,
          duration: rRaw.duration,
          timeMin: Math.max(1, Math.round(rRaw.duration / 60)),
        },
        hitBlockade,
      };
    }
  }

  // Compute lateral detour waypoints around the blockade
  const segStart = hitBlockade.segment ? hitBlockade.segment.start : [hitBlockade.lat, hitBlockade.lng];
  const segEnd = hitBlockade.segment ? hitBlockade.segment.end : [hitBlockade.lat, hitBlockade.lng];
  const midLat = (segStart[0] + segEnd[0]) / 2;
  const midLng = (segStart[1] + segEnd[1]) / 2;

  const dx = (segEnd[1] - segStart[1]) * 101600;
  const dy = (segEnd[0] - segStart[0]) * 110800;
  const len = Math.hypot(dx, dy) || 1;
  const nx = len > 1 ? -dy / len : 0;
  const ny = len > 1 ? dx / len : 1;

  const offsets = [550, -550, 900, -900, 1400, -1400];
  const validAlts = [];

  for (const off of offsets) {
    const wp = [midLat + (off * ny) / 110800, midLng + (off * nx) / 101600];
    try {
      const wpUrl =
        `https://routing.openstreetmap.de/${profile}/route/v1/driving/` +
        `${a[1]},${a[0]};${wp[1]},${wp[0]};${b[1]},${b[0]}?overview=full&geometries=geojson`;
      const r = await (await fetch(wpUrl, { signal })).json();
      if (r.code === "Ok" && r.routes?.length) {
        const route = r.routes[0];
        const c = route.geometry.coordinates.map(([x, y]) => [y, x]);
        const hitsAny = blockades.some((bl) => routeHitsBlockade(c, bl, segmentGeoms[bl.id]?.coords));
        if (!hitsAny) {
          validAlts.push({
            id: `route-detour-${off}`,
            coords: c,
            distance: route.distance,
            distanceKm: route.distance / 1000,
            duration: route.duration,
            timeMin: Math.max(1, Math.round(route.duration / 60)),
          });
        }
      }
    } catch {}
  }

  validAlts.sort((x, y) => x.duration - y.duration);
  return {
    primary: directRoute,
    alt: validAlts[0] || null,
    hitBlockade,
  };
}

// overview=full keeps the real road geometry instead of a simplified polyline,
// so the drawn line follows the road. Only documented OSRM parameters belong
// here: an unknown one makes the router answer 400 and every route fails.
const routeUrl = (base, points, { alternatives = 2 } = {}) => {
  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(";");
  return (
    `${base}${coords}?overview=full&geometries=geojson&steps=false` +
    (alternatives > 0 ? `&alternatives=${alternatives}` : "")
  );
};

// OSRM returns [lng,lat] pairs. Convert to Leaflet [lat,lng].
export async function fetchRoutes(from, to, { mode = "drive", signal } = {}) {
  const profile = mode === "walk" ? "routed-foot" : mode === "bike" ? "routed-bike" : "routed-car";
  const primary = `https://routing.openstreetmap.de/${profile}/route/v1/driving/`;
  const fallback = "https://router.project-osrm.org/route/v1/driving/";

  const get = async (base) => {
    const res = await fetch(routeUrl(base, [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ], { alternatives: 2 }), { signal });
    if (!res.ok) throw new Error(`Routing failed (${res.status})`);
    return res.json();
  };

  let data;
  try {
    data = await get(primary);
    // The OSM.de profiles answer 400 for foot/bike in some regions.
    if (data?.code !== "Ok") data = await get(fallback);
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    data = await get(fallback);
  }

  if (data?.code !== "Ok" || !data.routes?.length) {
    throw new Error("No route found between those points.");
  }

  return data.routes.slice(0, 2).map((r, i) => ({
    id: `live-${i}`,
    // Keep full precision; rounding here shows as a line that cuts corners.
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: r.distance / 1000,
    timeMin: Math.max(1, Math.round(r.duration / 60)),
  }));
}

// A snap that moves the pin further than this is rejected as a different place.
const SNAP_RADIUS_M = 300;

// Nearest point on the road network to a coordinate, using OSRM's nearest
// service. Snapping a dropped pin to the realistic road position is what makes
// a mark land on the street instead of on the building beside it.
export async function snapToRoad(point, { signal } = {}) {
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  try {
    const res = await fetch(
      `https://routing.openstreetmap.de/routed-car/nearest/v1/driving/${lng},${lat}?number=1`,
      { signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data?.waypoints?.[0]?.location;
    if (!loc) return null;
    const distance = data.waypoints[0].distance;
    // Snap too far and it is a different place, not a correction.
    if (Number.isFinite(distance) && distance > SNAP_RADIUS_M) return null;
    return { lat: loc[1], lng: loc[0], distance };
  } catch {
    return null;
  }
}

// Geolocation, tuned for precision.
//
// A single getCurrentPosition() returns whatever the device has cached and,
// with high accuracy off, commonly a wifi/cell fix good to 300-2000 m. That is
// the difference between marking a road and marking the next neighbourhood.
// Instead:
//   - ask for high accuracy (real GNSS, not a coarse network fix);
//   - allow no cached position (maximumAge 0) so the fix is current;
//   - watch for a short window and keep the *best* accuracy seen, because the
//     first fix is usually coarse and improves within a second or two.
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
};

// How long to keep listening for a better fix after the first one arrives.
const REFINE_MS = 8000;

export function useGeolocation(auto = false, { refineMs = REFINE_MS } = {}) {
  const [pos, setPos] = useState(null); // {lat,lng,accuracy}
  const [status, setStatus] = useState("idle"); // idle|locating|ok|denied|unsupported|error
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const bestRef = useRef(null);
  const watchRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // StrictMode runs an effect setup/cleanup/setup cycle in development.
    // Restore the flag on setup so geolocation callbacks aren't discarded.
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    if (watchRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("Geolocation is not supported in this browser.");
      return;
    }
    stop();
    bestRef.current = null;
    setStatus("locating");
    setError("");

    const accept = (p) => {
      if (!mounted.current) return;
      const next = {
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : null,
        heading: Number.isFinite(p.coords.heading) ? p.coords.heading : null,
        speed: Number.isFinite(p.coords.speed) ? p.coords.speed : null,
        at: p.timestamp,
      };
      // Keep the tightest fix; a later, coarser reading must not replace it.
      const best = bestRef.current;
      if (!best || (next.accuracy ?? Infinity) < (best.accuracy ?? Infinity)) {
        bestRef.current = next;
        setPos(next);
        setStatus("ok");
      }
    };

    const fail = (e) => {
      if (!mounted.current) return;
      // A failure after a good fix keeps that fix.
      if (bestRef.current) return;
      setStatus(e.code === e.PERMISSION_DENIED ? "denied" : "error");
      setError(
        e.code === e.PERMISSION_DENIED
          ? "Location permission denied. Search any address instead."
          : "Your location is unavailable. Search any address instead."
      );
    };

    // One immediate reading, then refine for a few seconds.
    navigator.geolocation.getCurrentPosition(accept, fail, GEO_OPTIONS);
    watchRef.current = navigator.geolocation.watchPosition(accept, fail, GEO_OPTIONS);
    timerRef.current = setTimeout(() => {
      stop();
    }, refineMs);
  }, [stop, refineMs]);

  useEffect(() => {
    if (auto) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  return { pos, status, error, locate, stop };
}

// Human-readable accuracy, so a coarse fix is never presented as exact.
// English stays the default so existing callers and tests are unchanged.
export function accuracyLabel(accuracy, lang = "en") {
  const bn = lang === "bn";
  if (!Number.isFinite(accuracy)) return bn ? "অজানা নির্ভুলতা" : "unknown accuracy";
  if (accuracy <= 10) {
    return bn ? `${Math.round(accuracy)} মিটারের মধ্যে` : `within ${Math.round(accuracy)} m`;
  }
  if (accuracy <= 50) {
    const m = Math.round(accuracy / 5) * 5;
    return bn ? `প্রায় ${m} মিটারের মধ্যে` : `within about ${m} m`;
  }
  if (accuracy <= 200) {
    const m = Math.round(accuracy / 50) * 50;
    return bn ? `মোটামুটি ${m} মিটারের মধ্যে` : `within roughly ${m} m`;
  }
  const m = Math.round(accuracy / 100) * 100;
  return bn ? `শুধুমাত্র প্রায় ${m} মিটারের মধ্যে` : `only within about ${m} m`;
}
