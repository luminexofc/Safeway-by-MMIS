import test from "node:test";
import assert from "node:assert/strict";
import { AppwriteException, Client } from "node-appwrite";
import { deleteReport, deleteSubmission } from "../src/delete.js";
import handler from "../src/main.js";

const notFound = () => new AppwriteException("Not found", 404, "general_not_found", "not_found");

function fixture({ operator = true, status = "pending", storageError = false } = {}) {
  const events = [];
  const auditPages = [[{ $id: "audit-1" }], []];
  const db = {
    async getRow({ rowId }) {
      events.push(`get:${rowId}`);
      return { $id: rowId, status, placeLabel: "Mirpur Road", imageFileIds: ["photo-1"] };
    },
    async listRows({ queries }) {
      const parsed = queries.map((query) => JSON.parse(query));
      assert.ok(parsed.some((query) => query.attribute === "reportId" && query.values.includes("report-1")));
      return { rows: auditPages.shift() ?? [] };
    },
    async deleteRow({ tableId, rowId }) {
      events.push(`${tableId}:${rowId}`);
    },
  };
  const storage = {
    async deleteFile({ fileId }) {
      if (storageError) throw new Error("Storage unavailable");
      events.push(`photo:${fileId}`);
    },
  };
  const dependencies = {
    clientFactory: () => ({
      setEndpoint() { return this; },
      setProject() { return this; },
      setKey() { return this; },
      setJWT() { return this; },
    }),
    dbFactory: () => db,
    storageFactory: () => storage,
    teamsFactory: () => ({
      async listMemberships() {
        events.push("membership");
        return { memberships: operator ? [{ userId: "operator-1" }] : [] };
      },
    }),
    accountFactory: () => ({ async get() { return { $id: "operator-1" }; } }),
    error() {},
  };
  return {
    events,
    dependencies,
    req: { headers: { "x-safeway-jwt": "operator.jwt" } },
    res: { json: (body, status) => ({ body, status }) },
  };
}

test("photos are deleted before audit rows and the report; 404 is retry-safe", async () => {
  const events = [];
  const auditPages = [[{ $id: "a1" }, { $id: "a2" }], []];
  await deleteReport(
    {
      async listRows() { return { rows: auditPages.shift() ?? [] }; },
      async deleteRow({ tableId, rowId }) { events.push(`${tableId}:${rowId}`); },
    },
    {
      async deleteFile({ fileId }) {
        if (fileId === "missing") throw notFound();
        events.push(`photo:${fileId}`);
      },
    },
    { $id: "report-1", imageFileIds: ["missing", "photo-2"] },
  );
  assert.deepEqual(events, ["photo:photo-2", "audit_events:a1", "audit_events:a2", "reports:report-1"]);
});

test("default caller resolution builds a separate JWT-authenticated client", async () => {
  const { req, res, dependencies } = fixture();
  let seen = null;
  dependencies.clientFactory = () => ({ config: { key: "server-key" } });
  dependencies.accountFactory = (client) => ({
    async get() {
      seen = { jwt: client.config.jwt, headers: client.headers };
      return { $id: "operator-1" };
    },
  });
  const out = await deleteSubmission({ req, res, reportId: "report-1" }, dependencies);
  assert.equal(out.status, 200);
  assert.equal(seen.jwt, "operator.jwt");
  const header = Object.entries(seen.headers).find(([key]) => key.toLowerCase() === "x-appwrite-jwt");
  assert.equal(header?.[1], "operator.jwt");
});

for (const status of ["pending", "verified", "discarded", "flagged_abuse"]) {
  test(`an operator can permanently delete a ${status} submission`, async () => {
    const { events, req, res, dependencies } = fixture({ status });
    const result = await deleteSubmission({ req, res, reportId: "report-1" }, dependencies);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { deleted: "report-1" });
    assert.deepEqual(events, ["membership", "get:report-1", "photo:photo-1", "audit_events:audit-1", "reports:report-1"]);
  });
}

test("a non-operator cannot read or delete the target report", async () => {
  const { events, req, res, dependencies } = fixture({ operator: false });
  const result = await deleteSubmission({ req, res, reportId: "report-1" }, dependencies);
  assert.equal(result.status, 403);
  assert.deepEqual(events, ["membership"]);
});

test("a missing session is rejected before data services are used", async () => {
  const { events, req, res, dependencies } = fixture();
  dependencies.callerResolver = async () => ({ userId: null, reason: "missing" });
  const result = await deleteSubmission({ req, res, reportId: "report-1" }, dependencies);
  assert.equal(result.status, 401);
  assert.deepEqual(events, []);
});

test("a photo-cleanup failure does not delete the report row", async () => {
  const { events, req, res, dependencies } = fixture({ storageError: true });
  const result = await deleteSubmission({ req, res, reportId: "report-1" }, dependencies);
  assert.equal(result.status, 500);
  assert.deepEqual(events, ["membership", "get:report-1"]);
});

test("a missing report returns 404 without deleting data", async () => {
  const { req, res, dependencies } = fixture();
  dependencies.dbFactory = () => ({ async getRow() { throw notFound(); } });
  const result = await deleteSubmission({ req, res, reportId: "missing" }, dependencies);
  assert.equal(result.status, 404);
});

test("the function routes delete to permanent operator deletion", async () => {
  const { events, req, res, dependencies } = fixture();
  const result = await handler({
    req: { ...req, body: JSON.stringify({ reportId: "report-1", action: "delete" }) },
    res,
    log() {},
    error() {},
    dependencies,
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { deleted: "report-1" });
  assert.ok(events.includes("reports:report-1"));
});

test("the real Appwrite client accepts the caller JWT", () => {
  const client = new Client().setEndpoint("http://localhost").setProject("test").setJWT("operator.jwt");
  assert.equal(client.config.jwt, "operator.jwt");
  const header = Object.entries(client.headers).find(([key]) => key.toLowerCase() === "x-appwrite-jwt");
  assert.equal(header?.[1], "operator.jwt");
});
