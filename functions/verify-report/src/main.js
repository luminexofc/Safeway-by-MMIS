import {
  AppwriteException,
  Client,
  ID,
  Messaging,
  Query,
  TablesDB,
  Teams,
} from "node-appwrite";

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const AUDIT = "audit_events";
const OPERATORS_TEAM = "operators";

const ACTIONS = {
  verify: { status: "verified", audit: "verified" },
  discard: { status: "discarded", audit: "discarded" },
  flag: { status: "flagged_abuse", audit: "flagged_abuse" },
};
const DEPTH_LABEL = { ankle: "ankle-deep", knee: "knee-deep", waist: "waist-deep", road_closed: "road closed" };

const json = (res, body, status = 200) => res.json(body, status);
const callerId = (req) => req.headers["x-appwrite-user-id"] || null;

function serverClient() {
  const key = process.env.SERVER_API_KEY || process.env.APPWRITE_API_KEY;
  if (!key) return null;
  return new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(key);
}

async function isOperator(client, userId) {
  const teams = new Teams(client);
  const list = await teams.listMemberships({
    teamId: OPERATORS_TEAM,
    queries: [Query.equal("userId", userId), Query.equal("confirm", true)],
    total: false,
  });
  return list.memberships.length > 0;
}

export default async ({ req, res, log, error }) => {
  const userId = callerId(req);
  if (!userId) return json(res, { error: "Sign in required." }, 401);

  let body = null;
  try {
    body = JSON.parse(req.body || "{}");
  } catch {
    return json(res, { error: "Body must be JSON." }, 400);
  }
  const reportId = typeof body.reportId === "string" ? body.reportId.trim() : "";
  const action = ACTIONS[body.action];
  if (!reportId || reportId.length > 64) return json(res, { error: "reportId required." }, 400);
  if (!action) return json(res, { error: "action must be verify, discard or flag." }, 400);

  const client = serverClient();
  if (!client) {
    error("SERVER_API_KEY function variable is not set; see README -> Appwrite setup");
    return json(res, { error: "Verification is not configured on the server yet." }, 500);
  }

  try {
    if (!(await isOperator(client, userId))) {
      return json(res, { error: "Operator access only." }, 403);
    }
  } catch (e) {
    error(`membership check failed: ${e instanceof AppwriteException ? e.message : e}`);
    return json(res, { error: "Could not confirm operator access." }, 500);
  }

  const db = new TablesDB(client);
  try {
    const report = await db.getRow({ databaseId: DATABASE_ID, tableId: REPORTS, rowId: reportId });
    if (report.status !== "pending") {
      return json(res, { error: `Report already decided (${report.status}).` }, 409);
    }

    const now = new Date().toISOString();
    const updated = await db.updateRow({
      databaseId: DATABASE_ID,
      tableId: REPORTS,
      rowId: reportId,
      data: {
        status: action.status,
        verifiedBy: userId,
        ...(action.status === "verified" ? { verifiedAt: now } : {}),
      },
    });

    await db.createRow({
      databaseId: DATABASE_ID,
      tableId: AUDIT,
      rowId: ID.unique(),
      data: { reportId, actorId: userId, action: action.audit },
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
        });
      } catch (e) {
        const why = e instanceof AppwriteException ? `${e.code} ${e.message}` : String(e);
        log(`push skipped: ${why}`);
        await db.createRow({
          databaseId: DATABASE_ID, tableId: AUDIT, rowId: ID.unique(),
          data: { reportId, actorId: userId, action: "notify", meta: `skipped:${why.slice(0, 200)}` },
        }).catch(() => {});
      }
    }

    log(`report ${reportId} -> ${action.status} by ${userId}`);
    return json(res, { id: updated.$id, status: updated.status });
  } catch (e) {
    if (e instanceof AppwriteException && e.code === 404) {
      return json(res, { error: "Report not found." }, 404);
    }
    error(e instanceof AppwriteException ? `${e.code}: ${e.message}` : String(e));
    return json(res, { error: "Could not update the report." }, 500);
  }
};
