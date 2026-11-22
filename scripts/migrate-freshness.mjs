// One-time (and safely re-runnable) migration for report freshness.
//
//   node scripts/migrate-freshness.mjs            # add columns, then backfill
//   node scripts/migrate-freshness.mjs --check    # report only, change nothing
//
// Adds the three columns the freshness model needs, then assigns an expiry to
// every existing row so the map stops showing occurrences that are long over.
// Existing rows are treated by age: anything older than its type's lifetime is
// expired now (it leaves the map), anything younger keeps the time it had left.
//
// Needs a key with tables.read + columns.read/write + rows.read/write. The
// functions key in .env.appwrite does not have schema scopes; put a key that
// does in APPWRITE_MIGRATE_API_KEY, or the script stops and says so.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Client,
  Query,
  TablesDB,
} from "../functions/submit-report/node_modules/node-appwrite/dist/index.js";
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  HOUR,
  TTL_MS,
  categoryFromNote,
  expiryFor,
  resolveCategory,
} from "../functions/submit-report/src/freshness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.appwrite");
const env = fs.readFileSync(envPath, "utf8");
const g = (k) => env.match(new RegExp(`${k}=([^\\r\\n]+)`))?.[1]?.trim();

const endpoint = g("APPWRITE_ENDPOINT") || "https://cloud.appwrite.io/v1";
const projectId = g("APPWRITE_PROJECT_ID");
const apiKey = g("APPWRITE_MIGRATE_API_KEY") || g("APPWRITE_FUNCTIONS_API_KEY");

const DATABASE_ID = "safeway";
const REPORTS = "reports";
const CHECK_ONLY = process.argv.includes("--check");
const CONFIRM = process.argv.includes("--yes");

if (!projectId || !apiKey) {
  console.error("Missing APPWRITE_PROJECT_ID or an API key in .env.appwrite");
  process.exit(1);
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new TablesDB(client);

const COLUMNS = [
  { key: "category", type: "string", size: 32, required: false },
  { key: "expiresAt", type: "datetime", required: false },
  { key: "lastConfirmedAt", type: "datetime", required: false },
  { key: "resolvedAt", type: "datetime", required: false },
  { key: "resolvedBy", type: "string", size: 64, required: false },
];

async function listColumns() {
  const res = await fetch(`${endpoint}/tablesdb/${DATABASE_ID}/tables/${REPORTS}/columns`, {
    headers: { "X-Appwrite-Project": projectId, "X-Appwrite-Key": apiKey },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.message ?? `columns read failed (${res.status})`);
    err.code = body?.code ?? res.status;
    throw err;
  }
  return body.columns ?? [];
}

async function createColumn(col) {
  const url = `${endpoint}/tablesdb/${DATABASE_ID}/tables/${REPORTS}/columns/${col.type}`;
  const payload = { key: col.key, required: col.required, array: false };
  // xdefault is never set: a default would silently invent an expiry for rows
  // the backfill has not reached yet. NULL means "not decided" to the client.
  if (col.type === "string") payload.size = col.size;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 409 means it already exists, which is success for a re-run.
    if (body?.code === 409) return "exists";
    throw new Error(`${col.key}: ${body?.message ?? res.status}`);
  }
  return "created";
}

// A column is usable only once Appwrite has finished creating it; writes made
// while it is still "processing" fail. Wait for the schema to settle.
async function waitForColumns(keys) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const cols = await listColumns();
    const pending = keys.filter((k) => {
      const c = cols.find((x) => x.key === k);
      return !c || (c.status && c.status !== "available");
    });
    if (!pending.length) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn("warning: some columns are still processing; continuing anyway");
}

async function fetchAllReports() {
  const rows = [];
  let cursor = null;
  for (let page = 0; page < 200; page += 1) {
    const queries = [Query.orderAsc("$id"), Query.limit(100)];
    if (cursor) queries.unshift(Query.cursorAfter(cursor));
    const res = await db.listRows({ databaseId: DATABASE_ID, tableId: REPORTS, queries });
    rows.push(...res.rows);
    if (res.rows.length < 100) break;
    cursor = res.rows[res.rows.length - 1].$id;
  }
  return rows;
}

function plan(row) {
  const category = resolveCategory(row.category, row.note);
  const created = new Date(row.$createdAt).getTime();
  const expires = expiryFor(category, created);
  const expired = new Date(expires).getTime() <= Date.now();
  return {
    category,
    expiresAt: expires,
    // Requested never to show an ended occurrence again: a row that already
    // outlived its type's lifetime gets an expiry in the past, so the map
    // drops it immediately while the row and its audit trail survive.
    expired,
    status: row.status,
  };
}

async function main() {
  console.log(`Freshness migration · ${CHECK_ONLY ? "CHECK ONLY" : "APPLY"}`);
  console.log(`endpoint ${endpoint} · project ${projectId}\n`);

  let existing = [];
  try {
    existing = await listColumns();
  } catch (e) {
    if (e.code === 401) {
      console.error(
        "This key cannot read the table schema (missing tables.read / columns.read).\n" +
          "Create a key with schema scopes and set APPWRITE_MIGRATE_API_KEY, or add\n" +
          "the columns by hand in the console and re-run this script to backfill.",
      );
      process.exit(1);
    }
    throw e;
  }

  const present = new Set(existing.map((c) => c.key));
  const missing = COLUMNS.filter((c) => !present.has(c.key));
  console.log(`Columns present: ${[...present].join(", ") || "(none)"}`);
  console.log(`Missing: ${missing.map((c) => c.key).join(", ") || "(none)"}\n`);

  if (!CHECK_ONLY && missing.length) {
    for (const col of missing) {
      const outcome = await createColumn(col);
      console.log(`  ${col.key}: ${outcome}`);
    }
    await waitForColumns(COLUMNS.map((c) => c.key));
    console.log("");
  }

  const rows = await fetchAllReports();
  const counts = { total: rows.length, becameExpired: 0, remainLive: 0, byCategory: {} };
  for (const row of rows) {
    const p = plan(row);
    counts.byCategory[p.category] = (counts.byCategory[p.category] ?? 0) + 1;
    if (p.expired) counts.becameExpired += 1;
    else counts.remainLive += 1;
  }

  console.log(`Rows: ${counts.total}`);
  console.log(`  already past their lifetime (will leave the map): ${counts.becameExpired}`);
  console.log(`  still live: ${counts.remainLive}`);
  console.log(`  by category: ${JSON.stringify(counts.byCategory)}`);
  console.log(
    `  lifetimes: ${CATEGORIES.map((c) => `${c}=${Math.round(TTL_MS[c] / HOUR)}h`).join(", ")}\n`,
  );

  if (CHECK_ONLY) {
    console.log("Check only. Nothing was written.");
    return;
  }
  if (!CONFIRM) {
    console.log("Dry run. Re-run with --yes to write these changes.");
    return;
  }

  let written = 0;
  for (const row of rows) {
    const p = plan(row);
    await db.updateRow({
      databaseId: DATABASE_ID,
      tableId: REPORTS,
      rowId: row.$id,
      data: {
        category: p.category,
        expiresAt: p.expiresAt,
      },
    });
    written += 1;
    if (written % 25 === 0) console.log(`  …${written}/${rows.length}`);
  }
  console.log(`\nUpdated ${written} row(s).`);
  console.log(
    "Rows whose lifetime had already passed now expire in the past and stop\n" +
      "appearing on the map immediately. Their data is untouched.",
  );
}

main().catch((e) => {
  console.error(`\nMigration failed: ${e.message}`);
  process.exit(1);
});
