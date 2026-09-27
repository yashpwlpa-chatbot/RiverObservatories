# River Observatories - WCT

## Overview

River Observatories for the Indo-Gangetic Plains is a public portal for river research. Visitors can browse 12 observatories and explore interpreted hydrology graphs and GIS layers. Supabase Auth and a role-checked Edge Function provide separate Admin and Researcher tools. Public pages do not offer observation-level tables or CSV downloads.

## Features

### Implemented

- Public home, observatory catalog, river dashboards, About, Contact, Graphs, Maps, and Interactive Data Exploration pages.
- Fixed river selector and research categories; dashboards display statistics and charts when matching published data exists.
- Hydrology aggregate filters, time series, seasonal/monthly/annual trends, distributions, and comparisons.
- Supabase Auth sign-in and role-gated Admin/Researcher areas.
- Staff dataset imports, validation, submission/approval, controlled record access/export, geography and user management, and audit views.
- Data-access requests via a prepared email draft on the Contact page.

### Partially implemented

- GIS layers depend on supplied geometry. Complete river lines and boundaries are not in this repository; `/gis/nearest` returns an empty list.
- Several research categories have navigation and empty states but need verified datasets before they can display insights.
- The optional seed contains 20 **synthetic** water-level observations and four invented sites for Ganga and Chambal. It is demonstration data, not field research.

### Planned / future

See [TODO.md](TODO.md) for evidence-backed pending work. Do not represent it as completed functionality.

## Tech stack

| Layer | Implementation |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS 3 |
| Charts and maps | Apache ECharts, MapLibre GL, OpenStreetMap and Esri raster tiles |
| Backend/API | Deno Supabase Edge Function `portal-api`; no separate Express server |
| Data | Supabase Postgres/PostGIS, SQL migrations and RPCs |
| Authentication | Supabase Auth and an application `User` profile role |
| Import | ExcelJS, CSV, publicly shared Google Sheets CSV export |
| Static hosting config | Docker frontend image and Nginx; actual production host: **Needs confirmation from project owner.** |

Google Fonts, map tiles, the WCT contact site, and publicly shared Google Sheets are external resources used by the code.

## Prerequisites

- Node.js 20 or later and npm. The lockfile is `frontend/package-lock.json`.
- A provisioned, reachable Supabase project with Postgres, Auth, and the `portal-api` Edge Function.
- Docker and Compose only for the supplied container deployment.
- Supabase CLI or equivalent dashboard/database access when provisioning a new project. Required organizational permissions: **Needs confirmation from project owner.**

## Installation

Repository URL: **Needs confirmation from project owner.** Once supplied:

```sh
git clone <repository-url>
cd wct-river-portal
cp .env.example .env
cd frontend
npm ci
```

On PowerShell, `Copy-Item .env.example .env` is equivalent. There is no root `package.json`; install from `frontend/`.

## Environment setup

Fill the copied root `.env` with the selected Supabase project's browser-safe settings:

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL for Auth and `portal-api` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser publishable key |

Vite loads the root file through `frontend/vite.config.ts`; Docker Compose also reads it. These values are embedded **at build time**. Rebuild after changing them. The Edge Function reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the **server-side Supabase environment**. Never put a service-role key, database password, or staff password in `.env.example`, a `VITE_` variable, or the frontend image. The root `.env` is ignored by `.gitignore`.

### New Supabase project

1. Apply `supabase/migrations/` in filename order to a **new empty project** through a reviewed migration workflow. Check migration history first; do not reapply these files to the existing WCT project.
2. Deploy `supabase/functions/portal-api/index.ts` as `portal-api`. Its gateway JWT verification is disabled because it serves public routes; the function itself validates bearer tokens and roles for protected routes.
3. Set allowed site origins and redirect URLs in Supabase Auth for the new domain.
4. Create the first user through Supabase Auth administration, then grant `ADMIN` to that account's matching `public."User"` profile through authorized database administration. New accounts default to `VIEWER`.
5. Optional staging/demo only: run `supabase/seeds/20260927_demo_observations.sql` after migrations. Its matching removal script is `supabase/seeds/remove_demo_observations.sql`. Never present demo values as measurements.

Supabase ownership, current migration state, and admin account transfer: **Needs confirmation from project owner.**

## Development

From `frontend/` after setting the root `.env`:

```sh
npm run dev
```

Open `http://localhost:3000/`. Staff sign in at `/login`. Data-backed views require a provisioned Supabase project.

## Production build

From `frontend/`:

```sh
npm run typecheck
npm run build
```

`build` already checks TypeScript and writes `frontend/dist/`. There is no lint or automated test script in `frontend/package.json`.

## Preview / start

To preview the static build from `frontend/`:

```sh
npm run preview
```

The preview server uses port 3000. For the supplied frontend-only container, run from the repository root after setting `.env`:

```sh
docker compose config --quiet
docker compose up --build -d
```

Nginx serves `http://localhost:3000/`. The browser calls Supabase directly; Compose does not run Postgres or the Edge Function. `docker compose down` stops the container.

## Folder structure

```text
frontend/
  public/assets/       River, wildlife and community images; logo
  src/App.tsx          Router and layouts
  src/pages/           Public, Admin and Researcher routes
  src/components/      Charts, map, explorer, import and shared UI
  src/lib/             Auth, Supabase/API clients and utilities
  package-lock.json   npm lockfile
supabase/
  functions/portal-api/  Deno HTTP API
  migrations/            Schema, security and RPCs
  seeds/                 Synthetic demo insert/removal scripts
docker/                Frontend image and Nginx configuration
docs/BACKUP.md         Backup and recovery notes
```

## Deployment

The supplied Dockerfile builds the static frontend with Node 20 and serves it with Nginx 1.27. Compose maps container port 80 to host port 3000; build args require the two root `VITE_` values. Nginx supplies the single-page-app fallback. Supabase hosts the separate API, Auth and database. The actual production host, domain, TLS, DNS and CI/CD are **Needs confirmation from project owner.** See [ARCHITECTURE.md](ARCHITECTURE.md), [HANDOVER.md](HANDOVER.md), and [docs/BACKUP.md](docs/BACKUP.md).

## Known limitations

- The synthetic seed is included in the repository. Earlier project notes say it is present in the connected WCT project; verify the live state before relying on or removing it. Fresh projects contain none until explicitly seeded.
- River and administrative geometry need to be supplied. `/gis/nearest` is an empty handler.
- Unsupported hydrology subroutes return HTTP 501.
- Contact/data access opens an email draft; the portal does not store a request or automate its approval.
- This workspace has no Git metadata or remote; repository provenance and tracked state cannot be verified here.
- A legacy migration installs PostGIS in `public`. Review its Supabase Security Advisor finding with the database owner before production sign-off.
- The current Vite build succeeds with a warning about chunks larger than 500 kB; see `TODO.md` for a possible performance review.

## Future work

See [TODO.md](TODO.md). Preserve the public aggregate-only access pattern and staff authorization boundary when extending the system.
"# River-Observatories-" 
#   R i v e r - O b s e r v a t o r i e s -  
 