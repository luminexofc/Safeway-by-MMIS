import test from "node:test";
import assert from "node:assert/strict";
import { AppwriteException } from "node-appwrite";
import handler from "../src/main.js";
import { TTL_MS } from "../src/freshness.js";

// Every test here drives the real handler end to end. A missing import or a
// typo in a branch is exactly the kind of failure this catches and `node
// --check` cannot: it validates syntax, not whether a name resolves at run time.

const HOUR = 60 * 60 * 1000;

// serverClient() refuses to run without a key; the fake client below never
// touches the network, so any non-empty value is enough.
process.env.SERVER_API_KEY = "test-key";
process.env.APPWRITE_FUNCTION_PROJECT_ID = "test-project";

function fixture({ status = "pending", row = {}, approved = true, failWrite = null } = {}) {
  const updates = [];
  const audits = [];
  const report = {
    $id: "report-1",
    status,
    placeLabel: "Mirpur Road",
    division: "dhaka",
    depth: "knee",
    note: "[Report Type: Waterlogging]\nNote: knee deep",
    ...row,
  };

  const attempts = [];
  const db = {
    async getRow() {
      return report;
    },
    async updateRow({ data }) {
      // Snapshot: the handler mutates its payload on the retry path, so a
      // stored reference would rewrite history and hide what was attempted.
      attempts.push(structuredClone(data));
      if (failWrite && failWrite(data)) {
        // Must be the real class: the handler branches on instanceof.
        throw new AppwriteException(
          'Invalid document structure: Unknown attribute: "expiresAt"',
          400,
          "row_invalid_structure",
          "row_invalid_structure",
        );
      }
      updates.push(data);
      return { ...report, ...data };
    },
    async createRow({ data }) {
      audits.push(data);
      return data;
    },
  };

  const res = { json: (body, status) => ({ body, status }) };
  const req = { headers: { "x-safeway-jwt": "operator.jwt" } };
  const dependencies = {
    clientFactory: () => ({
      setEndpoint() { return this; },
      setProject() { return this; },
      setKey() { return this; },
      setJWT() { return this; },
      call() { throw new Error("Unexpected network request"); },
    }),
    // resolveCaller builds an Account from this when it validates the JWT.
    accountFactory: () => ({ async get() { return { $id: "operator-1" }; } }),
    callerResolver: async () => ({ userId: "operator-1", reason: "ok" }),
    dbFactory: () => db,
    teamsFactory: () => ({
      async listMemberships() {
        return { memberships: approved ? [{ userId: "operator-1" }] : [] };
      },
    }),
    error() {},
    log() {},
  };
  return { attempts, updates, audits, res, req, dependencies, db };
}

// handler reads req.body; this keeps each test's intent on one line.
const run = async (deps, body) => {
  deps.req.body = JSON.stringify(body);
  return handler({
    req: deps.req,
    res: deps.res,
    log: deps.dependencies.log,
    error: deps.dependencies.error,
    dependencies: deps.dependencies,
  });
};

test("verifying a report that has no expiry gives it a lifetime from now", async () => {
  const f = fixture({ status: "pending" });
  const before = Date.now();
  const out = await run(f, { reportId: "report-1", action: "verify" });

  assert.equal(out.status, 200);
  assert.equal(f.updates.length, 1);
  assert.equal(f.updates[0].status, "verified");

  const exp = new Date(f.updates[0].expiresAt).getTime();
  assert.ok(Number.isFinite(exp), "a verified report must get an expiry");
  // Waterlogging is 12 h; allow generous slack for a slow test machine.
  assert.ok(exp >= before + TTL_MS.waterlogging - 5000);
  assert.ok(exp <= before + TTL_MS.waterlogging + 5000);
});

test("verifying keeps an existing expiry instead of resetting it", async () => {
  const existing = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const f = fixture({ status: "pending", row: { expiresAt: existing } });
  const out = await run(f, { reportId: "report-1", action: "verify" });

  assert.equal(out.status, 200);
  assert.equal(f.updates[0].expiresAt, undefined, "must not overwrite a stored expiry");
});

test("verifying still works when the freshness columns do not exist yet", async () => {
  // Deploy order must not matter: functions first or schema first, both work.
  const f = fixture({ status: "pending", failWrite: (data) => "expiresAt" in data });
  const out = await run(f, { reportId: "report-1", action: "verify" });

  assert.equal(out.status, 200, "verification must not fail on a missing column");
  assert.equal(f.attempts.length, 2, "it retries once without the optional column");
  assert.equal("expiresAt" in f.attempts[0], true, "the first attempt carries the expiry");
  assert.equal("expiresAt" in f.attempts[1], false, "the retry drops it");
  assert.equal(f.attempts[1].status, "verified", "the retry still verifies the report");
});

test("resolving a live report expires it now, leaving status untouched", async () => {
  const f = fixture({ status: "verified" });
  const before = Date.now();
  const out = await run(f, { reportId: "report-1", action: "resolve" });

  assert.equal(out.status, 200);
  assert.equal(f.updates.length, 1);
  assert.equal("status" in f.updates[0], false, "history must survive: no status rewrite");
  assert.equal(f.updates[0].resolvedBy, "operator-1");
  assert.ok(Math.abs(new Date(f.updates[0].expiresAt).getTime() - before) < 5000);
});

test("resolving writes an audit event using a schema-permitted action", async () => {
  const f = fixture({ status: "verified" });
  await run(f, { reportId: "report-1", action: "resolve" });

  assert.equal(f.audits.length, 1);
  // `audit_events.action` is a closed enum: writing "resolved" is rejected by
  // Appwrite, which would lose the log entry after the report was already
  // changed. The verb goes in meta instead.
  assert.ok(
    ["submitted", "verified", "discarded", "flagged_abuse", "notify"].includes(f.audits[0].action),
    `action must be a permitted enum value, got ${f.audits[0].action}`,
  );
  assert.equal(f.audits[0].meta, "resolved", "the real verb must survive in meta");
});

test("a discarded report cannot be resolved", async () => {
  const f = fixture({ status: "discarded" });
  const out = await run(f, { reportId: "report-1", action: "resolve" });
  assert.equal(out.status, 409);
  assert.equal(f.updates.length, 0);
});

test("an already-decided report cannot be verified twice", async () => {
  const f = fixture({ status: "verified" });
  const out = await run(f, { reportId: "report-1", action: "verify" });
  assert.equal(out.status, 409);
  assert.equal(f.updates.length, 0);
});

test("resolving without the freshness columns reports a setup problem, not a crash", async () => {
  const f = fixture({
    status: "verified",
    failWrite: (data) => "expiresAt" in data,
  });
  const out = await run(f, { reportId: "report-1", action: "resolve" });
  assert.equal(out.status, 503);
  assert.match(out.body.error, /not set up/i);
});

test("a non-operator cannot verify or resolve", async () => {
  for (const action of ["verify", "resolve"]) {
    const f = fixture({ status: "pending", approved: false });
    const out = await run(f, { reportId: "report-1", action });
    assert.equal(out.status, 403, action);
    assert.equal(f.updates.length, 0, action);
  }
});

test("an unknown action is rejected and lists the real options", async () => {
  const f = fixture({ status: "pending" });
  const out = await run(f, { reportId: "report-1", action: "obliterate" });
  assert.equal(out.status, 400);
  assert.match(out.body.error, /resolve/);
});
