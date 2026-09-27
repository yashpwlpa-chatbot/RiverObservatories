-- These RPCs are callable only by the server-side Edge Function service role.
-- The browser has no direct access to portal tables or raw hydrology records.
CREATE OR REPLACE FUNCTION public.wct_filtered_records(f jsonb, published_only boolean DEFAULT true)
RETURNS SETOF public."HydrologyRecord"
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT r.* FROM public."HydrologyRecord" r
  LEFT JOIN public."Dataset" d ON d.id = r."datasetId"
  WHERE (NOT published_only OR d.status = 'PUBLISHED'::public."DatasetStatus")
    AND (nullif(f->>'riverId','') IS NULL OR r."riverId" = f->>'riverId')
    AND (nullif(f->>'stateId','') IS NULL OR r."stateId" = f->>'stateId')
    AND (nullif(f->>'districtId','') IS NULL OR r."districtId" = f->>'districtId')
    AND (nullif(f->>'riverStretchId','') IS NULL OR r."riverStretchId" = f->>'riverStretchId')
    AND (nullif(f->>'stationId','') IS NULL OR r."stationId" = f->>'stationId')
    AND (nullif(f->>'parameterId','') IS NULL OR r."parameterId" = f->>'parameterId')
    AND (nullif(f->>'dataType','') IS NULL OR r."dataType" = f->>'dataType')
    AND (nullif(f->>'dataSubType','') IS NULL OR r."dataSubType" = f->>'dataSubType')
    AND (nullif(f->>'season','') IS NULL OR r."season" = f->>'season')
    AND (nullif(f->>'year','') IS NULL OR extract(year from r."observedAt") >= (f->>'year')::int)
    AND (nullif(f->>'yearTo','') IS NULL OR extract(year from r."observedAt") <= (f->>'yearTo')::int)
    AND (nullif(f->>'month','') IS NULL OR extract(month from r."observedAt") = (f->>'month')::int)
    AND (nullif(f->>'dateFrom','') IS NULL OR r."observedAt" >= (f->>'dateFrom')::date)
    AND (nullif(f->>'dateTo','') IS NULL OR r."observedAt" < ((f->>'dateTo')::date + 1));
$$;

CREATE OR REPLACE FUNCTION public.wct_portal_rivers(published_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'name', r.name, 'slug', r.slug, 'description', r.description,
    'origin', r.origin, 'lengthKm', r."lengthKm", 'basinAreaKm2', r."basinAreaKm2",
    'stationCount', (SELECT count(*) FROM public."MonitoringStation" s WHERE s."riverId" = r.id),
    'stretchCount', (SELECT count(*) FROM public."RiverStretch" s WHERE s."riverId" = r.id),
    'recordCount', (SELECT count(*) FROM public."HydrologyRecord" h LEFT JOIN public."Dataset" d ON d.id = h."datasetId" WHERE h."riverId" = r.id AND (NOT published_only OR d.status = 'PUBLISHED'::public."DatasetStatus")),
    'datasetCount', (SELECT count(*) FROM public."Dataset" d WHERE d."riverId" = r.id AND (NOT published_only OR d.status = 'PUBLISHED'::public."DatasetStatus")),
    'dateFrom', (SELECT min(h."observedAt") FROM public."HydrologyRecord" h LEFT JOIN public."Dataset" d ON d.id = h."datasetId" WHERE h."riverId" = r.id AND (NOT published_only OR d.status = 'PUBLISHED'::public."DatasetStatus")),
    'dateTo', (SELECT max(h."observedAt") FROM public."HydrologyRecord" h LEFT JOIN public."Dataset" d ON d.id = h."datasetId" WHERE h."riverId" = r.id AND (NOT published_only OR d.status = 'PUBLISHED'::public."DatasetStatus")),
    'parameters', coalesce((SELECT jsonb_agg(DISTINCT h."dataType") FROM public."HydrologyRecord" h LEFT JOIN public."Dataset" d ON d.id = h."datasetId" WHERE h."riverId" = r.id AND (NOT published_only OR d.status = 'PUBLISHED'::public."DatasetStatus")), '[]'::jsonb)
  ) ORDER BY CASE r.slug
    WHEN 'ganga' THEN 1 WHEN 'chambal' THEN 2 WHEN 'gandak' THEN 3 WHEN 'kosi' THEN 4
    WHEN 'ghaghra' THEN 5 WHEN 'son' THEN 6 WHEN 'mahananda' THEN 7 WHEN 'beas' THEN 8
    WHEN 'sharda' THEN 9 WHEN 'parman' THEN 10 WHEN 'bagmati' THEN 11 WHEN 'budhi-gandak' THEN 12
    ELSE 99 END), '[]'::jsonb)
  FROM public."River" r;
$$;

CREATE OR REPLACE FUNCTION public.wct_portal_river(identifier text, published_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'id', r.id, 'name', r.name, 'slug', r.slug, 'description', r.description,
    'origin', r.origin, 'lengthKm', r."lengthKm", 'basinAreaKm2', r."basinAreaKm2",
    'stations', coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'code',s.code,'latitude',s.latitude,'longitude',s.longitude,'active',s.active,'stateId',s."stateId",'districtId',s."districtId") ORDER BY s.name) FROM public."MonitoringStation" s WHERE s."riverId"=r.id), '[]'::jsonb),
    'stretches', coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'stateId',s."stateId",'districtId',s."districtId") ORDER BY s.name) FROM public."RiverStretch" s WHERE s."riverId"=r.id), '[]'::jsonb),
    'datasets', coalesce((SELECT jsonb_agg(to_jsonb(d) - 'geom' ORDER BY d."createdAt" DESC) FROM public."Dataset" d WHERE d."riverId"=r.id AND (NOT published_only OR d.status='PUBLISHED'::public."DatasetStatus")), '[]'::jsonb),
    'attributes', jsonb_build_array(
      jsonb_build_object('key','hydrology','label','Hydrological Change','enabled',exists(SELECT 1 FROM public.wct_filtered_records(jsonb_build_object('riverId',r.id),published_only))),
      jsonb_build_object('key','climate','label','Climate Change','enabled',exists(SELECT 1 FROM public."Dataset" d WHERE d."riverId"=r.id AND d."dataType"='climate' AND (NOT published_only OR d.status='PUBLISHED'::public."DatasetStatus"))),
      jsonb_build_object('key','wildlife','label','Wildlife Trends','enabled',exists(SELECT 1 FROM public."Dataset" d WHERE d."riverId"=r.id AND d."dataType"='wildlife' AND (NOT published_only OR d.status='PUBLISHED'::public."DatasetStatus"))),
      jsonb_build_object('key','fishery','label','Fishery Trends','enabled',exists(SELECT 1 FROM public."Dataset" d WHERE d."riverId"=r.id AND d."dataType"='fishery' AND (NOT published_only OR d.status='PUBLISHED'::public."DatasetStatus")))
    ),
    'stats', jsonb_build_object('recordCount',(SELECT count(*) FROM public.wct_filtered_records(jsonb_build_object('riverId',r.id),published_only)), 'dateFrom',(SELECT min(h."observedAt") FROM public.wct_filtered_records(jsonb_build_object('riverId',r.id),published_only) h), 'dateTo',(SELECT max(h."observedAt") FROM public.wct_filtered_records(jsonb_build_object('riverId',r.id),published_only) h))
  ) FROM public."River" r WHERE r.id=identifier OR r.slug=identifier LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.wct_hydrology_metrics(f jsonb, kind text, granularity text DEFAULT 'month', published_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE result jsonb; selected_unit text; mixed boolean;
BEGIN
  SELECT min(coalesce(r.unit,p.unit)), count(DISTINCT coalesce(r.unit,p.unit)) > 1
  INTO selected_unit, mixed
  FROM public.wct_filtered_records(f,published_only) r
  LEFT JOIN public."HydrologyParameter" p ON p.id=r."parameterId";
  IF mixed THEN
    RETURN CASE kind
      WHEN 'summary' THEN jsonb_build_object('totalRecords',0,'nonNullRecords',0,'missingRecords',0,'min',null,'max',null,'avg',null,'dateFrom',null,'dateTo',null,'stationCount',0,'unit',null,'hasValues',false,'mixedUnits',true)
      WHEN 'timeseries' THEN jsonb_build_object('granularity',granularity,'unit',null,'points',jsonb_build_array(),'mixedUnits',true)
      ELSE jsonb_build_object('unit',null,'mixedUnits',true,'series',jsonb_build_array(),'buckets',jsonb_build_array(),'histogram',jsonb_build_array(),'stats',null,'years',jsonb_build_array(),'months',jsonb_build_array(),'matrix',jsonb_build_array()) END;
  END IF;
  IF kind='summary' THEN
    SELECT jsonb_build_object('totalRecords',count(*),'nonNullRecords',count(value),'missingRecords',count(*)-count(value),'min',min(value),'max',max(value),'avg',round(avg(value)::numeric,4),'dateFrom',min("observedAt"),'dateTo',max("observedAt"),'stationCount',count(DISTINCT "stationId"),'unit',selected_unit,'hasValues',count(value)>0,'mixedUnits',false)
    INTO result FROM public.wct_filtered_records(f,published_only);
  ELSIF kind='timeseries' THEN
    IF granularity NOT IN ('day','month','year') THEN granularity := 'month'; END IF;
    SELECT jsonb_build_object('granularity',granularity,'unit',selected_unit,'mixedUnits',false,'points',coalesce(jsonb_agg(jsonb_build_object('t',t,'avg',avg_value,'min',min_value,'max',max_value,'count',n) ORDER BY t),'[]'::jsonb)) INTO result
    FROM (SELECT date_trunc(granularity,"observedAt") t, round(avg(value)::numeric,4) avg_value,min(value) min_value,max(value) max_value,count(value) n FROM public.wct_filtered_records(f,published_only) GROUP BY 1) q;
  ELSIF kind IN ('annual','monthly','seasonal') THEN
    SELECT jsonb_build_object('unit',selected_unit,'mixedUnits',false,'buckets',coalesce(jsonb_agg(bucket ORDER BY sort_key),'[]'::jsonb),'series',coalesce(jsonb_agg(bucket || CASE kind WHEN 'annual' THEN jsonb_build_object('year',period::int) WHEN 'monthly' THEN jsonb_build_object('month',period::int) ELSE jsonb_build_object('season',period) END ORDER BY sort_key),'[]'::jsonb)) INTO result
    FROM (SELECT CASE kind WHEN 'annual' THEN extract(year from "observedAt")::int::text WHEN 'monthly' THEN extract(month from "observedAt")::int::text ELSE season END period,
        CASE kind WHEN 'annual' THEN extract(year from "observedAt")::int WHEN 'monthly' THEN extract(month from "observedAt")::int ELSE CASE season WHEN 'Winter' THEN 1 WHEN 'Pre-monsoon' THEN 2 WHEN 'Monsoon' THEN 3 WHEN 'Post-monsoon' THEN 4 ELSE 5 END END sort_key,
        jsonb_build_object('period',CASE kind WHEN 'annual' THEN extract(year from "observedAt")::int::text WHEN 'monthly' THEN extract(month from "observedAt")::int::text ELSE season END,'mean',round(avg(value)::numeric,4),'median',round((percentile_cont(0.5) within group(order by value))::numeric,4),'min',min(value),'max',max(value),'std',round(stddev_pop(value)::numeric,4),'count',count(value)) bucket
      FROM public.wct_filtered_records(f,published_only) WHERE kind <> 'seasonal' OR season IS NOT NULL GROUP BY 1,2) q;
  ELSIF kind='heatmap' THEN
    SELECT jsonb_build_object('unit',selected_unit,'mixedUnits',false,'years',coalesce((SELECT jsonb_agg(DISTINCT extract(year from "observedAt")::int) FROM public.wct_filtered_records(f,published_only)),'[]'::jsonb),'months','[1,2,3,4,5,6,7,8,9,10,11,12]'::jsonb,'matrix',coalesce((SELECT jsonb_agg(row_values ORDER BY yr) FROM (SELECT y.yr,jsonb_agg((SELECT round(avg(value)::numeric,3) FROM public.wct_filtered_records(f,published_only) r WHERE extract(year from r."observedAt")=y.yr AND extract(month from r."observedAt")=m.mo) ORDER BY m.mo) row_values FROM (SELECT DISTINCT extract(year from "observedAt")::int yr FROM public.wct_filtered_records(f,published_only)) y CROSS JOIN generate_series(1,12) m(mo) GROUP BY y.yr) t),'[]'::jsonb)) INTO result;
  ELSE
    result := jsonb_build_object('unit',selected_unit,'mixedUnits',false,'series','[]'::jsonb);
  END IF;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.wct_filtered_records(jsonb,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wct_portal_rivers(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wct_portal_river(text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wct_hydrology_metrics(jsonb,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_filtered_records(jsonb,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.wct_portal_rivers(boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.wct_portal_river(text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.wct_hydrology_metrics(jsonb,text,text,boolean) TO service_role;
