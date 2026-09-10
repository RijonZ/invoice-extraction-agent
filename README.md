# Invoice Extraction Agent

A full-stack app for uploading invoices (PDF or image), extracting structured
data from them with an OpenAI vision model, validating the result
deterministically, and reviewing/correcting anything that needs a human look —
with company-wide vendor, spend, and extraction-quality visibility for admins.

## Stack

- **Backend**: Node.js, Express, TypeScript, PostgreSQL, MinIO (S3-compatible storage)
- **Frontend**: React, TypeScript, Vite, React Router
- **Extraction**: OpenAI Responses API with structured output (Zod schema)

## Features

- Drag-and-drop upload (single or bulk), inline extraction with a
  missing-critical-field retry loop
- Deterministic validation (line items vs. subtotal vs. total) with a
  configurable amount-matching tolerance
- Review dashboard with status filters, vendor/invoice-number search, a date
  range, and CSV export
- Auth with JWT sessions and two roles: **admin** (company-wide visibility)
  and **user** (own invoices only)
- Admin: vendor management (rename, merge duplicates), analytics (spend
  trends, status breakdown, correction frequency), user management, an audit
  log, and app settings (extraction model, retry count, default currency,
  branding, banner)
- Personal pages: account settings, upload stats, activity history, help
- In-app notifications (bell dropdown) for invoices needing attention, with
  read/unread state and per-item dismiss

## Getting started

```bash
# 1. Start Postgres + MinIO
docker compose up -d

# 2. Backend
cd backend
cp ../.env.example .env   # fill in OPENAI_API_KEY and JWT_SECRET
npm install
npm run migrate
npm run dev                # http://localhost:3001

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

The first account you register becomes an admin automatically; every account
after that registers as a regular user.

## Project layout

```
backend/
  src/
    db/            migrations + connection pool
    services/       extraction, validation, orchestration, storage, auth, settings
    routes/         one file per resource
    middleware/      auth
frontend/
  src/
    pages/          one component per route
    components/      shared UI (layout, charts, dropzone, pagination, ...)
    context/         auth + app settings
    api/            typed fetch client
```
