CREATE OR REPLACE FUNCTION public.wct_geojson(kind text, river_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  IF kind='rivers' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('type','Feature','geometry',public.ST_AsGeoJSON(geom)::jsonb,'properties',jsonb_build_object('id',id,'name',name,'slug',slug))),'[]'::jsonb)
    INTO result FROM public."River" WHERE geom IS NOT NULL;
  ELSIF kind='stations' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('type','Feature','geometry',public.ST_AsGeoJSON(geom)::jsonb,'properties',jsonb_build_object('id',id,'name',name,'code',code,'riverId',"riverId",'latitude',latitude,'longitude',longitude))),'[]'::jsonb)
    INTO result FROM public."MonitoringStation" WHERE geom IS NOT NULL AND active AND (river_id IS NULL OR "riverId"=river_id);
  ELSIF kind='stretches' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('type','Feature','geometry',public.ST_AsGeoJSON(geom)::jsonb,'properties',jsonb_build_object('id',id,'name',name,'riverId',"riverId"))),'[]'::jsonb)
    INTO result FROM public."RiverStretch" WHERE geom IS NOT NULL AND (river_id IS NULL OR "riverId"=river_id);
  ELSIF kind='states' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('type','Feature','geometry',public.ST_AsGeoJSON(geom)::jsonb,'properties',jsonb_build_object('id',id,'name',name,'code',code))),'[]'::jsonb)
    INTO result FROM public."State" WHERE geom IS NOT NULL;
  ELSIF kind='districts' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object('type','Feature','geometry',public.ST_AsGeoJSON(geom)::jsonb,'properties',jsonb_build_object('id',id,'name',name,'stateId',"stateId"))),'[]'::jsonb)
    INTO result FROM public."District" WHERE geom IS NOT NULL;
  ELSE
    result := '[]'::jsonb;
  END IF;
  RETURN jsonb_build_object('layer',kind,'count',jsonb_array_length(result),'geojson',jsonb_build_object('type','FeatureCollection','features',result));
END;
$$;
REVOKE ALL ON FUNCTION public.wct_geojson(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_geojson(text,text) TO service_role;
