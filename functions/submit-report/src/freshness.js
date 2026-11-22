// How long an occurrence stays true.
//
// A waterlogged road and a protest do not age at the same rate: the road dries
// out within a day, a rally is over in hours, a collapsed culvert stays for
// weeks. One global expiry would either hide real hazards or keep dead ones on
// the map, which is the bug this module exists to fix.
//
// TWIN FILE: functions/verify-report/src/freshness.js holds the same constants.
// The two functions deploy as separate bundles, so they cannot share a module.
// Change both together.

export const HOUR = 60 * 60 * 1000;

export const CATEGORIES = ["waterlogging", "traffic_jam", "protest", "road_hazard"];

// Balanced defaults. Tuned so a still-present occurrence is re-confirmed by
// someone who can see it (see CONFIRM), rather than lasting on the timer alone.
export const TTL_MS = {
  traffic_jam: 1 * HOUR,
  protest: 4 * HOUR,
  waterlogging: 12 * HOUR,
  road_hazard: 7 * 24 * HOUR,
};

// Reports filed before the category column existed have none. The site is
// waterlogging-first, so that is the honest default.
export const DEFAULT_CATEGORY = "waterlogging";

// An expired occurrence may be revived by someone standing at it, but only
// briefly. Without this window a five-month-old report could be re-armed and
// the original bug would come straight back.
export const REVIVE_WINDOW_MS = 2 * HOUR;

const NOTE_TYPE = /\[Report Type:\s*([^\]]+)\]/i;

// The wizard writes the type into the note as "[Report Type: Traffic jam]".
// Reading it back keeps old rows and any client that omits `category` working.
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

// Prefer the explicit field; fall back to the note the wizard writes.
export function resolveCategory(category, note) {
  if (CATEGORIES.includes(category)) return category;
  return categoryFromNote(note) ?? DEFAULT_CATEGORY;
}

export function ttlFor(category) {
  return TTL_MS[category] ?? TTL_MS[DEFAULT_CATEGORY];
}

// ISO timestamp at which `category` stops being shown on the map.
export function expiryFor(category, from = Date.now()) {
  return new Date(from + ttlFor(category)).toISOString();
}

// True while the occurrence is still shown. A row with no expiry predates the
// column; treat it as live so the backfill, not the map, decides its fate.
export function isLive(row, now = Date.now()) {
  if (!row?.expiresAt) return true;
  const t = new Date(row.expiresAt).getTime();
  return Number.isFinite(t) && t > now;
}

// A row may be re-confirmed while live, or revived just after expiring.
export function canConfirm(row, now = Date.now()) {
  const exp = row?.expiresAt ? new Date(row.expiresAt).getTime() : null;
  if (exp === null || !Number.isFinite(exp)) return true;
  return now - exp <= REVIVE_WINDOW_MS;
}
