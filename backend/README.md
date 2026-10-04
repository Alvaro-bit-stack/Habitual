# Habitual backend

This is a working Azure Functions Node v4 API with Azure SQL persistence, optional Entra External ID sign-in, and an offline-capable web client. It is **prepared locally, not deployed**. No Azure subscription is needed for the local test server.

## Try it locally

Use Node 22 or newer and Python 3. From the repository root:

```sh
python build.py
cd backend
npm ci
npm run dev
```

Open `http://127.0.0.1:7071/Habitual.html`. Complete onboarding or use the sample flow, open **Me → Your saved progress → Connect local test account**. The loopback server uses a clearly marked Alice test account. Its durable JSON database is in ignored `backend/data/local.json`; it is a development adapter, not the Azure SQL implementation. Stop it with Ctrl+C. The Functions entry point never imports the development authentication or file store.

To move progress from an older file preview, export its JSON backup, then use **Import backup** in the hosted app. Browser storage is separate for each origin. Importing asks for confirmation and backs up the current account first.

Signing in opens a separate account cache. Existing device progress remains untouched. Use **Use original device progress** to explicitly import it (a confirmation and account backup are created). Edit hobbies, disconnect, reload the page, and reconnect. The app shell must first have been opened online and installed by the service worker; browsers require HTTPS in production (localhost is allowed). The first offline page load after a never-visited URL cannot work. Font/3D CDN downloads aren't required to read hobbies; 3D effects may be unavailable offline.

The local server binds only to `127.0.0.1`, rejects foreign Origin/Host headers, and accepts only `local-demo-alice` or `local-demo-bob` bearer values. For API tests, use `Authorization: Bearer local-demo-alice`. Do not publish the local server.

## What is implemented

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | Health response (requires valid runtime configuration in Functions) |
| `GET /api/me` | Identity derived from the verified access token |
| `GET /api/me/state` | Private progress snapshot and revision; revision 0 means no cloud copy |
| `PUT /api/me/state` | Validate/save snapshot with `If-Match: "<revision>"`; stale updates return 409 and the current copy |
| `GET /api/events` | Up to 200 future events, counts and this user's confirmed RSVP |
| `POST /api/events` | Create a dated event; host identity comes from the token |
| `PUT /api/events/:id/attendance` | `{ "going": true/false }`; idempotent, capacity checked under a serializable SQL transaction |
| `GET /api/friends` | `{ code, friends:[{code,name,character,xp}], incoming:[…], outgoing:[…] }`; your 8-character friend code is created on first use |
| `POST /api/friends` | `{ "code": "ABCD2345" }` sends a request; if they already asked you, you become friends. Max 50 pending |
| `PUT /api/friends/:code` | `{ "accept": true/false }` answers an incoming request |
| `GET /api/friends/search?q=` | Find people by app name (2–40 chars, max 10 results, 60 searches per 10 min). Returns `{code,name,character,status}`; never yourself, never people who opted out or haven't set a name |
| `PUT /api/friends/settings` | `{ "discoverable": true/false }`: whether others can find you by name (default on) |
| `DELETE /api/friends/:code` | Removes a friend or cancels a request (either side) |
| `POST /api/path` | `{ hobbyId \| hobbyName, tier: "new"\|"beginner"\|"intermediate"\|"advanced" }` → Gemini practice path `{ hobby, tier, steps:[{title,detail,minutes}], cached }`. Catalog hobbies are cached 14 days and shared; custom names are never cached. 10 Gemini calls per user per day (`AI_DAILY_LIMIT`) |

Friends see only your app name, character and XP, refreshed whenever your progress saves. The Gemini key is read on the server only.

## Hosting (current): one App Service

`infra/main.bicep` + `infra/deploy.sh <name> [region]` run **`server.js`** on Azure App Service. It serves the app, the Gemini Discover guides and this API under one origin, so there is no CORS. Azure SQL uses the free serverless offer and Entra-only sign-in. The web app's managed identity gets row access to the tables and nothing else. The Gemini key sits in Key Vault, and FTP/basic-auth deploys are off. The Functions entry (`src/functions.js`) still works if the team later prefers Functions. Accounts switch on when the web app has `AUTH_ISSUER`, `AUTH_JWKS_URI`, `AUTH_AUDIENCE`, `AUTH_AUTHORITY`, `SPA_CLIENT_ID` and `SPA_SCOPE`; until then `/api/me|events|friends|path` answer 503 and the app runs device-only.

Events use `title`, `place`, `hobbyId`, `level`, `spots`, and `startsAt` (ISO timestamp with a timezone). Live event creation is available through the API; there is not yet an organizer creation screen. When signed in, Community uses these events instead of the demo catalog, and RSVP animations run only after confirmation. Live check-in/XP awards, shared group posts, delivered invitations, and messaging are not implemented by this first backend; the current sample/local versions remain separate. Profile XP is a **private, client-reported progress backup**, not trusted public rankings or rewards.

## Offline and conflict behavior

- Personal progress remains in browser device storage. The existing guest key `sidequest.v1` is preserved. Each authenticated identity uses `habitual.account.<opaque-user-id>`.
- The latest durable local snapshot is the outbox; the last acknowledged cloud snapshot and revision are stored beside it. No queue or network connection is needed to read hobbies. Local changes are retried on reconnect, focus and periodically while visible.
- If both cloud and device changed, sync stops and Me offers **Keep this device** or **Use cloud progress**. A device backup is saved before either choice. Neither version is silently lost. A failed backup prevents replacement.
- Device edits made during an upload remain pending. Sign-out stops that account's sync and retains its pending data. Signing in again resumes it. Different accounts do not share progress.
- A service worker caches the public app shell only. API, authentication, cloud configuration and third-party responses are never cached by it. Signed access tokens are kept by MSAL in session storage, not in progress snapshots.
- Browser storage is not a permanent backup: deleting site data, private browsing or storage eviction can remove it. The app requests persistent storage where supported, reports write failures and offers a JSON export. Azure sync provides the second copy once configured. A native mobile client can later replace browser storage with SQLite using the same API/revision contract.
- RSVPs need an online server confirmation. Offline users can view the cached event list, but the app does not promise an unconfirmed spot.

## Azure setup when the subscription is ready

1. Create an **Entra External ID external tenant**, a customer sign-up/sign-in user flow, a SPA application registration, and a separate API registration. Associate the SPA with the user flow. In the API registration expose a delegated `access_as_user` scope; grant the SPA that permission and consent as required. Register the exact HTTPS SPA redirect URL ending in `/auth.html`. No client secret belongs in the browser.
2. Create an Azure Functions v4 **Node 22** app with its required Azure Storage account. Enable a system-assigned managed identity. Create Azure SQL Database and configure a Microsoft Entra administrator. Choose networking that allows the Function app to reach SQL (private networking where available, or narrowly scoped firewall rules).
3. Apply `sql/001-initial.sql` using an administrator/deployment identity. For local migrations with Azure CLI sign-in, set `SQL_SERVER` and `SQL_DATABASE`, then run `npm run migrate`. The runtime identity does not need schema-change permissions. In the database, create the Function identity user and grant access to only these tables:

```sql
CREATE USER [YOUR-FUNCTION-APP-NAME] FROM EXTERNAL PROVIDER;
GRANT SELECT, INSERT, UPDATE ON dbo.UserProgress TO [YOUR-FUNCTION-APP-NAME];
GRANT SELECT, INSERT ON dbo.Events TO [YOUR-FUNCTION-APP-NAME];
GRANT SELECT, INSERT, DELETE ON dbo.Attendance TO [YOUR-FUNCTION-APP-NAME];
```

4. Set Function application settings using `local.settings.example.json` as the list of names. Set `SQL_SERVER`, `SQL_DATABASE`, `AUTH_AUDIENCE` (the API application client ID for v2 tokens), `AUTH_SCOPE`, `AUTH_ISSUER`, and `AUTH_JWKS_URI`. Take the **exact issuer and jwks_uri from your tenant's OpenID discovery document**; do not guess these from a display name. The app independently verifies signature, issuer, audience, expiry and delegated scope. `authLevel: anonymous` only disables Functions keys; it does not disable bearer validation. Configure CORS for the exact frontend origin. Do not use a wildcard.
5. Install dependencies and publish `backend/` with Azure Functions Core Tools v4 (`func azure functionapp publish YOUR-FUNCTION-APP --build remote`) or the equivalent Azure deployment pipeline. Keep local settings, test data and secrets out of the deployment. Confirm `GET /api/me/state` is 401 without a bearer token, and test two real customer accounts before enabling users.
6. Copy root `cloud-config.example.json` to ignored `cloud-config.json`, fill in the public SPA client ID, authority, API scope and API URL, and set `enabled` to true. Run `python build.py`. Host the **whole `dist/` folder** over HTTPS (for example Azure Static Web Apps): `Habitual.html`, `models/`, `auth.html`, `cloud-config.json`, `sw.js`, manifest and icon. Set the entry page to `/Habitual.html`. Do not route `/auth.html` to the application shell. No API secret is shipped to the browser.
7. Verify sign-in, cold reload, an offline hobby edit followed by reconnect, two-device conflict resolution, and two users competing for a final event spot against the actual Azure SQL deployment. Local tests do not substitute for this deployment check.

There are no deployed resources, Azure credentials, billing assumptions or silently enabled cloud features in the checked-in configuration. Rate limiting, observability/alerts, retention and account deletion policies should be configured before opening the API to a public audience.

## Tests

```sh
cd backend
npm test
cd ..
node --test tests/sync.test.js tests/cloud-integration.test.js
node tests/engine.test.js
node tests/community.test.js
node tests/data.check.js
```

Tests cover authentication, authorization, concurrent capacity, idempotent attendance, revision conflicts, restart persistence, offline/reconnect, account separation, late responses after sign-out, and the service-worker cache boundary. SQL needs an Azure database to run end-to-end; the local adapter exercises the shared API contract.

References: [Functions Node guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node), [SQL managed identity](https://learn.microsoft.com/en-us/azure/azure-functions/functions-identity-access-azure-sql-with-managed-identity), [External ID](https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview).

