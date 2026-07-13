# GStar Next.js attribution flow

## Routes

- `/` — migrated V3 landing page with a React application drawer.
- `/dashboard` — dashboard UX preview using representative campaign data.
- `/api/applications` — validated application endpoint.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run db:import
npm run dev
```

Application records, mentor data and Admin settings are stored through Prisma in `data/gstar.db`. Resume PDFs remain private files in `data/uploads/` when Local VPS storage is selected. Google Sheets sync is optional and runs in parallel.

`npm run db:import` is an idempotent one-time importer for legacy `submissions.ndjson` and JSON settings files. New installations can run it safely; it seeds the bundled mentor network when no legacy mentor file exists.

## Google Sheets setup

1. Create a Sheet and add a worksheet named `Applications`.
2. Add headers matching the order in `integrations/google-apps-script.gs`. The current form stores year of birth, current status, readiness signals and a private Google Drive URL for the uploaded PDF resume.
3. Open Extensions → Apps Script and paste `google-apps-script.gs`.
4. Set a strong shared secret in Apps Script and `.env.local`.
5. Deploy as a Web App, executing as the owner, approve Sheets and Drive access, and copy its URL to `GOOGLE_APPS_SCRIPT_URL`.

Production admins can also configure the Sheet URL, deployed Apps Script URL, and shared secret from `/dashboard/settings`. Admin-saved values override environment values and are stored in the persistent `/app/data` Docker volume.

## Tracking contract

The browser stores first-touch and last-touch values for:

**UTM parameters**

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `utm_id`

**Ad-platform click identifiers** (captured for server-side conversion APIs)

- `gclid`, `gbraid`, `wbraid` — Google Ads
- `fbclid` — Meta Ads
- `ttclid` — TikTok Ads
- `msclkid` — Microsoft Ads
- `li_fat_id` — LinkedIn Ads

GA4 event hooks fire for `apply_form_open`, `apply_form_start`, and `apply_form_submit` when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured. GA4 uses Google **Consent Mode v2** — all storage defaults to `denied` and is only granted after the visitor accepts in the consent banner (see `components/ConsentBanner.tsx`).

## Duplicate protection

Each drawer open mints an idempotency key that the client sends as `X-Idempotency-Key`. The API dedupes retries within 24 hours and also short-circuits repeat submissions of the same email within 24 hours — both cases respond with `{ ok: true, mode: "duplicate", id: <previousId> }` instead of storing a second row.

## Slack notifications

Set `SLACK_WEBHOOK_URL` (or override in `/dashboard/settings` once wired) to receive a summary in Slack or Discord after every successful application. Delivery is fire-and-forget with a 5s timeout so it never delays the response to the applicant.

## Multi-touch attribution (Sprint 2)

Each visit that carries a UTM or click ID appends a `Touchpoint` to `localStorage['gstar_touchpoints']`. Same-campaign visits within 30 minutes are deduped so a refresh doesn't spam entries. The array is capped at 20 touchpoints. On submit the full array is sent along with the legacy `firstTouch` / `lastTouch` snapshots — old records are still readable, new records unlock linear and position-based (40/20/40) attribution models in the dashboard.

## Real dashboard data

`GET /api/admin/metrics?range=30d&source=all&model=last` returns live aggregates from Prisma SQLite. Supported query parameters:

- `range` — `7d` | `30d` | `90d` | `all`
- `source` — a specific `utm_source` or `all`
- `model` — `first` | `last` | `linear` | `position`

Sessions, apply clicks and spend columns are placeholders until GA4 export / ad-platform spend sync are connected (Sprint 3 / manual).

## Meta Conversions API (Sprint 2)

Set `META_PIXEL_ID` and `META_ACCESS_TOKEN` to enable server-side `Lead` events. The API sends a hashed email + name + country + the reconstructed `fbc` cookie (from `fbclid`) alongside a `predicted_ltv` of 4500 USD (one full tuition) so Advantage+ can bid intelligently. `event_id` equals the application ID so any browser Pixel Lead is deduped against the server event automatically.

Use `META_TEST_EVENT_CODE` only while validating in Business Manager → **Events Manager → Test events**.

## Field-level drop-off (Sprint 2)

Every required text field emits an `apply_form_field_exit` GA4 event when the applicant blurs it without entering a value (once per drawer open). Segment `by field` in GA4 to see which field causes the biggest drop.

## Production

`/dashboard` uses a signed, HttpOnly admin session. Configure `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, and a strong `ADMIN_SESSION_SECRET`. See `DEPLOYMENT.md` for Docker Compose, Nginx, TLS, required environment variables, and release checks.
