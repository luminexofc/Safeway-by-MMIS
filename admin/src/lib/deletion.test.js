import test from "node:test";
import assert from "node:assert/strict";
import { confirmReportDeletion } from "./deletion.js";

const report = { placeLabel: "Mirpur Road" };

test("deletion requires an explicit confirmation", () => {
  assert.equal(confirmReportDeletion(report, () => false), false);
  assert.equal(confirmReportDeletion(report, () => true), true);
});

test("confirmation identifies the report and warns that deletion is permanent", () => {
  let message = "";
  confirmReportDeletion(report, (text) => {
    message = text;
    return false;
  });
  assert.match(message, /Mirpur Road/);
  assert.match(message, /permanently delete/i);
  assert.match(message, /photos and activity history/i);
  assert.match(message, /cannot be undone/i);
});
