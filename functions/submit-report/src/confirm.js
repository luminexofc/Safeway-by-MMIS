import { ID, Permission, Role } from "node-appwrite";
import { canConfirm, expiryFor, ttlFor, HOUR } from "./freshness.js";

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";
const OPERATORS_TEAM = "operators";
const AUDIT_READ = [Permission.read(Role.team(OPERATORS_TEAM))];

// A timer cannot know that a protest packed up an hour early or that the water
// is still there at midnight. Someone standing at the spot can. Extending is
// the only signal that tracks reality without a camera on every corner.
//
// The reporter who filed it may not extend it: self-confirmation is exactly the
// behaviour that let one stale report live for months. Independent eyes only,
// the same principle cluster.js uses to publish without an operator.
export async function confirmReport(db, { reportId, userId }) {
  const report = await db.getRow({ databaseId: DATABASE_ID, tableId: REPORTS, rowId: reportId });

  if (report.status !== "pending" && report.status !== "verified") {
    return { error: `Report is not active (${report.status}).`, status: 409 };
  }
  if (report.reporterId === userId) {
    return {
      error: "Someone else at the location has to confirm it. You cannot extend your own report.",
      status: 403,
    };
  }

  const now = Date.now();
  if (!canConfirm(report, now)) {
    return { error: "This report has expired. File a new one if it is happening again.", status: 409 };
  }

  // Extend from now, not from the old expiry: an early confirmation must not
  // shorten the window, and a late one must not inherit a stale baseline.
  const category = report.category ?? null;
  const expiresAt = expiryFor(category, now);

  const updated = await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: REPORTS,
    rowId: reportId,
    data: { expiresAt, lastConfirmedAt: new Date(now).toISOString() },
  });

  await db.createRow({
    databaseId: DATABASE_ID,
    tableId: AUDIT,
    rowId: ID.unique(),
    data: {
      reportId,
      actorId: userId,
      // `action` is a closed enum in the live schema, so this is stored as a
      // permitted category with the real verb in `meta`; "confirmed" would be
      // rejected and the confirmation would vanish from the log.
      action: "notify",
      meta: `confirmed;ttl:${Math.round(ttlFor(category) / HOUR)}h`,
    },
    permissions: AUDIT_READ,
  }).catch(() => {});

  return { reportId, expiresAt, status: updated.status };
}
