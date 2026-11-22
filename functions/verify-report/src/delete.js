import { AppwriteException, Client, Query, Storage, TablesDB, Teams } from "node-appwrite";
import { resolveCaller, unauthorized } from "./caller.js";

const OPERATORS_TEAM = "operators";
const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";
const BUCKET = "report-photos";

// Missing resources are success on a retry after a partial deletion.
const deleteRow = (db, tableId, rowId) =>
  db.deleteRow({ databaseId: DATABASE_ID, tableId, rowId }).catch((e) => {
    if (e instanceof AppwriteException && e.code === 404) return;
    throw e;
  });

const deleteFile = (storage, fileId) =>
  storage.deleteFile({ bucketId: BUCKET, fileId }).catch((e) => {
    if (e instanceof AppwriteException && e.code === 404) return;
    throw e;
  });

// Photos first, then all report-related audit pages, and finally the row.
export async function deleteReport(db, storage, report) {
  for (const fileId of report.imageFileIds ?? []) {
    await deleteFile(storage, fileId);
  }
  for (;;) {
    const found = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: AUDIT,
      queries: [Query.equal("reportId", report.$id), Query.limit(100)],
      total: false,
    });
    if (!found.rows.length) break;
    for (const row of found.rows) await deleteRow(db, AUDIT, row.$id);
  }
  await deleteRow(db, REPORTS, report.$id);
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
  // The privileged server client is never used as the caller's JWT client.
  const caller = dependencies.callerResolver
    ? await dependencies.callerResolver(req)
    : await resolveCaller(req, {
        clientFactory: dependencies.callerClientFactory,
        accountFactory: dependencies.accountFactory,
      });
  if (!caller.userId) return unauthorized(res, caller.reason);
  if (!reportId || reportId.length > 64) return res.json({ error: "reportId required." }, 400);

  const teams = (dependencies.teamsFactory ?? ((c) => new Teams(c)))(client);
  const db = (dependencies.dbFactory ?? ((c) => new TablesDB(c)))(client);
  const storage = (dependencies.storageFactory ?? ((c) => new Storage(c)))(client);

  try {
    const memberships = await teams.listMemberships({
      teamId: OPERATORS_TEAM,
      queries: [Query.equal("userId", caller.userId), Query.equal("confirm", true)],
      total: false,
    });
    if (!memberships.memberships.length) return res.json({ error: "Operator access only." }, 403);

    const report = await db.getRow({ databaseId: DATABASE_ID, tableId: REPORTS, rowId: reportId });
    await deleteReport(db, storage, report);
    log?.(`report ${reportId} deleted by operator ${caller.userId}`);
    return res.json({ deleted: reportId }, 200);
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) {
      return res.json({ error: "Report not found." }, 404);
    }
    (error ?? dependencies.error ?? (() => {}))(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
    return res.json({ error: "Could not delete the report. Please try again." }, 500);
  }
}
