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

## Access model (no sign-up to look)

| Action | Account needed |
|---|---|
| Browse the safety map (`/map`), search, plan a way around a blockage | No |
| Read verified/pending report markers | No — `reports` rows carry `read("any")` |
| File a report, or open My reports | Yes — prompt on the action, then back to it |
| Operator review console | Yes — `operators` team only |

The landing header carries a dedicated **Map** button so a first-time visitor
reaches the live map in one press. Actions that need an account open a sign-in
prompt (`client/src/components/auth/SignInPrompt.jsx`) instead of bouncing to
`/login`, and the destination travels in router state so sign-in/sign-up lands
on the task the person started.

## Backend

Appwrite (region: sgp) — the only backend. Both sites are thin clients over
the Appwrite Web SDK; there is no custom REST API anymore.

| Layer | Where | Notes |
|---|---|---|
| Auth | Appwrite Auth (`client/src/lib/appwrite.js`) | email/password + Google OAuth2, recovery, email verification |
| Database | TablesDB `safeway` | `divisions`, `districts`, `profiles`, `reports`, `audit_events` |
| Storage | bucket `report-photos` | 5 MB max, jpg/png/webp, encryption + antivirus, per-file perms (uploader-only at upload; `submit-report` adds operator read) |
| Functions | `submit-report`, `verify-report` | forced-pending creation + user-driven report/account deletion; operator decisions + permanent deletion of any report (including its photos and report-related audit rows) + audit + FCM push |
| Push | Messaging topics `division-*` | one per division; FCM provider created only when configured |

Roles: public users authenticate normally; only members of the `operators`
team can sign into the console. Test accounts are never in that team.

Function identity: both functions resolve the caller **only** from a session
JWT (`account.createJWT()`), sent in the `x-safeway-jwt` header and verified
server-side with `Client.setJWT` + `Account.get`. `x-appwrite-user-id` is
never trusted — a caller can set arbitrary execution headers, so trusting it
would let any signed-in user act as anyone else. The JWT is valid for 15
minutes and dies with the session.

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

Web platforms (console → **Overview → Platforms → Add platform → Web**): every
hostname the site is served from must be registered there — `localhost` for
dev, plus each deployed site (e.g. `findsafeway.vercel.app`). Hostname only: no
`https://`, no path. A missing entry breaks Google sign-in with
`Invalid 'success' param: Invalid URI` and blocks Appwrite calls from that
origin. Vercel preview hosts change per deployment, so either register the one
you need or set `VITE_APP_URL` to the canonical site and use its sign-in link.

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

### Report freshness (why an old report leaves the map)

A jam, a rally and a waterlogged road are all temporary, but they are not
equally temporary. A report used to stay on the map forever once verified, so a
blockage from months ago still looked like a live hazard. It now carries an
honest lifetime:

| Occurrence | Default lifetime |
|---|---|
| Traffic jam | 1 hour |
| Protest / rally | 4 hours |
| Waterlogging | 12 hours |
| Road hazard | 7 days |

Constants live in `client/src/lib/freshness.js` and, mirrored,
`functions/submit-report/src/freshness.js` (the two deploy separately and cannot
share a module). Change both together.

Three layers keep a report honest:

1. **`expiresAt` at birth.** `submit-report` sets it from the report's category.
   A readonly filter (`fetchFeed`) drops rows past their expiry, so a stale
   report disappears on the next load even if no function ever runs. Expired
   rows are kept, not deleted: history, photos, and the audit trail survive.
2. **"Still there?"** A signed-in user who is not the author can confirm an
   occurrence from its map popup. This pushes `expiresAt` forward by the
   category's lifetime and writes a `confirmed` audit event. The author cannot
   self-confirm — that is exactly how one stale report lived for months. A
   report can only be revived within `REVIVE_WINDOW_MS` (2 hours) of expiring,
   so a five-month-old row cannot be re-armed.
3. **Operator "Clear from map".** In the console, a live verified report can be
   cleared the moment an operator knows the road is open again. It writes
   `expiresAt` = now, `resolvedAt`, and `resolvedBy`.

### Deleting a report

An operator can permanently delete any report from the admin console after
confirming the location and the destructive action. This includes pending
reports and verified reports currently visible on the public map.

The `verify-report` function independently validates the caller's session JWT
and confirmed membership in the `operators` team. It deletes the report's
photos, all report-related audit rows, and finally the report row. The report
therefore disappears from both the map and the console. This cannot be undone;
"Clear from map" is the separate, non-destructive option for an occurrence that
is over.


Rows filed before the `expiresAt` column existed are handled from `$createdAt`
and the `[Report Type: …]` tag the wizard already writes into `note`, so the map
is correct before any migration runs.

Schema (one-time, needs a key with `tables.read` + `columns.write`; the
functions key does not have schema scopes):

```bash
APPWRITE_MIGRATE_API_KEY=<schema-scoped key> node scripts/migrate-freshness.mjs --check
APPWRITE_MIGRATE_API_KEY=<schema-scoped key> node scripts/migrate-freshness.mjs --yes
```

It adds `category`, `expiresAt`, `lastConfirmedAt`, `resolvedAt`, `resolvedBy`,
then backfills every row. Rows already older than their lifetime get an expiry
in the past: they leave the map immediately and their data stays intact. The
script is safe to re-run.


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
