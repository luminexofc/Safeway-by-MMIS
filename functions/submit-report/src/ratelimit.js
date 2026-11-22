import { Query } from "node-appwrite";

const DATABASE_ID = "safeway";
const REPORTS = "reports";

// Submission ceiling per account. Five different roads in one hour is already
// an unusually active reporter; more than that is a script. Each submission
// writes a row, may widen a photo permission, and can run the quorum check
// (itself a 100-row list), so an unbounded loop is both a bill and a way for
// one account to steer the auto-verify quorum on its own.
export const SUBMIT_WINDOW_MS = 60 * 60 * 1000;
export const SUBMIT_LIMIT = 5;

// True when this account has already filed its allowance in the window.
//
// Fails open: if the count cannot be read, refusing the report would break
// filing for everyone during an outage, which is worse than briefly allowing
// an extra one. The read is cheap and narrowed by reporterId.
export async function overSubmitLimit(db, userId, { now = Date.now() } = {}) {
  const cutoff = new Date(now - SUBMIT_WINDOW_MS).toISOString();
  const recent = await db.listRows({
    databaseId: DATABASE_ID,
    tableId: REPORTS,
    queries: [
      Query.equal("reporterId", userId),
      Query.greaterThan("$createdAt", cutoff),
      Query.limit(SUBMIT_LIMIT),
    ],
    total: true,
  }).catch(() => null);
  if (!recent) return false;
  return typeof recent.total === "number" && recent.total >= SUBMIT_LIMIT;
}
