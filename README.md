# RESEATO Cebu

RESEATO Cebu is a full-stack restaurant reservation platform with role-based experiences for customers, vendors, and admins.

## Overview

This repository contains a monorepo setup with:

- `web`: React + TypeScript frontend (customer, vendor, admin portals)
- `api`: Node.js + Express + TypeScript backend
- `supabase`: SQL migration scripts and schema updates

Core capabilities include:

- Role-based authentication and routing (`customer`, `vendor`, `admin`)
- Customer restaurant discovery, reservations, and payment flow
- Vendor dashboard, reservation management, table slot control, and best sellers
- Admin dashboard for user, restaurant, reservation, and assignment management
- Mobile-optimized responsive UI

## Tech Stack

- Frontend: React, TypeScript, React Router, Tailwind CSS, Framer Motion
- Backend: Express, TypeScript, Supabase JS, Zod
- Database/Auth/Storage: Supabase
- Deployment: Vercel (web), Render (api)

## Repository Structure

```text
reseato-final-cebu/
  api/                  # Express API (TypeScript)
    src/
  web/                  # React app (TypeScript)
    src/
    public/
  supabase/
    sql/                # SQL migrations/scripts
```

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project

### 1) API setup (`api`)

```bash
cd api
npm install
```

Create `api/.env`:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

WEB_ORIGIN=http://localhost:3000
APP_BASE_URL=http://localhost:3000

PAYMONGO_SECRET_KEY=your_paymongo_secret_or_placeholder
PAYMONGO_BASE_URL=https://api.paymongo.com/v1
RESERVATION_FEE_PHP=30

RESEND_API_KEY=your_resend_key_optional
RESEND_FROM_EMAIL=your_sender_email_optional
```

Run API:

```bash
npm run dev
```

Default local API URL: `http://localhost:4000`

### 2) Web setup (`web`)

```bash
cd web
npm install
```

Create `web/.env`:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_RESTAURANT_IMAGE_BUCKET=restaurant_img
```

Run web:

```bash
npm start
```

Default local web URL: `http://localhost:3000`

## Database Setup

Run SQL files in `supabase/sql` in chronological order, for example:

- `2026-03-06-payment-portal.sql`
- `2026-03-08-vendor-portal.sql`
- `2026-03-10-admin-dashboard-core.sql`
- `2026-03-10-vendor-notifications-media.sql`
- `2026-03-13-vendor-best-sellers.sql`

## Deployment

### Frontend (Vercel)

Set:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_API_BASE_URL=https://your-render-api-domain`
- `REACT_APP_RESTAURANT_IMAGE_BUCKET=restaurant_img`

### Backend (Render)

Recommended service config:

- Root Directory: `api`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WEB_ORIGIN=https://your-vercel-domain`
- `APP_BASE_URL=https://your-vercel-domain`

Optional payment/email variables:

- `PAYMONGO_SECRET_KEY`
- `PAYMONGO_BASE_URL`
- `RESERVATION_FEE_PHP`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## Troubleshooting

- `Cannot GET /vendor/overview` in production:
  - API is running an outdated build or wrong branch.
  - Redeploy Render from the correct branch and clear build cache.
- `Error: supabaseKey is required` on Render:
  - Missing `SUPABASE_ANON_KEY` (or other Supabase env var) in Render environment.
- Frontend works locally but not in production:
  - Verify `REACT_APP_API_BASE_URL` points to live Render API domain.

## License

This project is currently maintained as a private/internal academic or product codebase.
