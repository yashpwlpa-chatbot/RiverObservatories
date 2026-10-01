# River Observatories - WCT

## Overview

River Observatories for the Indo-Gangetic Plains is a public portal for river research.

Visitors can browse 12 observatories and explore interpreted hydrology graphs and GIS layers. Supabase Auth and a role-checked Edge Function provide separate Admin and Researcher tools.

Public pages do not offer observation-level tables or CSV downloads.

---

## Features

### Implemented

- Public home, observatory catalog, river dashboards, About, Contact, Graphs, Maps, and Interactive Data Exploration pages.
- Fixed river selector and research categories; dashboards display statistics and charts when matching published data exists.
- Hydrology aggregate filters, time series, seasonal/monthly/annual trends, distributions, and comparisons.
- Supabase Auth sign-in and role-gated Admin/Researcher areas.
- Staff dataset imports, validation, submission/approval, controlled record access/export, geography and user management, and audit views.
- Data-access requests via a prepared email draft on the Contact page.

### Partially Implemented

- GIS layers depend on supplied geometry. Complete river lines and boundaries are not included in this repository; `/gis/nearest` currently returns an empty list.
- Several research categories have navigation and empty states but require verified datasets before they can display insights.
- The optional seed contains 20 **synthetic** water-level observations and four invented sites for the Ganga and Chambal rivers.
- This seed is demonstration data only and must not be presented as field research.

### Planned / Future

See [TODO.md](TODO.md) for evidence-backed pending work.

> Do not represent planned functionality as completed functionality.

---

## Tech Stack

| Layer | Implementation |
|---|---|
| **Frontend** | React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS 3 |
| **Charts & Maps** | Apache ECharts, MapLibre GL, OpenStreetMap and Esri raster tiles |
| **Backend / API** | Deno Supabase Edge Function `portal-api`; no separate Express server |
| **Database** | Supabase Postgres / PostGIS, SQL migrations and RPCs |
| **Authentication** | Supabase Auth and application `User` profile roles |
| **Import** | ExcelJS, CSV, publicly shared Google Sheets CSV export |
| **Deployment Config** | Docker frontend image and Nginx |
| **Production Hosting** | **Needs confirmation from project owner** |

### External Resources

The application uses several external resources:

- Google Fonts
- OpenStreetMap / map tiles
- Esri raster tiles
- WCT contact website
- Publicly shared Google Sheets

---

## Prerequisites

Before running the project, ensure the following are installed or available:

- Node.js 20 or later
- npm
- Supabase project with:
  - PostgreSQL
  - Supabase Auth
  - `portal-api` Edge Function
- Docker and Docker Compose for container deployment
- Supabase CLI or Supabase Dashboard access when provisioning a new project

The npm lockfile is located at:

```text
frontend/package-lock.json
