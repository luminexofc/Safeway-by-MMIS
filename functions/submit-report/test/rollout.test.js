import test from "node:test";
import assert from "node:assert/strict";

// These assert the rollout safety rule: the code must work in either order —
// functions deployed first, or schema migrated first. Breaking a live report
// form to ship a feature is not acceptable.

const structural = () => {
  const e = new Error('Invalid document structure: Unknown attribute: "expiresAt"');
  e.code = 400;
  e.type = "row_invalid_structure";
  return e;
};

// Mirrors the retry in submit-report's main handler.
async function createWithFallback(db, freshData, baseData) {
  try {
    return await db.createRow({ data: freshData });
  } catch (e) {
    if (e.type !== "row_invalid_structure") throw e;
    return db.createRow({ data: baseData });
  }
}

test("filing survives a schema that has no freshness columns yet", async () => {
  const calls = [];
  const db = {
    createRow: async ({ data }) => {
      calls.push(data);
      if ("expiresAt" in data) throw structural();
      return { $id: "new", ...data };
    },
  };

  const base = { placeLabel: "A to B", lat: 1, lng: 2, depth: "knee", status: "pending", reporterId: "u1" };
  const fresh = { ...base, category: "waterlogging", expiresAt: "2026-11-23T00:00:00.000Z" };
  const row = await createWithFallback(db, fresh, base);

  assert.equal(calls.length, 2, "the fallback must retry exactly once");
  assert.ok(!("expiresAt" in calls[1]), "the retry must omit the missing column");
  assert.ok(!("category" in calls[1]), "category is equally absent");
  // The report itself is intact: only the optional freshness fields are lost.
  assert.equal(row.placeLabel, "A to B");
  assert.equal(row.status, "pending");
});

test("a genuine write failure is not swallowed by the fallback", async () => {
  const db = {
    createRow: async () => {
      const e = new Error("nope");
      e.code = 500;
      e.type = "general_unknown";
      throw e;
    },
  };
  await assert.rejects(() => createWithFallback(db, { a: 1 }, { a: 1 }), /nope/);
});

test("once the columns exist the row carries its expiry", async () => {
  const db = { createRow: async ({ data }) => ({ $id: "new", ...data }) };
  const fresh = { placeLabel: "A to B", category: "protest", expiresAt: "2026-11-23T00:00:00.000Z" };
  const row = await createWithFallback(db, fresh, { placeLabel: "A to B" });
  assert.equal(row.category, "protest");
  assert.equal(row.expiresAt, "2026-11-23T00:00:00.000Z");
});
