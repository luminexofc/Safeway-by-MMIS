export function confirmReportDeletion(report, confirm = globalThis.confirm) {
  return confirm(
    `Delete the report at “${report.placeLabel}”?\n\n` +
      "It disappears from the public map immediately. The report, its photo and its " +
      "history stay here and in the operations log, marked as Deleted.",
  );
}
