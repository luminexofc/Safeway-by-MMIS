# Findings & Decisions: Admin Report Deletion

## Requirements
- Delete any submission status from the admin panel, including verified reports currently displayed on the public map.
- Require confirmation and server-side operator authorization.
- Permanently remove the report, photos, and report-related audit rows; refresh the UI.
- Preserve existing public submission/review and user-owned deletion paths.

## Research Findings
- AdminDashboard calls the Appwrite `verify-report` function for review actions; pending-only buttons are currently rendered.
- verify-report validates a session JWT and checks operators-team membership server-side.
- submit-report's delete.js has a reusable `deleteReport` helper with ordered cleanup and missing-resource retry tolerance.
- There is no admin JSX test harness; functions use Node's built-in test runner.
- The public map reads report rows, so successful row deletion removes the map entry.
- Existing unrelated working-tree edits must remain untouched.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| verify-report delete action | Minimal secure integration with current admin architecture. |
| No report-status condition in delete handler | User explicitly allowed pending and posted reports. |
| Native confirm | Minimal accessible destructive-action confirmation. |
| Node service fakes | Verify logic without destructive live-data calls. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| testing-anti-patterns reference initially missing | Loaded from the TDD skill resources. |

## Resources
- `functions/verify-report/src/main.js`
- `functions/submit-report/src/delete.js`
- `admin/src/pages/AdminDashboard.jsx`
- `admin/src/lib/appwrite.js`
