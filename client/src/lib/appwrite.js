// Single Appwrite entry point for the public app.
// Tables are referenced by fixed IDs (see scripts/provision-appwrite.mjs);
// only endpoint + project id come from the environment.
import {
  Account,
  Client,
  Functions,
  ID,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
} from "appwrite";

export const DATABASE_ID = "safeway";
export const TABLES = {
  divisions: "divisions",
  districts: "districts",
  profiles: "profiles",
  reports: "reports",
  auditEvents: "audit_events",
};
export const BUCKET = { reportPhotos: "report-photos" };

export const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1")
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "");

export const account = new Account(client);
export const tablesDB = new TablesDB(client);
export const functions = new Functions(client);
export const storage = new Storage(client);
export { ID, Permission, Query, Role };

// Call a function and parse its JSON body. Throws Error with the server's message.
export async function callFunction(functionId, body = {}) {
  const execution = await functions.createExecution({
    functionId,
    body: JSON.stringify(body),
    method: "POST",
  });
  let data = {};
  try {
    data = execution?.responseBody ? JSON.parse(execution.responseBody) : {};
  } catch {
    data = { error: "Unexpected response from the server." };
  }
  if (!execution || execution.responseStatusCode >= 400) {
    throw new Error(data?.error ?? `Request failed (${execution?.responseStatusCode ?? "no response"})`);
  }
  return data;
}

const DEPTH_LABEL = { ankle: "ankle-deep", knee: "knee-deep", waist: "waist-deep", road_closed: "road closed" };
export const depthLabel = (d) => DEPTH_LABEL[d] ?? d;

// Backend status -> map filter bucket used across the app.
export const reportType = (r) =>
  r.status === "verified" ? (r.depth === "road_closed" ? "blocked" : "danger") : "cautious";

export const shortReportId = (id) => `R-${String(id).replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()}`;

// Newest-first sanitized-ish feed for the public map. Direct table query:
// rows are readable by all signed-in users (see submit-report permissions).
export async function fetchFeed({ limit = 200 } = {}) {
  const res = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.reports,
    queries: [Query.equal("status", ["pending", "verified"]), Query.orderDesc("$createdAt"), Query.limit(limit)],
    total: false,
  });
  return res.rows;
}

// Deterministic short fingerprint for abuse dedup, computed client-side
// before upload. SHA-256 of the raw file bytes, hex-encoded.
export async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function uploadReportPhoto(file, userId) {
  if (!file) return null;
  // Sessions may only grant roles they hold, so upload with own read only;
  // submit-report widens the file to operators server-side when filed.
  return storage.createFile({
    bucketId: BUCKET.reportPhotos,
    fileId: ID.unique(),
    file,
    permissions: [Permission.read(Role.user(userId))],
  });
}

// Fetch (or create empty) the profile row owned by this user.
export async function getProfile(userId) {
  try {
    return await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: TABLES.profiles, rowId: userId });
  } catch (e) {
    if (e?.code === 404) return null;
    throw e;
  }
}

export async function upsertProfile(user, data) {
  return tablesDB.upsertRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.profiles,
    rowId: user.$id,
    data,
    permissions: [
      Permission.read(Role.user(user.$id)),
      Permission.update(Role.user(user.$id)),
      Permission.read(Role.team("operators")),
    ],
  });
}
