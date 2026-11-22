# Task Plan: Admin Report Deletion

## Goal
Allow a confirmed operator to permanently delete any admin-panel submission, including a verified report visible on the public map, with explicit confirmation and complete associated-data cleanup.

## Current Phase
Complete: permanent deletion, JWT isolation, reviewer fixes, and focused/full validation.

## Phases
- [x] Requirements and discovery: confirmed all statuses and permanent deletion.
- [x] Planning: extend verify-report, reuse cleanup, native confirmation.
- [x] Backend: failing tests, operator deletion handler, function routing.
- [x] Admin: delete control, confirmation, feedback, reload.
- [x] Validation: tests, lint/build/audit, documentation, adversarial diff review.

## Key Questions
1. Which reports are eligible? All statuses, including verified map reports.
2. How is authorization established? Session JWT plus server-side operators-team membership.

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Extend verify-report | Existing admin-only server boundary. |
| Reuse existing deletion helper | Tested photo/audit/row cleanup and retry behavior. |
| Native confirm dialog | Accessible confirmation without new dependencies. |
| Do not touch unrelated work | Existing user modifications are present in client and submit-report main. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Read testing-anti-patterns.md under testing-patterns | 1 | Found the reference in test-driven-development instead. |
| Concurrent soft-delete rewrites conflicted with permanent-deletion contract | 3 | User selected option A; restored permanent deletion, separate JWT client, and removed conflicting soft-delete code/tests. |
| Reviewer found leftover soft-delete UI | 1 | Removed isDeleted filtering/styling; Delete remains on every row and confirmation states permanent deletion. |

## Notes
See docs/plans/2026-11-22-admin-report-deletion.md for executable steps. No commits or live production deletion without a separate user request.
