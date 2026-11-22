import test from "node:test";
import assert from "node:assert/strict";
import { confirmReportDeletion } from "./deletion.js";

const report = { placeLabel: "Mirpur Road" };

test("deletion requires an explicit confirmation", () => {
  assert.equal(confirmReportDeletion(report, () => false), false);
  assert.equal(confirmReportDeletion(report, () => true), true);
});

test("confirmation identifies the report and states what deleting does", () => {
  let message = "";
  confirmReportDeletion(report, (text) => {
    message = text;
    return false;
  });
  assert.match(message, /Mirpur Road/);
  // Deleting hides the report from the public map but keeps the record, so the
  // copy must not threaten permanent destruction it no longer performs.
  assert.match(message, /public map/i);
  assert.match(message, /log/i);
  assert.doesNotMatch(message, /cannot be undone/i);
  assert.doesNotMatch(message, /permanently delete/i);
});
