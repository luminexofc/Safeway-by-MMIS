import {
  AppwriteException,
  Client,
  ID,
  Permission,
  Query,
  Role,
  TablesDB,
} from "node-appwrite";

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";
const OPERATORS_TEAM = "operators";

const DIVISIONS = new Set([
  "dhaka", "chattogram", "khulna", "rajshahi",
  "barishal", "sylhet", "rangpur", "mymensingh", "unknown",
]);
const DEPTHS = new Set(["ankle", "knee", "waist", "road_closed"]);
const HEX64 = /^[0-9a-f]{64}$/i;

const json = (res, body, status = 200) => res.json(body, status);

// Appwrite injects the caller's user id for executions started by a signed-in
// user; client-supplied x-appwrite-* headers are ignored by the platform.
const callerId = (req) => req.headers["x-appwrite-user-id"] || null;

function serverClient() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) return null;
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(key);
}

export default async ({ req, res, log, error }) => {
  const userId = callerId(req);
  if (!userId) return json(res, { error: "Sign in to file a report." }, 401);

  let body = null;
  try {
    body = JSON.parse(req.body || "{}");
  } catch {
    return json(res, { error: "Body must be JSON." }, 400);
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

  if (placeLabel.length < 2 || placeLabel.length > 255) return json(res, { error: "placeLabel must be 2–255 characters." }, 400);
  if (!DIVISIONS.has(division)) return json(res, { error: "division must be one of the 8 divisions, or \"unknown\"." }, 400);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return json(res, { error: "lat out of range." }, 400);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return json(res, { error: "lng out of range." }, 400);
  if (!DEPTHS.has(depth)) return json(res, { error: "depth must be ankle, knee, waist or road_closed." }, 400);

  const client = serverClient();
  if (!client) {
    error("APPWRITE_API_KEY project variable is not set; see README -> Appwrite setup");
    return json(res, { error: "Reports are not configured on the server yet." }, 500);
  }
  const db = new TablesDB(client);

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

    const row = await db.createRow({
      databaseId: DATABASE_ID,
      tableId: REPORTS,
      rowId: ID.unique(),
      data: {
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
      },
      // Every signed-in user can read markers (the map is the product);
      // only operators can change a report after birth. reporterId stays
      // an opaque id. Photos keep their own per-file permissions.
      permissions: [
        Permission.read(Role.users()),
        Permission.update(Role.team(OPERATORS_TEAM)),
      ],
    });

    await db.createRow({
      databaseId: DATABASE_ID,
      tableId: AUDIT,
      rowId: ID.unique(),
      data: { reportId: row.$id, actorId: userId, action: "submitted", ...(hashSeen ? { meta: "image_hash_seen:true" } : {}) },
    });

    log(`report ${row.$id} created by ${userId} (${division})`);
    return json(res, { id: row.$id }, 201);
  } catch (e) {
    error(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
    return json(res, { error: "Could not file the report. Please retry." }, 500);
  }
};
