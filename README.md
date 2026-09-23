# Local Form Bridge

A full-stack lead capture and CRM integration bridge connecting modern React web forms to **HubSpot CRM v3** with an audit log & retry engine powered by **Neon Postgres** and **Vercel Serverless Functions**.

## Architecture & Features

- **Lead Capture Form**: Upserts Contacts, Companies, and Deals with deduplication and association linking in HubSpot CRM.
- **Admin Dashboard**: Overview stats, directory views (Contacts, Companies, Deals), Error Audit Log, Retry Queue, and Activity Stream.
- **Neon Postgres Audit Trail**: Log persistence for sync errors (`sync_errors`) and real-time events (`sync_activity`).
- **Live Health Monitoring**: Dynamic `GET /api/hubspot-health` endpoint checking HubSpot API connectivity with server-side caching.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `HUBSPOT_PRIVATE_APP_TOKEN` | Private App Access Token from HubSpot developer portal | `pat-na2-xxxx-xxxx` |
| `ADMIN_KEY` | Secret key for dashboard API authentication | `your_secret_admin_key` |
| `DATABASE_URL` | Connection string for Neon Postgres DB | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |

## Local Development

```bash
npm install
npm run dev
```

## Vercel Deployment

Deploy directly via Vercel CLI or GitHub integration. All serverless endpoints inside `api/` are automatically routed.

- Ensure `HUBSPOT_PRIVATE_APP_TOKEN`, `ADMIN_KEY`, and `DATABASE_URL` are configured in Vercel Project Settings → Environment Variables.
- Parameterized retry route `/api/sync-errors/:id/retry` is mapped via `vercel.json` rewrites to `/api/retry-sync-error?id=:id`.
