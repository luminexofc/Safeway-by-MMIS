export function confirmReportDeletion(report, confirm = globalThis.confirm) {
  return confirm(
    `Permanently delete the report at “${report.placeLabel}”?\n\n` +
      "This removes it from the public map and permanently deletes its photos and activity history. This cannot be undone.",
  );
}
