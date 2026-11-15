// Utility to manage demo blockages and incident reports for testing.
// Usage:
//   node scripts/demo-blockage.mjs list
//   node scripts/demo-blockage.mjs add [bogura]
//   node scripts/demo-blockage.mjs remove [reportId] --yes
//   node scripts/demo-blockage.mjs clear --yes
//
// This runs locally with a project API key, so it bypasses every check the
// functions enforce. Destructive commands require an explicit --yes, and the
// rows it creates use the same permissions as submit-report, so demo data
// never widens what the real API grants.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client, TablesDB, ID, Permission, Role, Query } from "../functions/submit-report/node_modules/node-appwrite/dist/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.appwrite");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.appwrite file");
  process.exit(1);
}

const env = fs.readFileSync(envPath, "utf8");
const endpoint = env.match(/APPWRITE_ENDPOINT=([^\r\n]+)/)?.[1] || "https://cloud.appwrite.io/v1";
const projectId = env.match(/APPWRITE_PROJECT_ID=([^\r\n]+)/)?.[1];
// Prefer a key scoped to rows+files; the deploy key can also rewrite code.
const demoKey = env.match(/APPWRITE_DEMO_API_KEY=([^\r\n]+)/)?.[1];
const apiKey = demoKey || env.match(/APPWRITE_FUNCTIONS_API_KEY=([^\r\n]+)/)?.[1] || env.match(/APPWRITE_DEPLOY_API_KEY=([^\r\n]+)/)?.[1];

if (!projectId || !apiKey) {
  console.error("Missing APPWRITE_PROJECT_ID or API key in .env.appwrite");
  process.exit(1);
}

if (!demoKey) {
  console.warn(
    "warning: no APPWRITE_DEMO_API_KEY set; falling back to a broader key. " +
      "Create a rows+files scoped key and set APPWRITE_DEMO_API_KEY to use this tool safely.",
  );
}


const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const db = new TablesDB(client);
const DATABASE_ID = "safeway";
const TABLE_ID = "reports";

const DEMO_PRESETS = {
  jaleswaritola: {
    placeLabel: "Jaleswaritola Road (West to East), Bogura",
    division: "rajshahi",
    district: "Bogura",
    lat: 24.8456,
    lng: 89.3735,
    depth: "road_closed",
    note: `[Report Type: Waterlogging]
Segment: (24.84560, 89.37350) -> (24.84350, 89.37650)
From: Jaleswaritola Mor, Bogura
To: Jaleswaritola Kali Mandir Road, Bogura
Water blockade: road completely submerged in Jaleswaritola street. Depth: road closed.`,
  },
  bogura: {
    placeLabel: "Jaleswaritola Road (West to East), Bogura",
    division: "rajshahi",
    district: "Bogura",
    lat: 24.8456,
    lng: 89.3735,
    depth: "road_closed",
    note: `[Report Type: Waterlogging]
Segment: (24.84560, 89.37350) -> (24.84350, 89.37650)
From: Jaleswaritola Mor, Bogura
To: Jaleswaritola Kali Mandir Road, Bogura
Water blockade: road completely submerged in Jaleswaritola street. Depth: road closed.`,
  },
  thanthania: {
    placeLabel: "Satmatha to Thanthania Bus Stand, Bogura",
    division: "rajshahi",
    district: "Bogura",
    lat: 24.8480786,
    lng: 89.3729411,
    depth: "road_closed",
    note: `[Report Type: Waterlogging]
Segment: (24.84808, 89.37294) -> (24.83317, 89.37618)
From: Satmatha (বীর শ্রেষ্ঠ চত্বর), Bogura
To: Thanthania Bus Stand, Bogura
Water blockade: Sherpur road closed due to deep waterlogging from Satmatha to Thanthania.`,
  },
};

async function listReports() {
  const res = await db.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    queries: [Query.orderDesc("$createdAt"), Query.limit(50)],
    total: true,
  });
  console.log(`\nFound ${res.total} report(s) in database:\n`);
  res.rows.forEach((r, idx) => {
    console.log(`[${idx + 1}] ID: ${r.$id}`);
    console.log(`    Place:    ${r.placeLabel}`);
    console.log(`    Coords:   [${r.lat}, ${r.lng}]`);
    console.log(`    Status:   ${r.status} | Depth: ${r.depth}`);
    console.log(`    Note:     ${r.note || "N/A"}`);
    console.log(`    Reporter: ${r.reporterId}\n`);
  });
}

async function addBlockage(presetKey = "bogura") {
  const preset = DEMO_PRESETS[presetKey.toLowerCase()] || DEMO_PRESETS.bogura;
  const now = new Date().toISOString();

  const row = await db.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    rowId: ID.unique(),
    data: {
      placeLabel: preset.placeLabel,
      division: preset.division,
      district: preset.district,
      lat: preset.lat,
      lng: preset.lng,
      depth: preset.depth,
      note: preset.note,
      status: "verified",
      reporterId: "demo_tester",
      verifiedBy: "system_demo",
      verifiedAt: now,
    },
    permissions: [
      Permission.read(Role.users()),
      Permission.update(Role.team("operators")),
    ],
  });

  console.log("\nCreated demo blockage successfully!");
  console.log(`ID:      ${row.$id}`);
  console.log(`Place:   ${row.placeLabel}`);
  console.log(`Coords:  [${row.lat}, ${row.lng}]`);
  console.log(`Status:  ${row.status} (Depth: ${row.depth})`);
  console.log(`Note:    ${row.note}\n`);
}

async function removeReport(reportId) {
  if (!reportId) {
    console.error("Please specify a report ID to remove: node scripts/demo-blockage.mjs remove <reportId>");
    process.exit(1);
  }
  await db.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    rowId: reportId,
  });
  console.log(`\nDeleted report ${reportId} successfully.\n`);
}

async function clearDemo() {
  const res = await db.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    queries: [Query.equal("reporterId", "demo_tester"), Query.limit(100)],
  });
  if (res.rows.length === 0) {
    console.log("No demo reports found to clear.");
    return;
  }
  for (const r of res.rows) {
    await db.deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLE_ID,
      rowId: r.$id,
    });
    console.log(`Removed demo report ${r.$id} (${r.placeLabel})`);
  }
  console.log("\nDone clearing demo reports.\n");
}

const command = process.argv[2] || "list";
const arg = process.argv[3];
const confirmed = process.argv.includes("--yes");

// Deletion runs on a project key with no ownership check behind it, so make
// the operator say so out loud before anything is removed.
const DESTRUCTIVE = new Set(["remove", "clear"]);
if (DESTRUCTIVE.has(command) && !confirmed) {
  console.error(
    `Refusing to ${command} without confirmation. Re-run with --yes:\n` +
      `  node scripts/demo-blockage.mjs ${command}${arg ? ` ${arg}` : ""} --yes`,
  );
  process.exit(2);
}

try {
  switch (command) {
    case "list":
      await listReports();
      break;
    case "add":
      await addBlockage(arg);
      break;
    case "remove":
      await removeReport(arg);
      break;
    case "clear":
      await clearDemo();
      break;
    default:
      console.log("Usage: node scripts/demo-blockage.mjs [list|add|remove|clear] [--yes]");
  }
} catch (err) {
  console.error("Operation failed:", err.message || err);
}
