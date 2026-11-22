import {
  AppwriteException,
  Client,
  ID,
  Messaging,
  Permission,
  Query,
  Role,
  TablesDB,
  Teams,
} from "node-appwrite";
import { resolveCaller, unauthorized } from "./caller.js";
import { deleteSubmission } from "./delete.js";
import { expiryFor, resolveCategory } from "./freshness.js";

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";
const OPERATORS_TEAM = "operators";
const AUDIT_READ = [Permission.read(Role.team(OPERATORS_TEAM))];

// `audit_events.action` is a closed enum in the live schema:
//   (submitted, verified, discarded, flagged_abuse, notify)
// So `audit` is always one of those, and the real verb goes in `meta`. Writing
// an unknown action throws AFTER the report was already updated, which would
// tell the operator the change failed when it had in fact been applied.
const ACTIONS = {
  verify: { status: "verified", audit: "verified" },
  discard: { status: "discarded", audit: "discarded" },
  flag: { status: "flagged_abuse", audit: "flagged_abuse" },
  // Already handled: the occurrence is over. Cleared with an expiry rather
  // than a new status value, so history and the audit trail stay intact and
  // the map's one filter still governs what is shown.
  resolve: { status: null, audit: "discarded", meta: "resolved" },
};
const DEPTH_LABEL = { ankle: "ankle-deep", knee: "knee-deep", waist: "waist-deep", road_closed: "road closed" };

const json = (res, body, status = 200) => res.json(body, status);

function serverClient() {
  const key = process.env.SERVER_API_KEY || process.env.APPWRITE_API_KEY;
  if (!key) return null;
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(key);
}

async function isOperator(teams, userId) {
  const list = await teams.listMemberships({
    teamId: OPERATORS_TEAM,
    queries: [Query.equal("userId", userId), Query.equal("confirm", true)],
    total: false,
  });
  return list.memberships.length > 0;
}

export default async ({ req, res, log, error, dependencies }) => {
  let body = null;
  try {
    body = JSON.parse(req.body || "{}");
  } catch {
    return json(res, { error: "Body must be JSON." }, 400);
  }
  const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
  if (body.action === "delete") return deleteSubmission({ req, res, reportId, log, error }, dependencies);

  // Identity comes from the session JWT via the platform, never from a
  // self-reported header; the operator check below is only as good as it.
  const caller = await resolveCaller(req, dependencies);
  if (!caller.userId) return unauthorized(res, caller.reason);
  const userId = caller.userId;

  const action = ACTIONS[body.action];
  if (!reportId || reportId.length > 64) return json(res, { error: "reportId required." }, 400);
  if (!action) return json(res, { error: "action must be verify, discard, flag or resolve." }, 400);

  const client = dependencies?.clientFactory?.() ?? serverClient();
  if (!client) {
    error("SERVER_API_KEY function variable is not set; see README -> Appwrite setup");
    return json(res, { error: "Verification is not configured on the server yet." }, 500);
  }

  const teams = (dependencies?.teamsFactory ?? ((c) => new Teams(c)))(client);
  try {
    if (!(await isOperator(teams, userId))) {
      return json(res, { error: "Operator access only." }, 403);
    }
  } catch (e) {
    error(`membership check failed: ${e instanceof AppwriteException ? e.message : e}`);
    return json(res, { error: "Could not confirm operator access." }, 500);
  }

  const db = (dependencies?.dbFactory ?? ((c) => new TablesDB(c)))(client);
  try {
    const report = await db.getRow({ databaseId: DATABASE_ID, tableId: REPORTS, rowId: reportId });

    // Resolving is only meaningful for something currently on the map, so it
    // is allowed at any point in a report's life. The other three are one-shot
    // decisions on a pending report.
    const resolving = body.action === "resolve";
    if (resolving) {
      if (report.status !== "verified" && report.status !== "pending") {
        return json(res, { error: `Report is not active (${report.status}).` }, 409);
      }
    } else if (report.status !== "pending") {
      return json(res, { error: `Report already decided (${report.status}).` }, 409);
    }

    const now = new Date().toISOString();
    // Verifying a report that has no expiry (filed before the column existed,
    // or before the migration ran) must still put it on the map with an honest
    // lifetime — otherwise it would appear once and never leave, or never
    // appear at all. The clock starts when the operator says it is true.
    const verifiedExpiry =
      action.status === "verified" && !report.expiresAt
        ? expiryFor(resolveCategory(report.category, report.note))
        : undefined;

    const data = resolving
      ? // Clearing means "no longer true": the expiry drops it from the map
        // on the next read, wherever the reader is.
        { expiresAt: now, resolvedBy: userId, resolvedAt: now }
      : {
          status: action.status,
          verifiedBy: userId,
          ...(action.status === "verified" ? { verifiedAt: now } : {}),
          ...(verifiedExpiry ? { expiresAt: verifiedExpiry } : {}),
        };

    let updated;
    try {
      updated = await db.updateRow({ databaseId: DATABASE_ID, tableId: REPORTS, rowId: reportId, data });
    } catch (e) {
      // Verifying must not depend on the freshness migration having run.
      const onlyFreshness =
        e instanceof AppwriteException && e.type === "row_invalid_structure" && !resolving;
      if (!onlyFreshness) throw e;
      delete data.expiresAt;
      updated = await db.updateRow({ databaseId: DATABASE_ID, tableId: REPORTS, rowId: reportId, data });
    }

    await db.createRow({
      databaseId: DATABASE_ID,
      tableId: AUDIT,
      rowId: ID.unique(),
      data: {
        reportId,
        actorId: userId,
        action: action.audit,
        ...(action.meta ? { meta: action.meta } : {}),
      },
      // Ops log is operator-only; never leave it to a table default.
      permissions: AUDIT_READ,
    });

    // FCM fan-out to the division topic. Needs a messaging-permitted key;
    // absence degrades to a logged skip, never to a failed verification.
    if (action.status === "verified") {
      try {
        await new Messaging(client).createPush({
          messageId: ID.unique(),
          topics: [`division-${report.division}`],
          title: "Waterlogging verified",
          body: `${DEPTH_LABEL[report.depth] ?? report.depth} at ${report.placeLabel}. Avoid the route.`,
          data: { reportId, status: "verified" },
        });
        await db.createRow({
          databaseId: DATABASE_ID, tableId: AUDIT, rowId: ID.unique(),
          data: { reportId, actorId: userId, action: "notify", meta: `topic:division-${report.division}` },
          permissions: AUDIT_READ,
        });
      } catch (e) {
        const why = e instanceof AppwriteException ? `${e.code} ${e.message}` : String(e);
        log(`push skipped: ${why}`);
        await db.createRow({
          databaseId: DATABASE_ID, tableId: AUDIT, rowId: ID.unique(),
          data: { reportId, actorId: userId, action: "notify", meta: `skipped:${why.slice(0, 200)}` },
          permissions: AUDIT_READ,
        }).catch(() => {});
      }
    }

    log(`report ${reportId} -> ${resolving ? "resolved" : action.status} by ${userId}`);
    return json(res, { id: updated.$id, status: updated.status, expiresAt: updated.expiresAt });
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) {
      return json(res, { error: "Report not found." }, 404);
    }
    // Clearing writes expiresAt, so it needs the freshness columns. Verification
    // does not, and must keep working before the migration runs.
    if (e instanceof AppwriteException && e.type === "row_invalid_structure") {
      error("freshness columns missing; run scripts/migrate-freshness.mjs");
      return json(res, { error: "Clearing is not set up on the server yet." }, 503);
    }
    error(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
    return json(res, { error: "Could not update the report." }, 500);
  }
};
