// How long an occurrence stays on the map.
//
// TWIN FILE: functions/submit-report/src/freshness.js holds the same constants
// server-side. The client cannot import from the deployed function bundle, and
// shared/ is served to both apps but not to the functions, so the values live
// in both places. Change them together.

export const HOUR = 60 * 60 * 1000;

export const TTL_MS = {
  traffic_jam: 1 * HOUR,
  protest: 4 * HOUR,
  waterlogging: 12 * HOUR,
  road_hazard: 7 * 24 * HOUR,
};

export const DEFAULT_CATEGORY = "waterlogging";

const NOTE_TYPE = /\[Report Type:\s*([^\]]+)\]/i;

// The wizard writes "[Report Type: Traffic jam]" into the note. Rows filed
// before the category column existed only carry that, so read it back.
export function categoryFromNote(note) {
  const m = typeof note === "string" ? note.match(NOTE_TYPE) : null;
  if (!m) return null;
  const label = m[1].trim().toLowerCase();
  if (label.includes("traffic")) return "traffic_jam";
  if (label.includes("protest") || label.includes("rally")) return "protest";
  if (label.includes("hazard") || label.includes("pothole")) return "road_hazard";
  if (label.includes("water") || label.includes("flood")) return "waterlogging";
  return null;
}

export function categoryOf(row) {
  if (row?.category && TTL_MS[row.category]) return row.category;
  return categoryFromNote(row?.note) ?? DEFAULT_CATEGORY;
}

export function ttlFor(category) {
  return TTL_MS[category] ?? TTL_MS[DEFAULT_CATEGORY];
}

// When this row stops being shown, as milliseconds since epoch.
//
// A stored expiry is authoritative: the server sets it and confirmations move
// it. Without one (rows filed before the column existed) the lifetime is
// derived from when it was filed, so an occurrence from last month cannot sit
// on the map waiting for a migration to notice it.
export function expiryTimeOf(row) {
  if (row?.expiresAt) {
    const t = new Date(row.expiresAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  const created = row?.$createdAt ? new Date(row.$createdAt).getTime() : NaN;
  if (!Number.isFinite(created)) return null;
  return created + ttlFor(categoryOf(row));
}

export function isLive(row, now = Date.now()) {
  // Decided reports are handled by status, not by time.
  if (row?.status === "discarded" || row?.status === "flagged_abuse") return false;
  const exp = expiryTimeOf(row);
  return exp === null || exp > now;
}
