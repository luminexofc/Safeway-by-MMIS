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

// Mint a short-lived JWT for the signed-in user. The functions derive the
// caller from the Authorization header, never from x-appwrite-* headers, so a
// caller cannot name someone else. Returns null when signed out.
export async function callerJwt() {
  try {
    const jwt = await account.createJWT();
    return jwt?.jwt ?? null;
  } catch {
    return null;
  }
}

// Call a function and parse its JSON body. Throws Error with the server's message.
export async function callFunction(functionId, body = {}) {
  const jwt = await callerJwt();
  // A dedicated header, because Authorization is reserved/rewritten by some
  // platforms on function executions. No JWT means no header, so the function
  // answers 401 rather than acting on an unauthenticated request.
  const headers = jwt ? { "x-safeway-jwt": jwt } : {};
  const execution = await functions.createExecution({
    functionId,
    body: JSON.stringify(body),
    method: "POST",
    headers,
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

/* ── Profile picture ──────────────────────────────────────────────────
   The plan allows one bucket, so the picture shares `report-photos`. That is
   also correct for deletion: the account-deletion sweep removes the caller's
   unreferenced uploads, and an avatar is referenced by no report row, so it is
   swept with the rest of their data. The file id lives in account prefs. */

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Prefs are replaced wholesale by updatePrefs, so read-then-write.
export async function getAvatarFileId() {
  try {
    const prefs = await account.getPrefs();
    return typeof prefs?.avatarFileId === "string" ? prefs.avatarFileId : null;
  } catch {
    return null;
  }
}

// updatePrefs replaces the whole object, so read first. Avatar is the only
// prefs key today; add app settings to the profiles row, not to prefs, or a
// concurrent write here will drop them.
export async function setAvatarFileId(fileId) {
  const prefs = (await account.getPrefs().catch(() => ({}))) ?? {};
  await account.updatePrefs({ prefs: { ...prefs, avatarFileId: fileId ?? null } });
}

// Square-crop and downscale in the browser so the upload stays small and the
// whole picture fits a round slot instead of being letterboxed.
export function makeSquareThumbnail(file, size = 512) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not process that image."))),
          "image/jpeg",
          0.9,
        );
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not an image we can read."));
    };
    img.src = url;
  });
}

export async function uploadAvatar(blob, userId) {
  const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
  return storage.createFile({
    bucketId: BUCKET.reportPhotos,
    fileId: ID.unique(),
    file,
    // Only the owner may read their own picture.
    permissions: [Permission.read(Role.user(userId))],
  });
}

export async function deleteAvatar(fileId) {
  if (!fileId) return;
  await storage.deleteFile({ bucketId: BUCKET.reportPhotos, fileId }).catch(() => {});
}

export function avatarUrl(fileId) {
  if (!fileId) return null;
  return storage.getFileView({ bucketId: BUCKET.reportPhotos, fileId });
}

// Fetch the picture with the session and hand back a blob: URL.
//
// An <img src="...appwrite..."> would need the page CSP to allow that host
// and would fail silently on a 401. Fetching explicitly keeps img-src at
// `blob:` and lets a missing picture degrade to initials.
export async function fetchAvatarBlobUrl(fileId) {
  if (!fileId) return null;
  // The file is readable only by its owner, so the request needs the session.
  // A plain fetch sends neither the credentials mode nor Appwrite's
  // localStorage session header, so this repeats what the SDK does.
  const session = window.localStorage?.getItem("cookieFallback");
  const res = await fetch(avatarUrl(fileId), {
    credentials: "include",
    headers: {
      "X-Appwrite-Project": import.meta.env.VITE_APPWRITE_PROJECT_ID ?? "",
      ...(session ? { "X-Fallback-Cookies": session } : {}),
    },
  });
  if (!res.ok) throw new Error(`avatar ${res.status}`);
  return URL.createObjectURL(await res.blob());
}
