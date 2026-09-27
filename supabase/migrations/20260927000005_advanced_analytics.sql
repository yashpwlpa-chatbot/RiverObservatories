CREATE OR REPLACE FUNCTION public.wct_hydrology_distribution(f jsonb, bins integer DEFAULT 20, published_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE s record; histogram jsonb; selected_unit text; mixed boolean; n integer;
BEGIN
  SELECT min(coalesce(r.unit,p.unit)), count(DISTINCT coalesce(r.unit,p.unit))>1 INTO selected_unit,mixed
  FROM public.wct_filtered_records(f,published_only) r LEFT JOIN public."HydrologyParameter" p ON p.id=r."parameterId";
  IF mixed THEN RETURN jsonb_build_object('unit',null,'mixedUnits',true,'histogram','[]'::jsonb,'stats',null); END IF;
  SELECT count(value) AS n, min(value) AS low, max(value) AS high, round(avg(value)::numeric,4) AS mean,
    round(stddev_pop(value)::numeric,4) AS std,
    round((percentile_cont(0.25) WITHIN GROUP (ORDER BY value))::numeric,4) AS p25,
    round((percentile_cont(0.5) WITHIN GROUP (ORDER BY value))::numeric,4) AS p50,
    round((percentile_cont(0.75) WITHIN GROUP (ORDER BY value))::numeric,4) AS p75
  INTO s FROM public.wct_filtered_records(f,published_only);
  n := least(greatest(coalesce(bins,20),5),50);
  IF s.n=0 THEN histogram:='[]'::jsonb;
  ELSIF s.low=s.high THEN histogram:=jsonb_build_array(jsonb_build_object('bin',1,'from',s.low,'to',s.high,'count',s.n));
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object('bin',bucket,'from',round((s.low+(bucket-1)*(s.high-s.low)/n)::numeric,4),'to',round((s.low+bucket*(s.high-s.low)/n)::numeric,4),'count',frequency) ORDER BY bucket),'[]'::jsonb)
    INTO histogram FROM (SELECT least(width_bucket(value,s.low,s.high,n),n) bucket,count(*) frequency FROM public.wct_filtered_records(f,published_only) WHERE value IS NOT NULL GROUP BY 1) q;
  END IF;
  RETURN jsonb_build_object('unit',selected_unit,'mixedUnits',false,'histogram',histogram,
    'stats',CASE WHEN s.n=0 THEN null ELSE jsonb_build_object('count',s.n,'min',s.low,'max',s.high,'mean',s.mean,'std',s.std,'p25',s.p25,'median',s.p50,'p75',s.p75) END);
END;
$$;

CREATE OR REPLACE FUNCTION public.wct_hydrology_compare(f jsonb, mode text DEFAULT 'year', series_limit integer DEFAULT 6, published_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE selected_unit text; mixed boolean; output jsonb;
BEGIN
  SELECT min(coalesce(r.unit,p.unit)),count(DISTINCT coalesce(r.unit,p.unit))>1 INTO selected_unit,mixed
  FROM public.wct_filtered_records(f,published_only) r LEFT JOIN public."HydrologyParameter" p ON p.id=r."parameterId";
  IF mixed THEN RETURN jsonb_build_object('mode',mode,'unit',null,'mixedUnits',true,'series','[]'::jsonb); END IF;
  IF mode='station' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('name',station_name,'points',points) ORDER BY station_name),'[]'::jsonb) INTO output
    FROM (SELECT s.name station_name, jsonb_agg(jsonb_build_object('t',date_trunc('month',r."observedAt"),'value',r.mean) ORDER BY r."observedAt") points
      FROM (SELECT "stationId", date_trunc('month',"observedAt") "observedAt",round(avg(value)::numeric,4) mean FROM public.wct_filtered_records(f,published_only) WHERE "stationId" IS NOT NULL GROUP BY 1,2) r
      JOIN public."MonitoringStation" s ON s.id=r."stationId" GROUP BY s.name LIMIT least(greatest(series_limit,1),20)) q;
  ELSIF mode='season' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('name',season,'points',points) ORDER BY season),'[]'::jsonb) INTO output
    FROM (SELECT season,jsonb_agg(jsonb_build_object('t',yr::text,'value',mean) ORDER BY yr) points
      FROM (SELECT season,extract(year from "observedAt")::int AS yr,round(avg(value)::numeric,4) mean FROM public.wct_filtered_records(f,published_only) WHERE season IS NOT NULL GROUP BY 1,2) r GROUP BY season) q;
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object('name',yr::text,'points',points) ORDER BY yr),'[]'::jsonb) INTO output
    FROM (SELECT yr,jsonb_agg(jsonb_build_object('t',make_date(yr,mo,1),'value',mean) ORDER BY mo) points
      FROM (SELECT extract(year from "observedAt")::int AS yr,extract(month from "observedAt")::int AS mo,round(avg(value)::numeric,4) mean FROM public.wct_filtered_records(f,published_only) GROUP BY 1,2) r GROUP BY yr ORDER BY yr DESC LIMIT least(greatest(series_limit,1),20)) q;
  END IF;
  RETURN jsonb_build_object('mode',mode,'unit',selected_unit,'mixedUnits',false,'series',output);
END;
$$;

REVOKE ALL ON FUNCTION public.wct_hydrology_distribution(jsonb,integer,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wct_hydrology_compare(jsonb,text,integer,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_hydrology_distribution(jsonb,integer,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.wct_hydrology_compare(jsonb,text,integer,boolean) TO service_role;
