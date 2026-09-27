CREATE OR REPLACE FUNCTION public.wct_filter_options(f jsonb, published_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  WITH records AS MATERIALIZED (SELECT * FROM public.wct_filtered_records(f,published_only)),
  bounds AS (SELECT min("observedAt") first_date, max("observedAt") last_date FROM records)
  SELECT jsonb_build_object(
    'dataTypes', coalesce((SELECT jsonb_agg(DISTINCT "dataType") FROM records WHERE "dataType" IS NOT NULL),'[]'::jsonb),
    'dataSubTypes', coalesce((SELECT jsonb_agg(DISTINCT "dataSubType") FROM records WHERE "dataSubType" IS NOT NULL),'[]'::jsonb),
    'seasons', coalesce((SELECT jsonb_agg(DISTINCT season) FROM records WHERE season IS NOT NULL),'[]'::jsonb),
    'parameters', coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'code',code,'name',name,'unit',unit) ORDER BY name) FROM public."HydrologyParameter"),'[]'::jsonb),
    'years', coalesce((SELECT jsonb_agg(y) FROM bounds b, generate_series(extract(year from b.first_date)::int,extract(year from b.last_date)::int) y),'[]'::jsonb),
    'months', '[1,2,3,4,5,6,7,8,9,10,11,12]'::jsonb,
    'dateBounds', jsonb_build_object('from',(SELECT first_date FROM bounds),'to',(SELECT last_date FROM bounds))
  );
$$;
REVOKE ALL ON FUNCTION public.wct_filter_options(jsonb,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_filter_options(jsonb,boolean) TO service_role;
