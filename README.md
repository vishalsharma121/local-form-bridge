# Local Form Bridge

A full-stack lead capture and CRM integration bridge connecting modern React web forms to **HubSpot CRM v3** with an audit log & retry engine powered by **Neon Postgres** and **Vercel Serverless Functions**.

## Architecture & Features

- **Lead Capture Form**: Upserts Contacts, Companies, and Deals with email deduplication (including 409 race-condition handling) and association linking in HubSpot CRM.
- **Admin Dashboard**: Overview stats, directory views (Contacts, Companies, Deals), Error Audit Log, Retry Queue, Activity Stream, and Settings. Includes date-range filtering, CSV export, and 10-second auto-refresh.
- **Neon Postgres Audit Trail**: Log persistence for sync errors (`sync_errors`) and real-time events (`sync_activity`).
- **Retry Engine**: Failed syncs can be retried manually from the dashboard or automatically via `api/cron-auto-retry.js`.
- **Live Health Monitoring**: Dynamic `GET /api/hubspot-health` endpoint checking HubSpot API connectivity with server-side caching (per serverless instance, best-effort).

## Tech Stack

React 19, React Router v7, Vite 8, Tailwind CSS v4, Vercel Serverless Functions (Node.js, ES Modules), Neon Postgres, HubSpot CRM API v3.

## API Endpoints

The `api/` directory contains **8 serverless functions** (Vercel Hobby plan limit is 12; every `.js` file in `api/` counts as one):

| Handler | Methods | Purpose |
| :--- | :--- | :--- |
| `api/contacts.js` | GET, POST | List contacts / form submission engine (dedupe, upsert, optional auto Company + Deal) |
| `api/companies.js` | GET, POST | List companies / create company |
| `api/deals.js` | GET, POST | List deals / create deal with associations |
| `api/sync-errors.js` | GET, POST, DELETE | List error logs / retry an error / clear the queue |
| `api/cron-auto-retry.js` | GET, POST | Cron endpoint that retries unresolved errors |
| `api/settings.js` | GET, POST | Read and update app settings |
| `api/hubspot-health.js` | GET | HubSpot connectivity check |
| `api/sync-activity.js` | GET | Activity audit stream |

> **Note**: Keep shared code in `lib/`, never in `api/`. Merge new endpoints into existing handlers to stay under the function limit.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `HUBSPOT_PRIVATE_APP_TOKEN` | Private App Access Token from HubSpot developer portal (`HUBSPOT_ACCESS_TOKEN` is accepted as an alias) | `pat-na2-xxxx-xxxx` |
| `ADMIN_KEY` | Secret key for dashboard API authentication, sent as the `x-admin-key` header | `your_secret_admin_key` |
| `DATABASE_URL` | Connection string for Neon Postgres DB | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |

> If `DATABASE_URL` is not set, logs fall back to local JSON files in `data/`. This is for **local development only**; the Vercel filesystem is ephemeral, so `DATABASE_URL` is required in production.

## Local Development

```bash
npm install
npm run dev       # start dev server (Vite + API middleware)
npm run build     # production build
npm run preview   # preview the production build
```

## Vercel Deployment

Deploy directly via Vercel CLI or GitHub integration. All serverless endpoints inside `api/` are automatically routed.

- Ensure `HUBSPOT_PRIVATE_APP_TOKEN`, `ADMIN_KEY`, and `DATABASE_URL` are configured in Vercel Project Settings → Environment Variables.
- Legacy and parameterized routes are mapped to the consolidated handlers via `vercel.json` rewrites (mirrored in the Vite dev middleware):

| Route | Rewritten to |
| :--- | :--- |
| `/api/create-contact` | `/api/contacts` |
| `/api/create-company` | `/api/companies` |
| `/api/create-deal` | `/api/deals` |
| `/api/sync-errors/:id/retry` | `/api/sync-errors?id=:id` |
| `/api/retry-sync-error` | `/api/sync-errors` |
| `/api/error-logs` | `/api/sync-errors` |

- Hobby plan cron jobs run at most once per day, so `api/cron-auto-retry.js` will not retry more often than that on Hobby.
