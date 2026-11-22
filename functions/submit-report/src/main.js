import {
  AppwriteException,
  Client,
  ID,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
} from "node-appwrite";
import { handleDeletion } from "./delete.js";
import { autoVerifyCluster } from "./cluster.js";
import { resolveCaller, unauthorized } from "./caller.js";
import { expiryFor, resolveCategory } from "./freshness.js";
import { confirmReport } from "./confirm.js";
import { overSubmitLimit } from "./ratelimit.js";

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";
const BUCKET = "report-photos";
const OPERATORS_TEAM = "operators";
const AUDIT_READ = [Permission.read(Role.team(OPERATORS_TEAM))];

const DIVISIONS = new Set([
  "dhaka", "chattogram", "khulna", "rajshahi",
  "barishal", "sylhet", "rangpur", "mymensingh", "unknown",
]);
const DEPTHS = new Set(["ankle", "knee", "waist", "road_closed"]);
const HEX64 = /^[0-9a-f]{64}$/i;

// Submission ceiling per account. Five different roads in one hour is already
// an unusually active reporter; more than that is a script.
const json = (res, body, status = 200) => res.json(body, status);

function serverClient() {
  const key = process.env.SERVER_API_KEY || process.env.APPWRITE_API_KEY;
  if (!key) return null;
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(key);
}

// A signed-in user can only upload with their own read permission (sessions
// may only grant roles they hold, and reporters are not in the operators
// team). So the client uploads with read("user:<self>") and this function
// widens the file to operators server-side, after proving the caller owns
// the file. No mutation happens before every file is verified.
export async function tightenPhotoPermissions(storage, userId, fileIds) {
  const ownPerm = `read("user:${userId}")`;
  const verified = [];
  for (const fileId of fileIds) {
    const file = await storage.getFile({ bucketId: BUCKET, fileId }).catch((e) => {
      if (e instanceof AppwriteException && e.code === 404) return null;
      throw e;
    });
    if (!file) return "missing";
    if (!file.$permissions.includes(ownPerm)) return "foreign";
    verified.push({ fileId, name: file.name });
  }

  try {
    for (const { fileId, name } of verified) {
      await storage.updateFile({
        bucketId: BUCKET,
        fileId,
        name,
        // Operator read only, exactly as the README documents: the uploader
        // keeps their own read, and the review console (operators) gains one.
        // Widening to Role.users() would hand any signed-in account a photo
        // that may show a reporter's street, vehicle or face, and the report
        // row now publishes imageFileIds to everyone — so the id is not a
        // secret. The map never renders these photos outside the console.
        permissions: [
          Permission.read(Role.user(userId)),
          Permission.read(Role.team(OPERATORS_TEAM)),
        ],
      });
    }
  } catch (e) {
    // Tightening failed: remove the caller's uploads so nothing stays
    // readable by a wider audience than intended. Best effort.
    await Promise.allSettled(
      verified.map(({ fileId }) => storage.deleteFile({ bucketId: BUCKET, fileId }).catch(() => {})),
    );
    throw e;
  }
  return "ok";
}

export default async ({ req, res, log, error }) => {
  // Identity comes from the session JWT via the platform, never from a
  // self-reported header. Without it, nothing below may run.
  const caller = await resolveCaller(req);
  if (!caller.userId) return unauthorized(res, caller.reason);
  const userId = caller.userId;

  let body = null;
  try {
    body = JSON.parse(req.body || "{}");
  } catch {
    return json(res, { error: "Body must be JSON." }, 400);
  }

  // One function, several actions: the plan caps functions per project.
  if (body.action === "report" || body.action === "account") {
    const client = serverClient();
    if (!client) {
      error("SERVER_API_KEY function variable is not set; see README -> Appwrite setup");
      return json(res, { error: "Deletion is not configured on the server yet." }, 500);
    }
    return handleDeletion({ client, res, body, userId, log, error });
  }

  // "Still there?" — extends a live report so it stays on the map.
  if (body.action === "confirm") {
    const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
    if (!reportId || reportId.length > 64) return json(res, { error: "reportId required." }, 400);
    const client = serverClient();
    if (!client) {
      error("SERVER_API_KEY function variable is not set; see README -> Appwrite setup");
      return json(res, { error: "Confirmation is not configured on the server yet." }, 500);
    }
    try {
      const out = await confirmReport(new TablesDB(client), { reportId, userId });
      if (out.error) return json(res, { error: out.error }, out.status);
      log(`report ${reportId} confirmed by ${userId}, now expires ${out.expiresAt}`);
      return json(res, out);
    } catch (e) {
      if (e instanceof AppwriteException && e.code === 404) {
        return json(res, { error: "Report not found." }, 404);
      }
      // Before the schema migration there is nowhere to store an expiry, so
      // say so plainly instead of reporting a generic failure.
      if (e instanceof AppwriteException && e.type === "row_invalid_structure") {
        error("freshness columns missing; run scripts/migrate-freshness.mjs");
        return json(res, { error: "Confirmation is not set up on the server yet." }, 503);
      }
      error(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
      return json(res, { error: "Could not confirm the report." }, 500);
    }
  }

  const placeLabel = typeof body.placeLabel === "string" ? body.placeLabel.trim() : "";
  const division = typeof body.division === "string" ? body.division.trim().toLowerCase() : "";
  const district = typeof body.district === "string" && body.district.trim() ? body.district.trim().slice(0, 64) : undefined;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : undefined;
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const depth = typeof body.depth === "string" ? body.depth : "";
  const imageFileIds = Array.isArray(body.imageFileIds) ? body.imageFileIds.filter((f) => typeof f === "string").slice(0, 3) : undefined;
  const imageHash = typeof body.imageHash === "string" && HEX64.test(body.imageHash) ? body.imageHash.toLowerCase() : undefined;
  // What is happening decides how long it is true. Older clients send no
  // category, so the note the wizard writes is the fallback.
  const category = resolveCategory(body.category, note);

  if (placeLabel.length < 2 || placeLabel.length > 255) return json(res, { error: "placeLabel must be 2–255 characters." }, 400);
  if (!DIVISIONS.has(division)) return json(res, { error: "division must be one of the 8 divisions, or \"unknown\"." }, 400);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return json(res, { error: "lat out of range." }, 400);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return json(res, { error: "lng out of range." }, 400);
  if (!DEPTHS.has(depth)) return json(res, { error: "depth must be ankle, knee, waist or road_closed." }, 400);

  const client = serverClient();
  if (!client) {
    error("SERVER_API_KEY function variable is not set; see README -> Appwrite setup");
    return json(res, { error: "Reports are not configured on the server yet." }, 500);
  }
  const db = new TablesDB(client);

  // One account can otherwise call this in a loop: each call writes a row,
  // widens a photo, and may run the quorum check (itself a 100-row list).
  // Counting recent rows is the cheapest honest ceiling, and it also stops a
  // single account from steering the auto-verify quorum on its own.
  if (await overSubmitLimit(db, userId)) {
    log(`rate limited ${userId}: submit allowance used up`);
    return json(
      res,
      { error: "You have filed several reports in the last hour. Please wait a little before filing another." },
      429,
    );
  }

  // Photos arrive with only the uploader's read permission; widen them to
  // operators before the row references them.
  if (imageFileIds?.length) {
    const storage = new Storage(client);
    let check = "ok";
    try {
      check = await tightenPhotoPermissions(storage, userId, imageFileIds);
    } catch (e) {
      error(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
      return json(res, { error: "Could not file the report. Please retry." }, 500);
    }
    if (check === "missing") return json(res, { error: "A photo could not be found. Please upload it again." }, 400);
    if (check === "foreign") return json(res, { error: "You can only attach photos you uploaded." }, 403);
  }

  try {
    // Abuse telemetry, not an auto-block: identical photo seen before is logged.
    let hashSeen = false;
    if (imageHash) {
      const prior = await db.listRows({
        databaseId: DATABASE_ID,
        tableId: REPORTS,
        queries: [Query.equal("imageHash", imageHash), Query.limit(1)],
        total: true,
      }).catch(() => null);
      hashSeen = Boolean(prior && prior.total > 0);
    }

    // Freshness columns first; if the schema migration has not run yet the
    // write fails on an unknown attribute, so retry once without them. Filing
    // a report must never break because of a pending migration: the client
    // derives a lifetime from $createdAt and the note in the meantime.
    const baseData = {
      placeLabel,
      division,
      ...(district ? { district } : {}),
      lat,
      lng,
      depth,
      ...(note ? { note } : {}),
      status: "pending",
      reporterId: userId,
      ...(imageFileIds?.length ? { imageFileIds } : {}),
      ...(imageHash ? { imageHash } : {}),
    };
    const freshData = {
      ...baseData,
      category,
      // Set at birth so the map can filter without a scheduled sweep. A
      // still-present occurrence is extended by "still there?" confirmations.
      expiresAt: expiryFor(category),
    };

    let row;
    try {
      row = await db.createRow({
        databaseId: DATABASE_ID,
        tableId: REPORTS,
        rowId: ID.unique(),
        data: freshData,
        // Anyone, signed in or not, can read markers: the public map is
        // readable without an account. Only operators can change a report
        // after birth. reporterId stays an opaque id, and the reporter's
        // photo keeps its own per-file permissions (operators only).
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.team(OPERATORS_TEAM)),
        ],
      });
    } catch (e) {
      const structural = e instanceof AppwriteException && e.type === "row_invalid_structure";
      if (!structural) throw e;
      log("freshness columns missing; filing without expiresAt until the migration runs");
      row = await db.createRow({
        databaseId: DATABASE_ID,
        tableId: REPORTS,
        rowId: ID.unique(),
        data: baseData,
        permissions: [
          Permission.read(Role.any()),
          Permission.update(Role.team(OPERATORS_TEAM)),
        ],
      });
    }

    await db.createRow({
      databaseId: DATABASE_ID,
      tableId: AUDIT,
      rowId: ID.unique(),
      data: { reportId: row.$id, actorId: userId, action: "submitted", ...(hashSeen ? { meta: "image_hash_seen:true" } : {}) },
      // The ops log is an operator artifact; never let a table default decide.
      permissions: AUDIT_READ,
    });

    // Five different reporters on one spot publish it without an operator.
    const autoVerified = await autoVerifyCluster(db, { lat, lng, log }).catch((e) => {
      // Publishing is a bonus; a failure here must not lose the report.
      error(`auto-verify skipped: ${e instanceof AppwriteException ? e.message : String(e)}`);
      return [];
    });

    log(`report ${row.$id} created by ${userId} (${division})`);
    return json(res, { id: row.$id, autoVerified }, 201);
  } catch (e) {
    error(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
    return json(res, { error: "Could not file the report. Please retry." }, 500);
  }
};
