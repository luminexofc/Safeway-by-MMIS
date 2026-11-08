# Safeway Verification Console (separate operator website)

Restricted admin site for verifying waterlogging reports across **all of Bangladesh**.
It is a **separate website** from the public app in `../client`, connected through
the **same Appwrite backend** (no custom REST API).

## Run

```bash
npm install
npm run dev      # http://localhost:5174
```

The public app runs separately:

```bash
cd ../client
npm run dev      # http://localhost:5173
```

## How the two sites connect

| Concern | Wiring |
|---|---|
| Shared backend | Both sites use the same Appwrite project via `VITE_APPWRITE_ENDPOINT` + `VITE_APPWRITE_PROJECT_ID` (see `.env`). |
| Auth | Appwrite Auth email/password (or Google OAuth). Public app signs in as a normal user. |
| Operator gate | Console requires membership in the Appwrite **operators** team. `admin/src/lib/operator.jsx` checks `teams.listMemberships`; non-members see a "Not an operator" screen. Public users are never added to the team. |
| Verification flow | Console Verify / Flag / Discard → calls the `verify-report` Appwrite Function with `{ reportId, action }`. The function checks team membership server-side, flips `reports.status`, writes an `audit_events` row, and (when verified) pushes to the `division-*` Messaging topic for FCM fan-out. |
| Submit flow | Public app creates reports only via the `submit-report` Function (forces `status=pending`), so clients can never forge a verified report. |
| Map feed | Public map reads the `reports` table directly (rows are readable by all signed-in users; only operators can update). |
| Ops log | Console reads the append-only `audit_events` table (operators only). |
| CORS | Appwrite handles this; add the two dev origins (:5173, :5174) and production origins to the project's platform allow-list in the console. |
| No shared code | The console vendors its own copy of the design tokens. No imports from `../client`. |

## Cross-links

- Console header → “View main app” (`VITE_MAIN_SITE_URL`).
- Console login → “Open the Safeway app” for the public.
- The public app contains **zero** admin entry points by design.

## Adding an operator

1. The person signs up on the public app (creates an Appwrite Auth user).
2. Add their user id to the `operators` team (console → Teams → `operators`,
   or ask the agent). Membership activates immediately on next sign-in.
