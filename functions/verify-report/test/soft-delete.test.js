import test from "node:test";
import assert from "node:assert/strict";
import { AppwriteException } from "node-appwrite";
import { deletedPermissions, deleteSubmission, isSoftDeleted } from "../src/delete.js";

const notFound = () => new AppwriteException("Not found", 404, "general_not_found", "not_found");

function fixture({ status = "verified", permissions = ['read("any")', 'update("team:operators")'], operator = true, reporterId = "reporter-1", writeFails = false } = {}) {
  const events = [];
  const report = { $id: "report-1", status, placeLabel: "Mirpur Road", reporterId, $permissions: permissions, imageFileIds: ["photo-1"] };

  const db = {
    async getRow() { events.push("get"); return report; },
    async updateRow({ data, permissions }) {
      events.push(`update:${JSON.stringify(permissions)}`);
      if (writeFails && "deletedAt" in data) {
        throw new AppwriteException('Unknown attribute: "deletedAt"', 400, "row_invalid_structure", "row_invalid_structure");
      }
      return { ...report, ...data, $permissions: permissions };
    },
    async createRow({ data }) { events.push(`audit:${data.action}:${data.meta}`); return data; },
    async deleteRow({ tableId, rowId }) { events.push(`DELETE:${tableId}:${rowId}`); },
  };
  const storage = { async deleteFile({ fileId }) { events.push(`DELETE-FILE:${fileId}`); } };

  // Appwrite defaults the status to 200 when json() is called with one arg.
  const res = { json: (body, status = 200) => ({ body, status }) };
  const req = { headers: { "x-safeway-jwt": "operator.jwt" } };
  const dependencies = {
    clientFactory: () => ({ setEndpoint(){return this;}, setProject(){return this;}, setKey(){return this;}, setJWT(){return this;}, call(){throw new Error("Unexpected network request");} }),
    callerResolver: async () => ({ userId: "operator-1", reason: "ok" }),
    dbFactory: () => db,
    storageFactory: () => storage,
    teamsFactory: () => ({ async listMemberships() { return { memberships: operator ? [{ userId: "operator-1" }] : [] }; } }),
    error() {}, log() {},
  };
  return { events, report, req, res, dependencies, db };
}

test("deleting hides the report from the public map instead of destroying it", async () => {
  const f = fixture();
  const out = await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
  assert.equal(out.status, 200);
  assert.equal(out.body.deleted, "report-1");
  assert.equal(f.events.some((e) => e.startsWith("DELETE:")), false, "the report row must survive");
  assert.equal(f.events.some((e) => e.startsWith("DELETE-FILE:")), false, "the photo must survive");
});

test("the public read permission is removed, which is what hides it", async () => {
  const f = fixture();
  await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
  const perms = deletedPermissions(f.report);
  assert.equal(perms.includes('read("any")'), false, "no longer public");
  assert.ok(perms.some((p) => p.includes("team:operators")), "operators can still read it");
  assert.ok(perms.some((p) => p.includes("user:reporter-1")), "the reporter can still see their own report");
  assert.ok(perms.some((p) => p.startsWith('update("team:operators")')));
});

test("deletion is recorded in the operations log with a readable verb", async () => {
  const f = fixture();
  await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
  const audit = f.events.find((e) => e.startsWith("audit:"));
  assert.ok(audit, "an audit event must be written");
  assert.match(audit, /^audit:discarded:/);
  assert.match(audit, /deleted/);
});

test("deleting works from any status, including verified", async () => {
  for (const status of ["pending", "verified", "discarded", "flagged_abuse"]) {
    const f = fixture({ status });
    const out = await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
    assert.equal(out.status, 200, status);
  }
});

test("a report with no public read grant is already deleted, and is not touched again", async () => {
  const f = fixture({ permissions: ['read("team:operators")', 'read("user:reporter-1")'] });
  const out = await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
  assert.equal(out.status, 200);
  assert.equal(out.body.alreadyDeleted, true);
  assert.equal(f.events.some((e) => e.startsWith("update:")), false, "no second write");
});

test("deleting still hides the report when the deletedAt column does not exist yet", async () => {
  const f = fixture({ writeFails: true });
  const out = await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
  assert.equal(out.status, 200, "the hide must succeed");
  const updates = f.events.filter((e) => e.startsWith("update:"));
  assert.equal(updates.length, 2, "it retries once without the optional timestamp");
  assert.equal(updates[1].includes('read("any")'), false, "the retry still removes public read");
});

test("a non-operator cannot delete", async () => {
  const f = fixture({ operator: false });
  const out = await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
  assert.equal(out.status, 403);
  assert.equal(f.events.some((e) => e.startsWith("update:")), false);
});

test("a missing session is rejected before anything is read", async () => {
  const f = fixture();
  f.dependencies.callerResolver = async () => ({ userId: null, reason: "missing" });
  const out = await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
  assert.equal(out.status, 401);
  assert.deepEqual(f.events, []);
});

test("a missing report is a 404, not a crash", async () => {
  const f = fixture();
  f.db.getRow = async () => { throw notFound(); };
  const out = await deleteSubmission({ req: f.req, res: f.res, reportId: "report-1" }, f.dependencies);
  assert.equal(out.status, 404);
});

test("isSoftDeleted reads the permission list, not a status value", () => {
  assert.equal(isSoftDeleted({ $permissions: ['read("any")'] }), false);
  assert.equal(isSoftDeleted({ $permissions: ['read("users")'] }), false, "demo rows use read(users)");
  assert.equal(isSoftDeleted({ $permissions: ['read("team:operators")'] }), true);
  assert.equal(isSoftDeleted({}), false);
  assert.equal(isSoftDeleted({ $permissions: undefined }), false);
  assert.equal(isSoftDeleted({ status: "verified", $permissions: ['read("team:operators")'] }), true);
});
