import { ID, Permission, Query, Role } from "node-appwrite";

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";
const OPERATORS_TEAM = "operators";
const AUDIT_READ = [Permission.read(Role.team(OPERATORS_TEAM))];

// Five different people reporting the same spot is evidence; one person
// repeating themselves is not. The variance of a claimed water depth is not
// what matters here — independent agreement is.
export const THRESHOLD = 5;
export const RADIUS_M = 150;

const EARTH_R = 6371000;
const ACTIVE = new Set(["pending", "verified"]);

// Great-circle distance in meters. Used instead of the flat approximation
// because this decides whether a report is published to every user.
export function metersBetween(aLat, aLng, bLat, bLng) {
  const toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad;
  const dLng = (bLng - aLng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Degree box that certainly contains the circle. Appwrite has no geo query,
// so this narrows the page and the exact check runs in metersBetween.
// 1.3 gives margin for the rounding of the degree-per-meter constant.
export function boundingBox(lat, lng, radiusM = RADIUS_M) {
  const dLat = ((radiusM * 1.3) / 111320);
  const cos = Math.max(0.01, Math.cos((lat * Math.PI) / 180));
  const dLng = (radiusM * 1.3) / (111320 * cos);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

// Rows in the same spot that count toward agreement. Only pending and
// verified reports count: discarded and flagged ones were rejected.
//
// `sinceMs` drops rows older than the window. Without it, a report filed
// months ago keeps voting forever, so one fresh report plus four ancient ones
// would publish a road as blocked today.
export function reportersNear(rows, lat, lng, radiusM = RADIUS_M, sinceMs = 0) {
  const seen = new Set();
  for (const row of rows) {
    if (!ACTIVE.has(row.status)) continue;
    if (!row.reporterId) continue;
    const created = row.$createdAt ? new Date(row.$createdAt).getTime() : NaN;
    if (Number.isFinite(created) && created < sinceMs) continue;
    const d = metersBetween(lat, lng, Number(row.lat), Number(row.lng));
    if (d <= radiusM) seen.add(row.reporterId);
  }
  return seen;
}

// How long independent reports keep counting as agreement. A waterlogged road
// dries out; a report from last monsoon says nothing about this one.
export const AGREEMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Called after a report is created. Returns the ids published, or [].
//
// Publishing is all-or-nothing per confirmed cluster: every pending report on
// the spot becomes verified together, so the map never shows a road as
// blocked for one reporter but pending for the next.
export async function autoVerifyCluster(db, { lat, lng, log }) {
  const box = boundingBox(lat, lng);
  const since = new Date(Date.now() - AGREEMENT_WINDOW_MS).toISOString();
  const page = await db.listRows({
    databaseId: DATABASE_ID,
    tableId: REPORTS,
    queries: [
      Query.between("lat", box.minLat, box.maxLat),
      Query.between("lng", box.minLng, box.maxLng),
      Query.greaterThan("$createdAt", since),
      Query.limit(100),
    ],
    total: false,
  }).catch(() => null);
  if (!page) return [];

  const reporters = reportersNear(page.rows, lat, lng, RADIUS_M, Date.now() - AGREEMENT_WINDOW_MS);
  if (reporters.size < THRESHOLD) return [];

  const pending = page.rows.filter(
    (r) => r.status === "pending" && metersBetween(lat, lng, Number(r.lat), Number(r.lng)) <= RADIUS_M,
  );
  if (!pending.length) return [];

  const now = new Date().toISOString();
  const published = [];
  for (const row of pending) {
    await db.updateRow({
      databaseId: DATABASE_ID,
      tableId: REPORTS,
      rowId: row.$id,
      data: { status: "verified", verifiedBy: "auto:quorum", verifiedAt: now },
    });
    await db.createRow({
      databaseId: DATABASE_ID,
      tableId: AUDIT,
      rowId: ID.unique(),
      data: {
        reportId: row.$id,
        actorId: "auto:quorum",
        // `action` is a closed enum in the live schema; "auto_verified" was
        // rejected and the swallowed error meant auto-publishing was never
        // recorded in the ops log. Keep the category, name the verb in meta.
        action: "verified",
        meta: `auto_verified;reporters:${reporters.size}`,
      },
      permissions: AUDIT_READ,
    }).catch(() => {});
    published.push(row.$id);
  }

  log(`auto-verified ${published.length} report(s): ${reporters.size} reporters agreed`);
  return published;
}
