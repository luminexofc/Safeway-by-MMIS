import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  HOUR,
  REVIVE_WINDOW_MS,
  TTL_MS,
  canConfirm,
  categoryFromNote,
  expiryFor,
  isLive,
  resolveCategory,
  ttlFor,
} from "../src/freshness.js";

const iso = (ms) => new Date(ms).toISOString();
const NOW = Date.parse("2026-11-22T12:00:00.000Z");

test("expiry is a lifetime from now, per category", () => {
  assert.equal(expiryFor("traffic_jam", NOW), iso(NOW + 1 * HOUR));
  assert.equal(expiryFor("protest", NOW), iso(NOW + 4 * HOUR));
  assert.equal(expiryFor("waterlogging", NOW), iso(NOW + 12 * HOUR));
  assert.equal(expiryFor("road_hazard", NOW), iso(NOW + 7 * 24 * HOUR));
});

test("every supported category has a real lifetime", () => {
  for (const c of CATEGORIES) {
    assert.ok(TTL_MS[c] > 0, `${c} must expire`);
    assert.equal(ttlFor(c), TTL_MS[c]);
  }
});

test("an unsupported category cannot create an immortal report", () => {
  assert.equal(resolveCategory("banana", undefined), DEFAULT_CATEGORY);
  assert.equal(resolveCategory(undefined, undefined), DEFAULT_CATEGORY);
});

test("the note remains a valid fallback for clients that send no category", () => {
  assert.equal(resolveCategory(undefined, "[Report Type: Protest / Rally]"), "protest");
  assert.equal(resolveCategory("road_hazard", "[Report Type: Protest / Rally]"), "road_hazard");
});

test("isLive honours a stored expiry and treats a missing one as live", () => {
  assert.equal(isLive({ expiresAt: iso(NOW + 1) }, NOW), true);
  assert.equal(isLive({ expiresAt: iso(NOW - 1) }, NOW), false);
  // Pre-migration rows: the backfill, not the read path, decides their fate.
  assert.equal(isLive({}, NOW), true);
});

test("a live report can always be re-confirmed", () => {
  assert.equal(canConfirm({ expiresAt: iso(NOW + 5 * HOUR) }, NOW), true);
});

test("a just-expired report can still be revived by someone standing there", () => {
  assert.equal(canConfirm({ expiresAt: iso(NOW - REVIVE_WINDOW_MS + 1000) }, NOW), true);
});

test("a long-expired report cannot be revived", () => {
  // Without this window a five-month-old report could be re-armed and the
  // original bug would come straight back.
  assert.equal(canConfirm({ expiresAt: iso(NOW - 60 * 24 * HOUR) }, NOW), false);
});

test("a row with no expiry is confirmable so the backfill can still trigger", () => {
  assert.equal(canConfirm({}, NOW), true);
});

test("categoryFromNote maps the labels the wizard writes", () => {
  assert.equal(categoryFromNote("[Report Type: Traffic jam]"), "traffic_jam");
  assert.equal(categoryFromNote("[Report Type: Protest / Rally]"), "protest");
  assert.equal(categoryFromNote("[Report Type: Road hazard]"), "road_hazard");
  assert.equal(categoryFromNote("[Report Type: Waterlogging]"), "waterlogging");
});
