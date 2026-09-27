# Architecture

## High-level architecture

```text
Visitor or staff browser
  -> React/Vite single-page frontend (Nginx in the supplied Docker image)
  -> Supabase Auth (sign-in/session) and portal-api Edge Function (HTTP)
  -> Supabase Postgres/PostGIS, Auth admin API, and SQL RPC functions

Map view -> OpenStreetMap or Esri raster tiles
Optional staff import -> publicly shared Google Sheets CSV export
```

There is no separate Express backend, local database, application upload directory, or server-side frontend runtime in this repository. The Edge Function is deployed separately from the static site.

## Frontend structure

- `frontend/src/main.tsx` mounts React and BrowserRouter; `frontend/src/App.tsx` declares routes and layouts.
- Public routes: `/`, `/rivers`, `/rivers/:riverId`, `/data`, `/gis`, `/about`, `/contact`, `/login`. The hydrology, visualization and datasets compatibility paths redirect to current views.
- Staff routes: `/admin` (dashboard, import, datasets, rivers/geography, users, audit) and `/researcher` (dashboard, upload, submissions). The frontend gates navigation, and the API checks roles independently.
- `frontend/src/components/` holds shared UI, charts, data explorer, GIS map, river dashboards and import wizard.
- `frontend/src/lib/supabase.ts` creates the browser client; `lib/api.ts` calls the Edge Function; `lib/auth.tsx` keeps session/profile state in React context. Other state is local or in URL query parameters. There is no global state library.
- `frontend/src/lib/observatories.ts` defines the fixed 12-river list and research categories. `src/types/` defines response types. Other `src/lib/` files provide formatting, spreadsheet, metadata and style utilities.
- `frontend/src/index.css` and `frontend/tailwind.config.ts` define styles. `frontend/public/assets/` holds river/wildlife/community photos, logo and retained placeholder assets. `frontend/public/` also has a favicon and robots file.

## Backend structure

`supabase/functions/portal-api/index.ts` is one Deno HTTP handler. It dispatches public river, hydrology aggregate, GIS and dataset reads, and protected staff import, dataset, user, submission, report, audit and admin operations. It validates bearer tokens through Supabase Auth, loads the active `User` profile, and checks roles. It uses Supabase's server-side service key to call PostgREST, SQL RPCs and Auth administration endpoints. Gateway JWT verification is disabled for public routes; the handler's checks are the access boundary.

The schema, RLS/grants, catalog, aggregate RPCs and import procedures are in `supabase/migrations/`. Browser roles do not receive direct application-table grants. Observation rows and CSV export are staff-only API paths. `/gis/nearest` returns an empty list; unsupported hydrology subroutes return 501.

## Data flow

```text
Public graph: page -> lib/api.ts -> portal-api -> SQL aggregate RPC
            -> JSON summary -> ECharts component
Map:         map component -> portal-api -> GIS RPC -> GeoJSON -> MapLibre
Staff import: spreadsheet/CSV/Google Sheet -> import wizard -> portal-api
            -> staging/validation -> admin approval -> approved records
Sign-in:     login form -> Supabase Auth -> token -> /auth/me -> User role
```

Anonymous visitors receive only published summaries and maps. Authorized staff can access record-level data. Contact/data access uses a `mailto:` draft, not a database request.

## River observatory flow

```text
Home -> Observatories (/rivers) -> River dashboard (/rivers/:riverId)
     -> research category -> Graphs or Maps (/data, /gis)
     -> Interactive Data Exploration (/data?tab=interactive)

Home -> header river selector -> River dashboard
```

The river dashboard offers a segment filter only when stretches exist. The UI river selector uses `lib/observatories.ts`.

## Assets

River, wildlife and community photos, plus the logo, live in `frontend/public/assets/`. Google Fonts, OpenStreetMap and Esri map tiles are external requests. The import service can fetch publicly shared Google Sheet exports. Operators should review production usage and attribution terms. Nginx/Docker configuration is under `docker/`; the frontend build output is `frontend/dist/`.
