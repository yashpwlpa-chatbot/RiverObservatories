# Backup and recovery

The active portal stores authentication and research tables in the connected Supabase project. The website is a static build; no local backend or upload storage is required.

## What to protect

- Supabase Postgres: river catalog, monitoring stations, approved observations, import staging, user profiles, and audit history.
- Supabase Auth: staff identities and credentials, managed separately from the public profile table.
- This repository: SQL migrations, the Edge Function, frontend source, and the synthetic demo seed and removal scripts.
- Deployment configuration: the project URL and publishable key in root `.env`, plus any server-side secrets configured in Supabase.

## Recovery procedure

1. Use the backup and restore options available for the Supabase project's plan. Confirm the actual retention and recovery capability in the project dashboard before relying on it.
2. Restore into a separate project or staging environment first. Check Auth users, table counts, RLS, Edge Function behavior, and a public graph.
3. Deploy the Edge Function source from `supabase/functions/portal-api/index.ts` to the recovered project and rebuild the static frontend with the recovered project's URL and publishable key.
4. Verify that public visitors cannot query raw observation tables and that Admin and Researcher accounts can sign in.

The current import flow stages parsed rows in Postgres. A database backup must therefore cover the `ImportStage`, `Import`, `Dataset`, and `HydrologyRecord` tables as well as their references.
