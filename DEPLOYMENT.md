# VPS deployment

The production path is Docker Compose behind an HTTPS reverse proxy. The app binds only to `127.0.0.1:3010`; Nginx is the public entry point.

## 1. Configure environment

```bash
cp .env.example .env.production
chmod 600 .env.production
```

Set all of these values before deploying:

- `GOOGLE_APPS_SCRIPT_URL`: optional deployed Apps Script Web App URL for Google Sheets + Drive storage.
- `GOOGLE_APPS_SCRIPT_SECRET`: optional shared secret for Google storage, identical to Apps Script.
- `DASHBOARD_USER` and `DASHBOARD_PASSWORD`: credentials for `/dashboard`.
- `ADMIN_SESSION_SECRET`: at least 32 random characters used to sign HttpOnly admin sessions.
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: GA4 ID. This value is embedded at image build time.
- `DATABASE_URL`: optional SQLite URL. Leave blank to use `data/gstar.db`.

## 2. Migrate existing data

Back up the runtime directory before the first Prisma release:

```bash
cp -a data "data-backup-$(date +%Y%m%d-%H%M%S)"
npm run install:production
```

On CentOS 8, install `gcc-toolset-12-gcc-c++` once before running the command above. The script automatically enables GCC Toolset 12 and Python 3.11 when available so `better-sqlite3` can compile against the VPS runtime.

Then create and migrate the database:

```bash
mkdir -p data
touch data/gstar.db
chmod 600 data/gstar.db
npm run db:migrate
npm run db:import
```

`db:import` upserts legacy applications by ID and imports existing mentor, program and integration settings. Run it once during migration. Future releases only need `npm run db:migrate`.

## 3. Build and run

```bash
docker compose --env-file .env.production up -d --build
docker compose ps
curl --fail http://127.0.0.1:3010/api/health
```

## 4. Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name gstar.example.com;

    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable TLS with the VPS provider's certificate workflow or Certbot before sending application data.

## 5. Release checks

```bash
npm ci
npm run check
npm audit --omit=dev
docker compose logs --tail=100 gstar
```

Verify the landing page, submit one controlled application, confirm the row appears in Google Sheets, and verify GA4 DebugView receives the form events. `/dashboard` currently presents the dashboard UX with representative data; connect its data layer to GA4/Looker before treating it as production reporting.

Application storage is managed at `/dashboard/settings`. Prisma stores application records, mentors and settings in `data/gstar.db`. Google Sheets sync is optional and runs in parallel. Resume/CV files can be stored privately in `data/uploads/` or uploaded to Google Drive through Apps Script. Back up the complete `data` directory, including `gstar.db`, `gstar.db-wal` and `gstar.db-shm` when present.

The Google Sheets destination can be changed after deployment at `/dashboard/settings`. Docker Compose persists the SQLite database and uploads in the `gstar-data` volume. Back up that volume with the rest of the application data; the database contains the Apps Script shared secret.
