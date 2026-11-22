import { AppwriteException, Client, ID, Permission, Query, Role, TablesDB, Teams } from "node-appwrite";
import { resolveCaller, unauthorized } from "./caller.js";

const OPERATORS_TEAM = "operators";

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";

const AUDIT_READ = [Permission.read(Role.team(OPERATORS_TEAM))];

// `audit_events.action` is a closed enum in the live schema:
//   (submitted, verified, discarded, flagged_abuse, notify)
// Anything else is rejected, and the failure would land *after* the change it
// describes — so a mutation would succeed while its log entry vanished. Keep
// `action` to a permitted category and put the real verb in `meta`; the
// console renders that verb, so the log still reads "Deleted".
const AUDIT_ACTION = "discarded";

// A Deleted report must stay in the log and stay readable by operators and by
// the person who filed it, while disappearing from the public map. `status` is
// a closed enum too, so "deleted" cannot be stored there. Instead the row
// loses its public read permission: Appwrite itself then refuses to return it
// to any anonymous or non-owner reader, which is enforced by the platform
// rather than by a filter any client could skip.
export function deletedPermissions(report) {
  const permissions = [
    Permission.read(Role.team(OPERATORS_TEAM)),
    Permission.update(Role.team(OPERATORS_TEAM)),
  ];
  // The reporter keeps sight of their own report, so it can be labelled as
  // removed in their list instead of silently disappearing.
  if (report.reporterId) permissions.push(Permission.read(Role.user(report.reporterId)));
  return permissions;
}

// True when a row is no longer publicly readable, i.e. soft-deleted.
// Rows filed by submit-report grant read("any"); the demo seed grants
// read("users"). Anything holding neither is not for the public map.
export function isSoftDeleted(row) {
  const perms = row?.$permissions;
  if (!Array.isArray(perms)) return false;
  return !perms.some((p) => p === 'read("any")' || p === 'read("users")');
}

// Soft delete: hide from the public, keep everything else. Photos are retained
// because the report is still part of the operator record, and destroying the
// evidence behind a decision is worse than storing it.
export async function softDeleteReport(db, report, { actorId, now = new Date().toISOString() } = {}) {
  const updated = await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: REPORTS,
    rowId: report.$id,
    // What was reported must stay accurate; only the audience changes.
    data: { deletedAt: now },
    permissions: deletedPermissions(report),
  }).catch(async (e) => {
    // `deletedAt` does not exist yet (schema migration pending). The hide is
    // what matters, so retry without the optional timestamp.
    if (!(e instanceof AppwriteException) || e.type !== "row_invalid_structure") throw e;
    return db.updateRow({
      databaseId: DATABASE_ID,
      tableId: REPORTS,
      rowId: report.$id,
      data: {},
      permissions: deletedPermissions(report),
    });
  });

  await db.createRow({
    databaseId: DATABASE_ID,
    tableId: AUDIT,
    rowId: ID.unique(),
    data: {
      reportId: report.$id,
      actorId: actorId ?? "unknown",
      action: AUDIT_ACTION,
      meta: "deleted",
    },
    permissions: AUDIT_READ,
  });

  return updated;
}

function serverClient() {
  const key = process.env.SERVER_API_KEY || process.env.APPWRITE_API_KEY;
  if (!key) return null;
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(key);
}

export async function deleteSubmission({ req, res, reportId, log, error }, dependencies = {}) {
  const client = dependencies.clientFactory?.() ?? serverClient();
  if (!client) return res.json({ error: "Deletion is not configured on the server yet." }, 500);
  const caller = dependencies.callerResolver
    ? await dependencies.callerResolver(req)
    : await resolveCaller(req, { clientFactory: () => client, accountFactory: dependencies.accountFactory });
  if (!caller.userId) return unauthorized(res, caller.reason);
  if (!reportId || reportId.length > 64) return res.json({ error: "reportId required." }, 400);

  const teams = (dependencies.teamsFactory ?? ((c) => new Teams(c)))(client);
  const db = (dependencies.dbFactory ?? ((c) => new TablesDB(c)))(client);

  try {
    const memberships = await teams.listMemberships({
      teamId: OPERATORS_TEAM,
      queries: [Query.equal("userId", caller.userId), Query.equal("confirm", true)],
      total: false,
    });
    if (!memberships.memberships.length) return res.json({ error: "Operator access only." }, 403);

    const report = await db.getRow({ databaseId: DATABASE_ID, tableId: REPORTS, rowId: reportId });
    if (isSoftDeleted(report)) {
      return res.json({ deleted: reportId, alreadyDeleted: true });
    }
    await softDeleteReport(db, report, { actorId: caller.userId });
    log?.(`report ${reportId} soft-deleted by operator ${caller.userId}`);
    return res.json({ deleted: reportId, soft: true });
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) {
      return res.json({ error: "Report not found." }, 404);
    }
    (error ?? dependencies.error ?? (() => {}))(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
    return res.json({ error: "Could not delete the report. Please try again." }, 500);
  }
}
