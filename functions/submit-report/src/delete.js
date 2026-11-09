import {
  AppwriteException,
  Query,
  Storage,
  TablesDB,
  Users,
} from "node-appwrite";

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";
const PROFILES = "profiles";
const BUCKET = "report-photos";

const json = (res, body, status = 200) => res.json(body, status);

// Rows may already be gone on a retry; a missing row is success.
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

// Photos first (privacy), then the audit trail, then the row itself. If a
// step fails the row survives, so the caller can retry and nothing is orphaned.
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

// Photos uploaded for a report that failed to submit are never referenced by
// a row, but still carry the uploader's read permission. Collect first, then
// delete, so offsets stay stable while paging.
async function deleteOrphanFiles(storage, userId) {
  const owned = [];
  for (let offset = 0; ; offset += 100) {
    const page = await storage.listFiles({
      bucketId: BUCKET,
      queries: [Query.limit(100), Query.offset(offset)],
      total: false,
    });
    owned.push(...page.files.filter((f) => f.$permissions.includes(`read("user:${userId}")`)));
    if (page.files.length < 100) break;
  }
  for (const file of owned) await deleteFile(storage, file.$id);
  return owned.length;
}

export async function deleteAccount(db, storage, users, userId) {
  // Deleting as we page keeps the query stable: always read the first page
  // until it comes back empty.
  let reports = 0;
  for (;;) {
    const page = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: REPORTS,
      queries: [Query.equal("reporterId", userId), Query.limit(100)],
      total: false,
    });
    if (!page.rows.length) break;
    for (const report of page.rows) {
      await deleteReport(db, storage, report);
      reports += 1;
    }
  }
  const files = await deleteOrphanFiles(storage, userId);

  // Operator decisions and notifications the user caused.
  for (;;) {
    const page = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: AUDIT,
      queries: [Query.equal("actorId", userId), Query.limit(100)],
      total: false,
    });
    if (!page.rows.length) break;
    for (const row of page.rows) await deleteRow(db, AUDIT, row.$id);
  }

  await deleteRow(db, PROFILES, userId);
  // Cascades sessions and team memberships. Missing user = retry after a
  // partial run, so that is success too.
  await users.delete({ userId }).catch((e) => {
    if (e instanceof AppwriteException && e.code === 404) return;
    throw e;
  });
  return { reports, files };
}

// Deletion is hosted in this function because the Appwrite plan allows two
// functions per project. The caller id comes from the platform, never the body.
export async function handleDeletion({ client, res, body, userId, log, error }) {
  const db = new TablesDB(client);
  const storage = new Storage(client);

  try {
    if (body.action === "report") {
      const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
      if (!reportId || reportId.length > 64) return json(res, { error: "reportId required." }, 400);

      const report = await db
        .getRow({ databaseId: DATABASE_ID, tableId: REPORTS, rowId: reportId })
        .catch((e) => {
          if (e instanceof AppwriteException && e.code === 404) return null;
          throw e;
        });
      if (!report) return json(res, { deleted: reportId });
      if (report.reporterId !== userId) {
        return json(res, { error: "You can only delete your own reports." }, 403);
      }

      await deleteReport(db, storage, report);
      log(`report ${reportId} deleted by ${userId}`);
      return json(res, { deleted: reportId });
    }

    if (body.action === "account") {
      if (body.confirm !== "DELETE") {
        return json(res, { error: "Type DELETE to confirm account deletion." }, 400);
      }
      const { reports, files } = await deleteAccount(db, storage, new Users(client), userId);
      log(`account ${userId} deleted with ${reports} report(s) and ${files} orphan file(s)`);
      return json(res, { deleted: userId, reports });
    }

    return json(res, { error: "action must be report or account." }, 400);
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) {
      return json(res, { error: "Report not found." }, 404);
    }
    error(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
    return json(res, { error: "Could not delete your data. Please try again." }, 500);
  }
}
