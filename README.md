# Safeway: Bangladesh-wide waterlogging safety

Two websites, one backend API. No demo accounts, no hardcoded personal data.

## Sites

| Site | Folder | Dev | Serves |
|---|---|---|---|
| Public app (nationwide) | `client/` | `npm run dev` → :5173 | Map, routing, reporting, verification tracking, settings |
| Verification console (restricted operators) | `admin/` | `npm run dev` → :5174 | Login, nationwide review queue, ops log |

The public app has **zero admin entry points** by design. See `admin/README.md`
for the connection contract (shared Appwrite backend, `operators` team gate,
FCM fan-out).

## Backend

Appwrite (region: sgp) — the only backend. Both sites are thin clients over
the Appwrite Web SDK; there is no custom REST API anymore.

| Layer | Where | Notes |
|---|---|---|
| Auth | Appwrite Auth (`client/src/lib/appwrite.js`) | email/password + Google OAuth2, recovery, email verification |
| Database | TablesDB `safeway` | `divisions`, `districts`, `profiles`, `reports`, `audit_events` |
| Storage | bucket `report-photos` | 5 MB max, jpg/png/webp, encryption + antivirus, per-file perms (uploader-only at upload; `submit-report` adds operator read) |
| Functions | `submit-report`, `verify-report` | forced-pending creation + user-driven report/account deletion; operator decisions + audit + FCM push |
| Push | Messaging topics `division-*` | one per division; FCM provider created only when configured |

Roles: public users authenticate normally; only members of the `operators`
team can sign into the console. Test accounts are never in that team.

### Appwrite setup (one-time)

Functions need two project API keys; the runtime key must NOT be able to
escalate (mint keys or deploy code). The MCP/provisioning identity cannot
mint keys, so create them once by hand:

1. Console → Safeway project → **Settings → API keys** → create `safeway-deploy`
   with scopes: `functions.read`, `functions.write`. This one only creates and
   deploys functions.
2. Create `safeway-functions` with scopes: `rows.read`, `rows.write`,
   `files.read`, `files.write`, `users.write`, `teams.read`, `messages.write`.
3. Put both in `.env.appwrite` as `APPWRITE_DEPLOY_API_KEY` and
   `APPWRITE_FUNCTIONS_API_KEY` (gitignored) and tell the agent; it deploys
   the functions and stores the runtime key as each function's secret
   `SERVER_API_KEY` variable (the platform's own `APPWRITE_API_KEY` injection
   is invalid on this project, so the code prefers `SERVER_API_KEY`).

Function settings (console): `submit-report` executes for `users` and
deploys with build command `npm install`; `verify-report` executes for
`team:operators`. API key scopes per function are assigned in the console —
save them with the page's **Save** button, or the change stays an unsaved
draft. REST deployments from a key only run `npm install` when the function
has a build command, so `verify-report` must be deployed with
`node_modules` bundled (what the agent does), or give it `npm install` as
its console build command.

Per-photo permissions: a signed-in uploader may only grant roles they hold,
so reports are uploaded with own-read only; `submit-report` proves ownership
and widens the file to `team:operators` server-side when the report is filed.

FCM push (optional): console → Messaging → create an FCM provider with your
Firebase service-account JSON, or put its path in
`FCM_SERVICE_ACCOUNT_JSON_PATH`. Without it, verify still works; the push
send is recorded as skipped in `audit_events`.

Operators: after an operator signs up, add their user id to the `operators`
team (console → Teams, or ask the agent).

## Coverage

Nationwide across all 8 divisions of Bangladesh (Dhaka, Chattogram, Sylhet,
Khulna, Rajshahi, Barishal, Rangpur, Mymensingh). The map centers on the
user's live location with a country fallback, never locked to one neighbourhood.

## Live map (no demo pins)

- **Dashboard / Report**: browser Geolocation centers the map; report markers
render from the live `reports` table (verified = danger/blocked, unverified =
caution). Falls back to a country-wide Bangladesh view when permission is denied.
- **Navigate**: addresses are geocoded live (OpenStreetMap Nominatim,
Bangladesh-biased) with suggestion dropdowns, and road geometry comes from
the OSRM router, so the map moves to whatever address is typed.
- Waterlogging safety colors (Green ×1 / Yellow ×1.5–×5 / Red ×∞) are driven
by verified reports; until a route exists the UI labels the live route
honestly instead of painting sample colors on it.
