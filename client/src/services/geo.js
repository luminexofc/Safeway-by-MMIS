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

export async function geocode(query, limit = 5) {
  const q = query.trim();
  if (!q) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}` +
    `&countrycodes=bd&viewbox=${BD_VIEWBOX}&addressdetails=1&accept-language=en` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((d) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    label: formatPlaceLabel(d.display_name, q),
    full: d.display_name || q,
  }));
}

async function fetchReverseAddress(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}` +
    `&zoom=14&addressdetails=1&accept-language=en`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
  return res.json();
}

// Full address for form submission: label + division slug + district.
export async function reverseGeocodeAddress(lat, lng) {
  const d = await fetchReverseAddress(lat, lng);
  const a = d.address || {};
  const place =
    a.road || a.suburb || a.neighbourhood || a.village || a.town || a.city || a.county || a.state || "";
  const city = a.city || a.town || a.village || a.county || a.state || "Bangladesh";
  const district = (a.county || a.state_district || a.city_district || "").replace(/\s*district$/i, "").trim();
  return {
    label: place ? `${place}, ${city}` : city || d.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    division: normalizeDivision(a.state || a.region || a.county),
    district: district || undefined,
  };
}

export async function reverseGeocode(lat, lng) {
  const { label } = await reverseGeocodeAddress(lat, lng);
  return label;
}

// OSRM returns [lng,lat] pairs. Convert to Leaflet [lat,lng].
export async function fetchRoutes(from, to) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson&alternatives=2&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing failed (${res.status})`);
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("No route found between those points.");
  return data.routes.slice(0, 2).map((r, i) => ({
    id: `live-${i}`,
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: r.distance / 1000,
    timeMin: Math.max(1, Math.round(r.duration / 60)),
  }));
}

export function useGeolocation(auto = false) {
  const [pos, setPos] = useState(null); // {lat,lng}
  const [status, setStatus] = useState("idle"); // idle|locating|ok|denied|unsupported|error
  const [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setStatus("locating");
    setError("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!mounted.current) return;
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setStatus("ok");
      },
      (e) => {
        if (!mounted.current) return;
        setStatus(e.code === e.PERMISSION_DENIED ? "denied" : "error");
        setError(
          e.code === e.PERMISSION_DENIED
            ? "Location permission denied. Search any address instead."
            : "Your location is unavailable. Search any address instead."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    if (auto) locate();
  }, [auto, locate]);

  return { pos, status, error, locate };
}
