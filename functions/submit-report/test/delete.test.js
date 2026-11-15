import test from "node:test";
import assert from "node:assert/strict";
import { AppwriteException } from "node-appwrite";
import { deleteAccount, deleteReport } from "../src/delete.js";

const notFound = () => new AppwriteException("Not found", 404, "general_not_found", "not_found");

// Fakes share one event log so cross-service ordering is asserted, not assumed.
//
// `pages` serves the deletion loops; `allReports` is the table contents the
// orphan sweep reads when building its referenced-id set. Keying on the query
// (reporterId filter vs. the unfiltered sweep) is what the real index does, so
// the fake must honor it too.
function fakes({ pages, files = [], missingFiles = [], allReports = [], prefs = {} }) {
  const events = [];
  const listed = [];
  return {
    events,
    listed,
    db: {
      async listRows({ tableId, queries }) {
        listed.push({ tableId, queries });
        const parsed = queries.map((q) => JSON.parse(q));
        const sweepsForReferences = parsed.some((q) => q.attribute === "imageFileIds");
        if (sweepsForReferences) {
          const offset = parsed.find((q) => q.method === "offset")?.values?.[0] ?? 0;
          const limit = parsed.find((q) => q.method === "limit")?.values?.[0] ?? 100;
          return { rows: allReports.slice(offset, offset + limit) };
        }
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
    // The sweep reads referenced ids before listing the bucket.
    allReports: [{ $id: "r1", imageFileIds: ["f1"] }],
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
  // Only the pagination queries must be owner-scoped; the reference sweep
  // deliberately reads the whole table to learn which ids are in use.
  const pagination = listed.filter(
    (q) =>
      q.tableId === "reports" &&
      q.queries.map((x) => JSON.parse(x)).some((x) => x.method === "equal"),
  );
  assert.ok(pagination.length > 0, "reports must be paged for deletion");
  for (const { queries } of pagination) {
    assert.ok(
      queries.map((q) => JSON.parse(q)).some((q) => q.attribute === "reporterId" && q.values[0] === "u1"),
      "reports must be filtered to the caller",
    );
  }
});

test("deleteAccount: a filed report photo is never swept as an orphan", async () => {
  // Filed photos keep the uploader's read permission (tightenPhotoPermissions),
  // so permission alone would match them. Only unreferenced ids may be deleted.
  // Here the caller has no report of their own left to delete, but a file they
  // uploaded is still referenced by a row — the sweep must leave it alone.
  const owned = (id) => ({ $id: id, $permissions: ['read("user:u1")'] });

  const { db, storage, users, events } = fakes({
    pages: { reports: [[], []], audit_events: [[]] },
    allReports: [{ $id: "other", imageFileIds: ["filed"] }],
    files: [[owned("filed"), owned("orphan")], []],
  });

  const result = await deleteAccount(db, storage, users, "u1");

  assert.equal(result.files, 1, "only the unreferenced upload is counted");
  assert.ok(events.includes("file:orphan"), "orphan is removed");
  assert.ok(!events.includes("file:filed"), "referenced photo is left alone");
});

test("deleteAccount: another user's photo is never touched", async () => {
  const { db, storage, users, events } = fakes({
    pages: { reports: [[], []], audit_events: [[]] },
    allReports: [],
    files: [[{ $id: "theirs", $permissions: ['read("user:u2")'] }], []],
  });

  const result = await deleteAccount(db, storage, users, "u1");

  assert.equal(result.files, 0);
  assert.ok(!events.some((e) => e.startsWith("file:")));
});

test("deleteAccount: the orphan sweep fails closed if references cannot be read", async () => {
  // Deleting without knowing which files are referenced would destroy a live
  // report's photo, so a failed reference scan must abort before any delete.
  const events = [];
  const db = {
    async listRows({ tableId, queries }) {
      const parsed = queries.map((q) => JSON.parse(q));
      if (parsed.some((q) => q.attribute === "imageFileIds")) {
        throw new AppwriteException("boom", 500, "general_server_error", "server_error");
      }
      return { rows: [] };
    },
    async deleteRow() {},
  };
  const storage = {
    async listFiles() {
      events.push("list:files");
      return { files: [] };
    },
    async deleteFile({ fileId }) {
      events.push(`file:${fileId}`);
    },
  };
  const users = { async delete() {} };

  await assert.rejects(deleteAccount(db, storage, users, "u1"), /boom/);
  assert.deepEqual(events, [], "nothing is listed or deleted after a failed scan");
});

