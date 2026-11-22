import test from "node:test";
import assert from "node:assert/strict";
import { confirmReport } from "../src/confirm.js";
import { HOUR, REVIVE_WINDOW_MS } from "../src/freshness.js";

const iso = (ms) => new Date(ms).toISOString();

// Minimal db: one row, records the write. Enough to assert the rules that
// matter without a live backend.
function fakeDb(row, opts = {}) {
  const writes = [];
  const audit = [];
  return {
    writes,
    audit,
    getRow: async () => {
      if (opts.missing) {
        const e = new Error("not found");
        e.code = 404;
        throw e;
      }
      return row;
    },
    updateRow: async ({ data }) => {
      writes.push(data);
      return { ...row, ...data };
    },
    createRow: async ({ data }) => {
      audit.push(data);
      return data;
    },
  };
}

const liveRow = (over = {}) => ({
  $id: "r1",
  status: "verified",
  reporterId: "owner",
  division: "dhaka",
  category: "traffic_jam",
  expiresAt: iso(Date.now() + 30 * 60 * 1000),
  ...over,
});

test("another user extends a live report", async () => {
  const db = fakeDb(liveRow());
  const out = await confirmReport(db, { reportId: "r1", userId: "someone-else" });
  assert.equal(out.reportId, "r1");
  assert.equal(db.writes.length, 1);

  const newExpiry = new Date(db.writes[0].expiresAt).getTime();
  assert.ok(newExpiry > Date.now() + 30 * 60 * 1000, "expiry must move forward");
  assert.ok(newExpiry <= Date.now() + 1 * HOUR + 5000, "a jam is extended by one hour, not more");
});

test("the reporter cannot confirm their own report", async () => {
  const db = fakeDb(liveRow());
  const out = await confirmReport(db, { reportId: "r1", userId: "owner" });
  assert.equal(out.status, 403);
  assert.equal(db.writes.length, 0, "nothing may be written");
});

test("a report long past its expiry cannot be revived", async () => {
  const db = fakeDb(liveRow({ expiresAt: iso(Date.now() - 60 * 24 * HOUR) }));
  const out = await confirmReport(db, { reportId: "r1", userId: "someone-else" });
  assert.equal(out.status, 409);
  assert.equal(db.writes.length, 0);
});

test("a report that just expired can still be revived", async () => {
  const db = fakeDb(liveRow({ expiresAt: iso(Date.now() - REVIVE_WINDOW_MS + 5000) }));
  const out = await confirmReport(db, { reportId: "r1", userId: "someone-else" });
  assert.equal(out.reportId, "r1");
  assert.equal(db.writes.length, 1);
});

test("a decided report is not confirmable", async () => {
  for (const status of ["discarded", "flagged_abuse"]) {
    const db = fakeDb(liveRow({ status }));
    const out = await confirmReport(db, { reportId: "r1", userId: "someone-else" });
    assert.equal(out.status, 409, status);
    assert.equal(db.writes.length, 0);
  }
});

test("confirming writes an audit event so the log shows who kept it alive", async () => {
  const db = fakeDb(liveRow({ category: "waterlogging" }));
  await confirmReport(db, { reportId: "r1", userId: "someone-else" });
  assert.equal(db.audit.length, 1);
  // `action` is a closed enum in the live schema; the verb lives in meta.
  assert.equal(db.audit[0].action, "notify");
  assert.match(db.audit[0].meta, /confirmed/);
  assert.equal(db.audit[0].actorId, "someone-else");
  assert.equal(db.audit[0].reportId, "r1");
  assert.match(db.audit[0].meta, /ttl:12h/);
});
