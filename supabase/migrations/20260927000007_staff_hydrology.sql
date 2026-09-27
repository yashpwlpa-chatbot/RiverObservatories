CREATE OR REPLACE FUNCTION public.wct_hydrology_extremes(f jsonb, row_limit integer DEFAULT 10, threshold double precision DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE selected_unit text; mixed boolean; high_rows jsonb; low_rows jsonb; above_rows jsonb; below_rows jsonb; above_n bigint; below_n bigint; n integer;
BEGIN
  SELECT min(coalesce(r.unit,p.unit)),count(DISTINCT coalesce(r.unit,p.unit))>1 INTO selected_unit,mixed
  FROM public.wct_filtered_records(f,false) r LEFT JOIN public."HydrologyParameter" p ON p.id=r."parameterId";
  IF mixed THEN RETURN jsonb_build_object('unit',null,'mixedUnits',true,'highest','[]'::jsonb,'lowest','[]'::jsonb,'exceedances',null); END IF;
  n:=least(greatest(coalesce(row_limit,10),1),50);
  SELECT coalesce(jsonb_agg(item),'[]'::jsonb) INTO high_rows FROM (
    SELECT jsonb_build_object('id',r.id,'observedAt',r."observedAt",'value',r.value,'unit',r.unit,'season',r.season,'dataType',r."dataType",'stationId',r."stationId",'stationName',s.name,'riverName',v.name) item
    FROM public.wct_filtered_records(f,false) r LEFT JOIN public."MonitoringStation" s ON s.id=r."stationId" JOIN public."River" v ON v.id=r."riverId"
    WHERE r.value IS NOT NULL ORDER BY r.value DESC LIMIT n) q;
  SELECT coalesce(jsonb_agg(item),'[]'::jsonb) INTO low_rows FROM (
    SELECT jsonb_build_object('id',r.id,'observedAt',r."observedAt",'value',r.value,'unit',r.unit,'season',r.season,'dataType',r."dataType",'stationId',r."stationId",'stationName',s.name,'riverName',v.name) item
    FROM public.wct_filtered_records(f,false) r LEFT JOIN public."MonitoringStation" s ON s.id=r."stationId" JOIN public."River" v ON v.id=r."riverId"
    WHERE r.value IS NOT NULL ORDER BY r.value ASC LIMIT n) q;
  IF threshold IS NULL THEN RETURN jsonb_build_object('unit',selected_unit,'mixedUnits',false,'highest',high_rows,'lowest',low_rows,'exceedances',null); END IF;
  SELECT count(*) INTO above_n FROM public.wct_filtered_records(f,false) WHERE value>=threshold;
  SELECT count(*) INTO below_n FROM public.wct_filtered_records(f,false) WHERE value<=threshold;
  SELECT coalesce(jsonb_agg(item),'[]'::jsonb) INTO above_rows FROM (
    SELECT jsonb_build_object('id',r.id,'observedAt',r."observedAt",'value',r.value,'unit',r.unit,'season',r.season,'dataType',r."dataType",'stationId',r."stationId",'stationName',s.name,'riverName',v.name) item
    FROM public.wct_filtered_records(f,false) r LEFT JOIN public."MonitoringStation" s ON s.id=r."stationId" JOIN public."River" v ON v.id=r."riverId"
    WHERE r.value>=threshold ORDER BY r.value DESC LIMIT n) q;
  SELECT coalesce(jsonb_agg(item),'[]'::jsonb) INTO below_rows FROM (
    SELECT jsonb_build_object('id',r.id,'observedAt',r."observedAt",'value',r.value,'unit',r.unit,'season',r.season,'dataType',r."dataType",'stationId',r."stationId",'stationName',s.name,'riverName',v.name) item
    FROM public.wct_filtered_records(f,false) r LEFT JOIN public."MonitoringStation" s ON s.id=r."stationId" JOIN public."River" v ON v.id=r."riverId"
    WHERE r.value<=threshold ORDER BY r.value ASC LIMIT n) q;
  RETURN jsonb_build_object('unit',selected_unit,'mixedUnits',false,'highest',high_rows,'lowest',low_rows,'exceedances',jsonb_build_object('aboveCount',above_n,'belowCount',below_n,'above',above_rows,'below',below_rows));
END;
$$;

CREATE OR REPLACE FUNCTION public.wct_hydrology_scatter(f jsonb, row_limit integer DEFAULT 500)
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object('unit',(SELECT min(unit) FROM public.wct_filtered_records(f,false)),
    'mixedUnits',(SELECT count(DISTINCT unit)>1 FROM public.wct_filtered_records(f,false)),
    'points',coalesce(jsonb_agg(jsonb_build_object('observedAt',r."observedAt",'value',r.value,'stationName',s.name) ORDER BY r."observedAt"),'[]'::jsonb))
  FROM (SELECT "observedAt",value,"stationId" FROM public.wct_filtered_records(f,false) ORDER BY "observedAt" DESC LIMIT least(greatest(row_limit,10),2000)) r
  LEFT JOIN public."MonitoringStation" s ON s.id=r."stationId";
$$;
REVOKE ALL ON FUNCTION public.wct_hydrology_extremes(jsonb,integer,double precision) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wct_hydrology_scatter(jsonb,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_hydrology_extremes(jsonb,integer,double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.wct_hydrology_scatter(jsonb,integer) TO service_role;
