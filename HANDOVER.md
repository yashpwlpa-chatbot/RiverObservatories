# Project Handover

## Project

River Observatories - WCT

## Repository

URL: **Needs confirmation from project owner.** This workspace has no `.git` directory or configured remote. The owner must place these files in the intended repository and verify history and branches.

## Current status

The public React portal, 12 river routes, aggregate graphs, map viewer, Supabase Auth login, and Admin/Researcher screens are implemented. The Edge Function serves public aggregates and protected staff operations; SQL migrations define the database/RPC layer. Data-backed views require a provisioned Supabase project. The bundled water-level seed and four sites are synthetic examples. GIS geometry and several research themes need verified content; `/gis/nearest` is empty.

## Important entry points

| Area | File |
| --- | --- |
| React boot/router | `frontend/src/main.tsx`, `frontend/src/App.tsx` |
| Observatory dashboard | `frontend/src/pages/river-detail.tsx`, `frontend/src/components/rivers/river-detail-client.tsx` |
| Explorer and GIS | `frontend/src/components/data/data-explorer.tsx`, `frontend/src/components/map/river-map.tsx` |
| Auth and API | `frontend/src/lib/auth.tsx`, `frontend/src/lib/supabase.ts`, `frontend/src/lib/api.ts` |
| River/category catalog | `frontend/src/lib/observatories.ts` |
| Backend | `supabase/functions/portal-api/index.ts` |
| Schema and demo | `supabase/migrations/`, `supabase/seeds/` |
| Styling/config | `frontend/src/index.css`, `frontend/tailwind.config.ts`, `frontend/vite.config.ts` |
| Hosting | `docker-compose.yml`, `docker/Dockerfile.frontend`, `docker/frontend-nginx.conf` |

## How to run

From the root, copy `.env.example` to `.env` and fill in the two browser-safe values. Then:

```sh
cd frontend
npm ci
npm run dev
```

Use `npm run typecheck` and `npm run build` in `frontend/` for verification; `npm run preview` serves a local build. Dev/preview use port 3000. See [README.md](README.md) for new-project provisioning and Docker commands.

## Environment variables

See [.env.example](.env.example). The two `VITE_` values are embedded in the browser build. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` belong only in Supabase's server-side Edge environment. Transfer real credentials via the organization's approved secret manager: **Needs confirmation from project owner.**

## Deployment

The repository builds a frontend-only Docker/Nginx image and serves it on port 3000 via Compose. The actual production host, domain, TLS, CI/CD, Supabase ownership, backup policy and migration deployment process are **Needs confirmation from project owner.** See [docs/BACKUP.md](docs/BACKUP.md). Configure Auth redirect URLs and site origins for a new domain.

## Important design / product decisions

- The UI river list is fixed in `lib/observatories.ts`; new database rows alone do not add public observatories.
- Public pages show interpreted summaries and maps. Detailed rows/CSV are protected by Edge Function staff checks.
- Data-access requests open a prepared email, so WCT reviews them outside this application.
- Imports pass through staging and validation before admin approval. Demo data must not be cited as research.
- API authorization is in the Edge Function even though frontend staff routes are also gated. The service key stays server-side.

## Known issues

- `/gis/nearest` returns an empty list; complete river and boundary geometry is not in the repository.
- Unsupported hydrology subroutes respond 501.
- A legacy migration creates PostGIS in `public`; review the extension's Security Advisor finding with the database owner.
- No Git metadata exists here, so tracked state, remote URL and any historical credential exposure cannot be established.

## Pending work

See [TODO.md](TODO.md). Verify live Supabase migration, Auth and demo-data state before data operations. Add verified datasets and geometry, then decide whether to remove demonstration records. Add meaningful automated checks once expected behavior is agreed.

## Things the next developer should not change without approval

- Public aggregate-only access and staff role checks in `portal-api` and SQL grants/RLS.
- The fixed 12-river navigation and research category structure without product approval.
- Migration history, seed/removal scripts or published datasets without checking live database state.
- Photograph attribution or map tile usage without rights review.

## Access to transfer

Repository administration/URL; Supabase ownership and deployment access; organization-owned Auth admin account/recovery; hosting, DNS, TLS and CI/CD access; backup access/retention; image rights and credits; WCT data-request mailbox ownership. Each transfer detail: **Needs confirmation from project owner.** Never commit or send passwords and private keys in chat.
