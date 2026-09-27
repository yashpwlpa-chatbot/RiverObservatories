-- Synthetic demonstration data only. These values and locations are invented,
-- are not WCT measurements, and must not be used for research conclusions.
-- Safe to re-run: stable IDs prevent duplicate observations.

INSERT INTO public."HydrologyParameter" (id,code,name,unit,description)
VALUES ('demo-parameter-water-level','WATER_LEVEL','Water level','m',
  'Synthetic water-level parameter used only to demonstrate portal visualizations.')
ON CONFLICT (id) DO NOTHING;

WITH sites(id,name,code,river_slug,latitude,longitude) AS (
  VALUES
    ('demo-ganga-a','Demo Ganga Site A','DEMO-GA','ganga',25.31::double precision,83.01::double precision),
    ('demo-ganga-b','Demo Ganga Site B','DEMO-GB','ganga',25.60::double precision,85.11::double precision),
    ('demo-chambal-a','Demo Chambal Site A','DEMO-CA','chambal',26.50::double precision,77.90::double precision),
    ('demo-chambal-b','Demo Chambal Site B','DEMO-CB','chambal',26.70::double precision,78.90::double precision)
)
INSERT INTO public."MonitoringStation" (id,name,code,"riverId",latitude,longitude,geom,metadata,"createdAt","updatedAt")
SELECT s.id,s.name,s.code,r.id,s.latitude,s.longitude,
  public.ST_SetSRID(public.ST_MakePoint(s.longitude,s.latitude),4326),
  '{"synthetic":true,"note":"Illustrative map location; not a real monitoring station."}'::jsonb,now(),now()
FROM sites s JOIN public."River" r ON r.slug=s.river_slug
ON CONFLICT (id) DO NOTHING;

WITH demo_datasets(id,name,slug,river_slug) AS (
  VALUES
    ('demo-dataset-ganga-level','[DEMO] Ganga water level','demo-ganga-water-level','ganga'),
    ('demo-dataset-chambal-level','[DEMO] Chambal water level','demo-chambal-water-level','chambal')
)
INSERT INTO public."Dataset" (id,name,slug,description,"riverId","dataType",methodology,units,"dateFrom","dateTo",status,"createdAt","updatedAt")
SELECT d.id,d.name,d.slug,
  'Synthetic sample observations for testing graphs and maps. These are not WCT research measurements.',
  r.id,'hydrology',
  'Invented demonstration values at invented monitoring sites. Do not cite, analyze, or interpret as field data.',
  'm','2025-01-15'::timestamp,'2026-01-15'::timestamp,'PUBLISHED'::public."DatasetStatus",now(),now()
FROM demo_datasets d JOIN public."River" r ON r.slug=d.river_slug
ON CONFLICT (id) DO NOTHING;

WITH samples(river_slug,site_id,observed_on,reading,season_name,dataset_id) AS (
  VALUES
    ('ganga','demo-ganga-a','2025-01-15'::date,4.10::double precision,'Winter','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-a','2025-04-15'::date,3.70::double precision,'Pre-monsoon','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-a','2025-07-15'::date,6.20::double precision,'Monsoon','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-a','2025-10-15'::date,5.10::double precision,'Post-monsoon','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-a','2026-01-15'::date,4.00::double precision,'Winter','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-b','2025-01-15'::date,3.90::double precision,'Winter','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-b','2025-04-15'::date,3.50::double precision,'Pre-monsoon','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-b','2025-07-15'::date,6.00::double precision,'Monsoon','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-b','2025-10-15'::date,4.80::double precision,'Post-monsoon','demo-dataset-ganga-level'),
    ('ganga','demo-ganga-b','2026-01-15'::date,3.80::double precision,'Winter','demo-dataset-ganga-level'),
    ('chambal','demo-chambal-a','2025-01-15'::date,2.70::double precision,'Winter','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-a','2025-04-15'::date,2.40::double precision,'Pre-monsoon','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-a','2025-07-15'::date,4.10::double precision,'Monsoon','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-a','2025-10-15'::date,3.30::double precision,'Post-monsoon','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-a','2026-01-15'::date,2.60::double precision,'Winter','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-b','2025-01-15'::date,2.90::double precision,'Winter','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-b','2025-04-15'::date,2.50::double precision,'Pre-monsoon','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-b','2025-07-15'::date,4.40::double precision,'Monsoon','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-b','2025-10-15'::date,3.50::double precision,'Post-monsoon','demo-dataset-chambal-level'),
    ('chambal','demo-chambal-b','2026-01-15'::date,2.80::double precision,'Winter','demo-dataset-chambal-level')
)
INSERT INTO public."HydrologyRecord" (id,"datasetId","parameterId","riverId","stationId","dataType",season,"observedAt",value,unit,flag,"sourceRowId","createdAt")
SELECT 'demo-observation-' || s.site_id || '-' || to_char(s.observed_on,'YYYYMMDD'),
  s.dataset_id,'demo-parameter-water-level',r.id,s.site_id,'WATER_LEVEL',
  s.season_name,s.observed_on::timestamp,s.reading,'m','DEMO',
  'synthetic:' || s.site_id || ':' || s.observed_on::text,now()
FROM samples s JOIN public."River" r ON r.slug=s.river_slug
ON CONFLICT (id) DO NOTHING;
