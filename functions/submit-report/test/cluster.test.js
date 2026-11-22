import test from "node:test";
import assert from "node:assert/strict";
import {
  THRESHOLD,
  RADIUS_M,
  metersBetween,
  boundingBox,
  reportersNear,
  autoVerifyCluster,
} from "../src/cluster.js";

// A fake db that records writes, so publishing is asserted not assumed.
function fakeDb(rows) {
  const updated = [];
  const audits = [];
  return {
    updated,
    audits,
    async listRows() {
      return { rows };
    },
    async updateRow({ rowId, data }) {
      updated.push({ rowId, data });
    },
    async createRow({ data }) {
      audits.push(data);
    },
  };
}

const at = (id, reporterId, lat, lng, status = "pending") => ({
  $id: id,
  reporterId,
  lat,
  lng,
  status,
});

test("metersBetween: known distance in Dhaka", () => {
  // ~111 m for 0.001 degrees of latitude.
  const d = metersBetween(23.685, 90.3563, 23.686, 90.3563);
  assert.ok(d > 110 && d < 112, `got ${d}`);
});

test("metersBetween: distance is symmetric", () => {
  const a = metersBetween(24.8456, 89.3735, 24.85, 89.38);
  const b = metersBetween(24.85, 89.38, 24.8456, 89.3735);
  assert.ok(Math.abs(a - b) < 0.001);
});

test("boundingBox: contains the radius and its edge", () => {
  const box = boundingBox(24.8456, 89.3735, RADIUS_M);
  assert.ok(box.minLat < 24.8456 && box.maxLat > 24.8456);
  assert.ok(box.minLng < 89.3735 && box.maxLng > 89.3735);
  // A point exactly RADIUS_M north must be inside the box.
  const edge = 24.8456 + RADIUS_M / 111320;
  assert.ok(edge < box.maxLat, "box must include the radius edge");
});

test("reportersNear: counts unique reporters only", () => {
  const rows = [
    at("r1", "u1", 24.8456, 89.3735),
    at("r2", "u1", 24.8457, 89.3736),
    at("r3", "u2", 24.8458, 89.3737),
  ];
  const who = reportersNear(rows, 24.8456, 89.3735);
  assert.equal(who.size, 2, "u1 twice counts once");
});

test("reportersNear: ignores reports outside the radius", () => {
  const far = 24.8456 + 200 / 111320; // 200 m north
  const rows = [at("r1", "u1", 24.8456, 89.3735), at("r2", "u2", far, 89.3735)];
  assert.equal(reportersNear(rows, 24.8456, 89.3735).size, 1);
});

test("reportersNear: discarded and flagged reports do not count", () => {
  const rows = [
    at("r1", "u1", 24.8456, 89.3735, "pending"),
    at("r2", "u2", 24.8456, 89.3735, "discarded"),
    at("r3", "u3", 24.8456, 89.3735, "flagged_abuse"),
    at("r4", "u4", 24.8456, 89.3735, "verified"),
  ];
  const who = reportersNear(rows, 24.8456, 89.3735);
  assert.deepEqual([...who].sort(), ["u1", "u4"]);
});

test("autoVerifyCluster: below the threshold publishes nothing", async () => {
  // Four reporters is not enough, no matter how many rows.
  const rows = [1, 2, 3, 4].flatMap((i) => [
    at(`r${i}a`, `u${i}`, 24.8456, 89.3735),
    at(`r${i}b`, `u${i}`, 24.8456, 89.3735),
  ]);
  const db = fakeDb(rows);
  const published = await autoVerifyCluster(db, { lat: 24.8456, lng: 89.3735, log: () => {} });
  assert.deepEqual(published, []);
  assert.equal(db.updated.length, 0, "nothing is written");
});

test("autoVerifyCluster: at the threshold publishes the whole cluster", async () => {
  const rows = [1, 2, 3, 4, 5].map((i) => at(`r${i}`, `u${i}`, 24.8456, 89.3735));
  const db = fakeDb(rows);
  const published = await autoVerifyCluster(db, { lat: 24.8456, lng: 89.3735, log: () => {} });
  assert.equal(published.length, THRESHOLD);
  assert.equal(db.updated.length, THRESHOLD);
  for (const u of db.updated) {
    assert.equal(u.data.status, "verified");
    assert.equal(u.data.verifiedBy, "auto:quorum");
    assert.ok(u.data.verifiedAt);
  }
  assert.equal(db.audits.length, THRESHOLD, "each publish is audited");
  // `action` is a closed enum in the live schema (submitted, verified,
  // discarded, flagged_abuse, notify), so an auto-publish records the verb in
  // meta and the category in action.
  assert.equal(db.audits[0].action, "verified");
  assert.match(db.audits[0].meta ?? "", /auto_verified/);
});

test("autoVerifyCluster: only pending rows are republished", async () => {
  const rows = [
    at("r1", "u1", 24.8456, 89.3735, "verified"),
    at("r2", "u2", 24.8456, 89.3735, "pending"),
    at("r3", "u3", 24.8456, 89.3735, "pending"),
    at("r4", "u4", 24.8456, 89.3735, "pending"),
    at("r5", "u5", 24.8456, 89.3735, "pending"),
  ];
  const db = fakeDb(rows);
  const published = await autoVerifyCluster(db, { lat: 24.8456, lng: 89.3735, log: () => {} });
  assert.equal(published.length, 4, "the already-verified row is left alone");
  assert.ok(!published.includes("r1"));
});

test("autoVerifyCluster: a read failure publishes nothing", async () => {
  const db = {
    async listRows() { throw new Error("boom"); },
    async updateRow() { throw new Error("must not be called"); },
    async createRow() { throw new Error("must not be called"); },
  };
  assert.deepEqual(await autoVerifyCluster(db, { lat: 1, lng: 2, log: () => {} }), []);
});
