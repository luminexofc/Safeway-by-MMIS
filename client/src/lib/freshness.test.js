import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_CATEGORY,
  HOUR,
  TTL_MS,
  categoryFromNote,
  categoryOf,
  expiryTimeOf,
  isLive,
  ttlFor,
} from "./freshness.js";

const iso = (ms) => new Date(ms).toISOString();
const NOW = Date.parse("2026-11-22T12:00:00.000Z");

test("each occurrence type has its own lifetime, jam shortest", () => {
  assert.equal(TTL_MS.traffic_jam, 1 * HOUR);
  assert.equal(TTL_MS.protest, 4 * HOUR);
  assert.equal(TTL_MS.waterlogging, 12 * HOUR);
  assert.equal(TTL_MS.road_hazard, 7 * 24 * HOUR);
  assert.ok(TTL_MS.traffic_jam < TTL_MS.protest);
  assert.ok(TTL_MS.protest < TTL_MS.waterlogging);
  assert.ok(TTL_MS.waterlogging < TTL_MS.road_hazard);
});

test("unknown category falls back to the default instead of never expiring", () => {
  assert.equal(ttlFor("nonsense"), TTL_MS[DEFAULT_CATEGORY]);
  assert.equal(ttlFor(undefined), TTL_MS[DEFAULT_CATEGORY]);
});

test("category is read back from the wizard's note", () => {
  assert.equal(categoryFromNote("[Report Type: Traffic jam]\nNote: bus"), "traffic_jam");
  assert.equal(categoryFromNote("[Report Type: Protest / Rally]"), "protest");
  assert.equal(categoryFromNote("[Report Type: Road hazard]"), "road_hazard");
  assert.equal(categoryFromNote("[Report Type: Waterlogging]"), "waterlogging");
  assert.equal(categoryFromNote("no tag here"), null);
  assert.equal(categoryFromNote(undefined), null);
});

test("explicit category wins over the note, note covers old rows", () => {
  assert.equal(categoryOf({ category: "protest", note: "[Report Type: Waterlogging]" }), "protest");
  assert.equal(categoryOf({ note: "[Report Type: Traffic jam]" }), "traffic_jam");
  assert.equal(categoryOf({}), DEFAULT_CATEGORY);
});

test("a row with a stored expiry uses it verbatim", () => {
  const exp = NOW + 3 * HOUR;
  assert.equal(expiryTimeOf({ expiresAt: iso(exp), $createdAt: iso(NOW - 100 * HOUR) }), exp);
});

test("without a stored expiry, the lifetime is derived from when it was filed", () => {
  const row = { $createdAt: iso(NOW - 2 * HOUR), note: "[Report Type: Traffic jam]" };
  assert.equal(expiryTimeOf(row), NOW - 2 * HOUR + 1 * HOUR);
  assert.equal(isLive(row, NOW), false, "a two-hour-old jam is over");
});

test("the reported bug: reports from months ago are not live", () => {
  const old = { $createdAt: iso(NOW - 60 * 24 * HOUR), note: "[Report Type: Waterlogging]" };
  assert.equal(isLive(old, NOW), false);
});

test("a fresh report is live", () => {
  const row = { $createdAt: iso(NOW - 10 * 60 * 1000), note: "[Report Type: Waterlogging]" };
  assert.equal(isLive(row, NOW), true);
});

test("a road hazard outlives a jam from the same moment", () => {
  const at = NOW - 3 * HOUR;
  assert.equal(isLive({ $createdAt: iso(at), category: "traffic_jam" }, NOW), false);
  assert.equal(isLive({ $createdAt: iso(at), category: "road_hazard" }, NOW), true);
});

test("decided reports are never live, regardless of time", () => {
  const fresh = { $createdAt: iso(NOW), status: "discarded" };
  assert.equal(isLive(fresh, NOW), false);
  assert.equal(isLive({ ...fresh, status: "flagged_abuse" }, NOW), false);
});

test("an undated row is not silently dropped or shown forever", () => {
  // No createdAt and no expiresAt: nothing to reason about, so it stays and
  // the map keeps whatever it showed before rather than hiding real data.
  assert.equal(expiryTimeOf({}), null);
  assert.equal(isLive({}, NOW), true);
});
