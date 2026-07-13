# GStar Next.js attribution flow

## Routes

- `/` — migrated V3 landing page with a React application drawer.
- `/dashboard` — dashboard UX preview using representative campaign data.
- `/api/applications` — validated application endpoint.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Without `GOOGLE_APPS_SCRIPT_URL`, submissions are written to `data/submissions.ndjson` in development only. Production fails closed unless both the Apps Script URL and shared secret are configured.

## Google Sheets setup

1. Create a Sheet and add a worksheet named `Applications`.
2. Add headers matching the order in `integrations/google-apps-script.gs`. The current form stores year of birth, current status, readiness signals and a private Google Drive URL for the uploaded PDF resume.
3. Open Extensions → Apps Script and paste `google-apps-script.gs`.
4. Set a strong shared secret in Apps Script and `.env.local`.
5. Deploy as a Web App, executing as the owner, approve Sheets and Drive access, and copy its URL to `GOOGLE_APPS_SCRIPT_URL`.

Production admins can also configure the Sheet URL, deployed Apps Script URL, and shared secret from `/dashboard/settings`. Admin-saved values override environment values and are stored in the persistent `/app/data` Docker volume.

## Tracking contract

The browser stores first-touch and last-touch values for:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `utm_id`

GA4 event hooks fire for `apply_form_open`, `apply_form_start`, and `apply_form_submit` when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured.

## Production

`/dashboard` uses a signed, HttpOnly admin session. Configure `DASHBOARD_USER`, `DASHBOARD_PASSWORD`, and a strong `ADMIN_SESSION_SECRET`. See `DEPLOYMENT.md` for Docker Compose, Nginx, TLS, required environment variables, and release checks.
