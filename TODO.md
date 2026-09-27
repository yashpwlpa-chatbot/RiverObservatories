# Pending work

This list records gaps visible in the repository. It does not imply that field data or ownership decisions are already available.

## High priority

- [ ] Replace or remove synthetic water-level observations and four demo sites when verified WCT data is ready. Check the connected database first; review `supabase/seeds/remove_demo_observations.sql` before use. Related: `supabase/seeds/20260927_demo_observations.sql`, `frontend/src/components/data/data-explorer.tsx`, `frontend/src/components/rivers/river-detail-client.tsx`.
- [ ] Supply and validate actual river lines and administrative geometry before calling GIS coverage complete. Related: `supabase/migrations/20260927000004_gis_read.sql`, `frontend/src/components/map/river-map.tsx`.
- [ ] Review the PostGIS-in-`public` Security Advisor finding and exposed-schema permissions with the database owner. Related: `supabase/migrations/20260926000000_legacy_initial.sql`, `supabase/migrations/20260927000000_auth_and_rls.sql`.
- [ ] Establish the authoritative Git repository and remote; review history for committed credentials before access transfer. This workspace has no `.git`. Related: `HANDOVER.md`, `.gitignore`.

## Medium priority

- [ ] Populate and review verified datasets for climate, wildlife, fisheries, social, conservation and policy categories. The UI exists, but insight content depends on published data. Related: `frontend/src/lib/observatories.ts`, `frontend/src/components/rivers/river-detail-client.tsx`.
- [ ] Implement or remove the empty `/gis/nearest` response if proximity search is required. Related: `supabase/functions/portal-api/index.ts`.
- [ ] Decide which unsupported hydrology subroutes, if any, are needed; unknown categories currently return 501. Related: `supabase/functions/portal-api/index.ts`.
- [ ] Confirm production host, Auth redirect URLs, backup retention and deployment process, then update `README.md`, `HANDOVER.md` and `docs/BACKUP.md`. **Needs confirmation from project owner.**
- [ ] Add meaningful automated tests for roles, public data access, import approval and key user flows. There is no `test` or `lint` script in `frontend/package.json`.

## Low priority

- [ ] Review production bundle size if load performance becomes a concern. The current Vite build completes but warns that generated chunks exceed 500 kB; ExcelJS and the main bundle are large. Related: `frontend/src/lib/spreadsheet.ts`, `frontend/src/App.tsx`, `frontend/vite.config.ts`.
- [ ] Review photo rights/attribution and external map tile usage before wider publication. Related: `frontend/public/assets/`, `frontend/src/components/map/river-map.tsx`.
- [ ] Decide whether retained `frontend/public/assets/river.png`, `turtle.png` and other assets can be removed. They were preserved because usage or future replacement intent is not proven.
- [ ] Consider a managed data-access request workflow if email-only requests no longer meet WCT's needs. Current behavior is a `mailto:` draft. Related: `frontend/src/pages/contact.tsx`.
