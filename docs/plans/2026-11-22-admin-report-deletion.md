# Admin Report Deletion Implementation Plan

> **For the implementing agent:** Follow test-driven development: write each failing test, run it, implement the minimal production change, and rerun it. Do not commit unless the user requests a commit.

**Goal:** Let an authenticated operator permanently delete any report, including verified reports currently displayed on the public map, after explicit confirmation in the admin console.

**Architecture:** Add an operator-only `delete` action to the existing `verify-report` Appwrite Function. Reuse the existing JWT and team-membership authorization and the tested report/photo/audit cleanup helper. Add a native confirmation dialog to the existing dashboard and reload its reports after successful deletion.

**Tech Stack:** React 19, Vite, Appwrite Web/Node SDKs, Node.js built-in test runner, oxlint.

## Understanding Summary

- Every submission status is eligible: pending, verified, discarded, and flagged_abuse.
- Verified submissions are those visible on the public map; deletion removes their report rows.
- Only a confirmed member of the operators team may delete.
- The operation permanently removes the report, its associated photos, and report-related audit records.
- The admin dashboard displays an actionable success or failure message.
- No restoration/archive, extra service, or new dependency is requested.
- Existing submission, review, public-map, and user-owned deletion behavior must remain intact.

## Decision Log

| Decision | Alternatives considered | Rationale |
|----------|-------------------------|-----------|
| Extend `verify-report` | Direct browser deletion; add admin behavior to `submit-report` | Reuses the existing operator request path and authorization. |
| All statuses eligible | Verified-only or reviewed-only deletion | Directly matches the user's clarification. |
| Native `confirm()` dialog | New modal component or dependency | Native keyboard/focus behavior without unnecessary UI code. |
| Reuse existing cleanup helper | Duplicate cleanup logic | Existing helper already provides ordered, retry-safe deletion. |
| Node test doubles for external Appwrite services | Live destructive integration testing | Tests behavior without deleting production data; runtime remains real Appwrite. |

## Task 1: Backend authorization and deletion

**Files:**
- Create: `functions/verify-report/src/delete.js`
- Create: `functions/verify-report/test/delete.test.js`
- Modify: `functions/verify-report/src/main.js`
- Modify: `functions/verify-report/package.json`

1. Write a failing test for `deleteReport`, using fake storage and database services. Assert that report photos are deleted before report-related audit rows and the report row, with 404 responses treated as retry-safe.
2. Run `node --test test/delete.test.js` in `functions/verify-report`; confirm failure because the cleanup module does not exist.
3. Extract the existing cleanup functions from `functions/submit-report/src/delete.js` into the new verify-function module without changing account deletion.
4. Run the focused test; confirm it passes.
5. Add a failing exported `deleteSubmission` test: a non-operator receives 403 before any lookup or deletion; pending and verified reports can both be deleted; the operator identity is obtained from the verified JWT; storage failures propagate without deleting the report row.
6. Run the test and confirm the expected missing-export failure.
7. Implement `deleteSubmission` using injected Appwrite service factories and caller resolution. Validate the report ID, confirm membership, load the row without a status restriction, and invoke cleanup.
8. Run the focused test and confirm it passes.
9. Wire `body.action === "delete"` to the new handler, retain the existing verify/discard/flag behavior, and add the test script to package.json.
10. Run the new function suite plus `npm test` in `functions/submit-report`.

## Task 2: Admin confirmation and deletion control

**Files:**
- Modify: `admin/src/pages/AdminDashboard.jsx`

1. Add a native-dialog helper test for cancellation and confirmation; browser interaction remains separately unverified when no operator credentials are available.
2. Add a Delete button to every report row, not just pending rows.
3. Confirm with a native dialog naming the report and describing permanent deletion.
4. On confirmation, call `verify-report` with `{ reportId, action: "delete" }`.
5. Disable only the affected row's actions while a request is in progress; show a `role="status"` success message or the existing `role="alert"` error; reload reports and audit events on success.
6. Run `npm run lint` and `npm run build` in `admin`.

## Task 3: Documentation and final verification

**Files:**
- Modify: `README.md`
- Modify: `admin/README.md`

1. Document operator deletion and permanent associated-data cleanup.
2. Review only the deletion-related diff; do not modify unrelated existing user changes.
3. Run all available function tests, admin lint/build, and an admin dependency security audit.
4. If browser credentials are available, exercise pending and verified deletion against a controlled test report. Otherwise report live integration as unverified rather than deleting real data.
