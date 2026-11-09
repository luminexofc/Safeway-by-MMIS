import test from "node:test";
import assert from "node:assert/strict";
import { AppwriteException } from "node-appwrite";
import { deleteAccount, deleteReport } from "../src/delete.js";

const notFound = () => new AppwriteException("Not found", 404, "general_not_found", "not_found");

// Fakes share one event log so cross-service ordering is asserted, not assumed.
function fakes({ pages, files = [], missingFiles = [] }) {
  const events = [];
  const listed = [];
  return {
    events,
    listed,
    db: {
      async listRows({ tableId, queries }) {
        listed.push({ tableId, queries });
        const page = pages[tableId].shift();
        return { rows: page ?? [] };
      },
      async deleteRow({ tableId, rowId }) {
        events.push(`row:${tableId}:${rowId}`);
      },
    },
    storage: {
      async listFiles() {
        events.push("list:files");
        return { files: files.shift() ?? [] };
      },
      async deleteFile({ fileId }) {
        if (missingFiles.includes(fileId)) {
          missingFiles.splice(missingFiles.indexOf(fileId), 1);
          throw notFound();
        }
        events.push(`file:${fileId}`);
      },
    },
    users: {
      async delete({ userId }) {
        events.push(`user:${userId}`);
      },
    },
  };
}

test("deleteReport: photos first, then audit rows, then the row; 404 is retry-safe", async () => {
  const { db, storage, events } = fakes({
    pages: { audit_events: [[{ $id: "a1" }, { $id: "a2" }], []] },
    missingFiles: ["f1"],
  });

  await deleteReport(db, storage, { $id: "r1", imageFileIds: ["f1", "f2"] });

  assert.deepEqual(events, [
    "file:f2",
    "row:audit_events:a1",
    "row:audit_events:a2",
    "row:reports:r1",
  ]);
});

test("deleteAccount: reports, orphan uploads, actor audit, profile, then the user", async () => {
  const owned = (id) => ({ $id: id, $permissions: ['read("user:u1")'] });
  const foreign = (id) => ({ $id: id, $permissions: [] });
  // A full first page proves the sweep pages instead of stopping at 100.
  const firstPage = Array.from({ length: 99 }, (_, i) => foreign(`x${i}`)).concat(owned("orphan1"));

  const { db, storage, users, events, listed } = fakes({
    pages: {
      reports: [[{ $id: "r1", imageFileIds: ["f1"] }], []],
      audit_events: [[{ $id: "a1" }], [], [{ $id: "act1" }], []],
    },
    files: [firstPage, [owned("orphan2")]],
  });

  const result = await deleteAccount(db, storage, users, "u1");

  assert.deepEqual(result, { reports: 1, files: 2 });
  assert.deepEqual(events, [
    "file:f1",
    "row:audit_events:a1",
    "row:reports:r1",
    "list:files",
    "list:files",
    "file:orphan1",
    "file:orphan2",
    "row:audit_events:act1",
    "row:profiles:u1",
    "user:u1",
  ]);
  for (const { queries } of listed.filter((q) => q.tableId === "reports")) {
    assert.ok(
      queries.map((q) => JSON.parse(q)).some((q) => q.attribute === "reporterId" && q.values[0] === "u1"),
      "reports must be filtered to the caller",
    );
  }
});
