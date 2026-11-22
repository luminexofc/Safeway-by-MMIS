import test from "node:test";
import assert from "node:assert/strict";
import { overSubmitLimit, SUBMIT_LIMIT, SUBMIT_WINDOW_MS } from "../src/ratelimit.js";

// The limit decides whether a real person can file a report, so both sides
// matter: a busy account is stopped, and an outage never blocks filing.

function fakeDb({ total, throws = false }) {
  const calls = [];
  return {
    calls,
    async listRows(args) {
      calls.push(args);
      if (throws) throw new Error("503 service unavailable");
      return { total, rows: [] };
    },
  };
}

test("under the allowance the report is allowed", async () => {
  const db = fakeDb({ total: SUBMIT_LIMIT - 1 });
  assert.equal(await overSubmitLimit(db, "u1"), false);
  assert.equal(db.calls.length, 1);
});

test("at the allowance the report is refused", async () => {
  assert.equal(await overSubmitLimit(fakeDb({ total: SUBMIT_LIMIT }), "u1"), true);
});

test("above the allowance the report is refused", async () => {
  assert.equal(await overSubmitLimit(fakeDb({ total: SUBMIT_LIMIT + 7 }), "u1"), true);
});

test("a failed count allows the report rather than breaking filing", async () => {
  assert.equal(await overSubmitLimit(fakeDb({ throws: true }), "u1"), false);
});

test("a malformed total does not block a real submission", async () => {
  assert.equal(await overSubmitLimit(fakeDb({ total: undefined }), "u1"), false);
});

test("the query is scoped to this reporter and this window", async () => {
  const db = fakeDb({ total: 0 });
  const now = Date.parse("2026-11-22T12:00:00.000Z");
  await overSubmitLimit(db, "u1", { now });
  const queries = db.calls[0].queries.map((q) => JSON.parse(q));
  const reporter = queries.find((q) => q.attribute === "reporterId");
  const since = queries.find((q) => q.attribute === "$createdAt");
  assert.equal(reporter.values[0], "u1");
  assert.equal(since.method, "greaterThan");
  assert.equal(since.values[0], new Date(now - SUBMIT_WINDOW_MS).toISOString());
});
