CREATE OR REPLACE FUNCTION public.wct_validate_import(import_id text, mapping jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE imp public."Import"%ROWTYPE; staged_count bigint; validation_summary jsonb;
BEGIN
  SELECT * INTO imp FROM public."Import" WHERE id=import_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Import not found'; END IF;
  IF imp.status NOT IN ('UPLOADED'::public."ImportStatus",'VALIDATED'::public."ImportStatus") THEN RAISE EXCEPTION 'Import cannot be validated in its current state'; END IF;
  IF nullif(mapping->>'river','') IS NULL OR nullif(mapping->>'date','') IS NULL OR nullif(mapping->>'value','') IS NULL THEN
    RAISE EXCEPTION 'Map river, date and value before validating';
  END IF;
  SELECT count(*) INTO staged_count FROM public."ImportStage" WHERE "importId"=import_id;
  IF staged_count<>imp."totalRows" THEN RAISE EXCEPTION 'Upload is incomplete: % of % rows received',staged_count,imp."totalRows"; END IF;

  WITH mapped AS (
    SELECT s.id,s."rowNumber",s.raw,
      trim(coalesce(s.raw->>(mapping->>'river'),'')) river_name,
      trim(coalesce(s.raw->>(mapping->>'state'),'')) state_name,
      trim(coalesce(s.raw->>(mapping->>'district'),'')) district_name,
      trim(coalesce(s.raw->>(mapping->>'station'),'')) station_name,
      trim(coalesce(s.raw->>(mapping->>'date'),'')) date_text,
      trim(coalesce(s.raw->>(mapping->>'value'),'')) value_text,
      trim(coalesce(s.raw->>(mapping->>'dataType'),'')) type_text,
      trim(coalesce(s.raw->>(mapping->>'dataSubType'),'')) subtype_text,
      trim(coalesce(s.raw->>(mapping->>'season'),'')) season_text,
      trim(coalesce(s.raw->>(mapping->>'parameter'),'')) parameter_text,
      trim(coalesce(s.raw->>(mapping->>'unit'),'')) unit_text,
      trim(coalesce(s.raw->>(mapping->>'flag'),'')) flag_text
    FROM public."ImportStage" s WHERE s."importId"=import_id
  ), parsed AS (
    SELECT m.*,
      CASE
        WHEN date_text ~ '^\d{4}-\d{2}-\d{2}' AND substring(date_text,6,2)::int BETWEEN 1 AND 12 AND substring(date_text,9,2)::int BETWEEN 1 AND 31
          THEN CASE WHEN to_char(to_date(left(date_text,10),'YYYY-MM-DD'),'YYYY-MM-DD')=left(date_text,10) THEN to_date(left(date_text,10),'YYYY-MM-DD') ELSE NULL END
        WHEN date_text ~ '^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}$' AND split_part(replace(replace(date_text,'/','-'),'.','-'),'-',2)::int BETWEEN 1 AND 12
          THEN to_date(replace(replace(date_text,'/','-'),'.','-'),'DD-MM-YYYY')
        ELSE NULL END observation_date,
      CASE WHEN replace(value_text,',','') ~ '^[+-]?[0-9]+(\.[0-9]+)?$' THEN replace(value_text,',','')::double precision ELSE NULL END numeric_value,
      CASE WHEN value_text='' OR lower(value_text) IN ('na','n/a','missing','null','none','-','--','.') THEN true ELSE false END missing_value
    FROM mapped m
  ), resolved AS (
    SELECT p.*, r.id river_id,st.id state_id,di.id district_id,ms.id station_id,hp.id parameter_id,hp.code parameter_code,hp.unit parameter_unit,
      upper(coalesce(nullif(p.type_text,''),nullif(hp.code,''),'UNKNOWN')) data_type,
      coalesce(nullif(p.unit_text,''),nullif(hp.unit,'')) normalized_unit
    FROM parsed p
    LEFT JOIN public."River" r ON lower(r.name)=lower(p.river_name)
    LEFT JOIN public."State" st ON lower(st.name)=lower(p.state_name)
    LEFT JOIN public."District" di ON di."stateId"=st.id AND lower(di.name)=lower(p.district_name)
    LEFT JOIN public."MonitoringStation" ms ON ms."riverId"=r.id AND lower(ms.name)=lower(p.station_name)
    LEFT JOIN public."HydrologyParameter" hp ON lower(hp.code)=lower(coalesce(nullif(p.parameter_text,''),p.type_text)) OR lower(hp.name)=lower(p.parameter_text)
  ), duplicates AS (
    SELECT x.*,
      row_number() OVER (PARTITION BY river_id,station_id,data_type,subtype_text,season_text,parameter_id,observation_date ORDER BY "rowNumber") duplicate_rank,
      EXISTS(SELECT 1 FROM public."HydrologyRecord" h WHERE h."riverId"=x.river_id AND h."stationId" IS NOT DISTINCT FROM x.station_id
        AND h."dataType"=x.data_type AND h."dataSubType" IS NOT DISTINCT FROM nullif(x.subtype_text,'')
        AND h.season IS NOT DISTINCT FROM nullif(x.season_text,'') AND h."parameterId" IS NOT DISTINCT FROM x.parameter_id
        AND h."observedAt"::date=x.observation_date) existing_duplicate
    FROM resolved x
  ), checked AS (
    SELECT d.id,
      jsonb_build_object('riverId',d.river_id,'stateId',d.state_id,'districtId',d.district_id,'stationId',d.station_id,
        'parameterId',d.parameter_id,'dataType',d.data_type,'dataSubType',nullif(d.subtype_text,''),'season',nullif(d.season_text,''),
        'observedAt',d.observation_date,'value',d.numeric_value,'unit',d.normalized_unit,
        'flag',coalesce(nullif(d.flag_text,''),CASE WHEN d.missing_value THEN 'M' ELSE 'A' END)) normalized,
      (CASE WHEN d.river_name='' THEN jsonb_build_array(jsonb_build_object('field','river','code','MISSING_REQUIRED_FIELD','message','Missing river')) ELSE '[]'::jsonb END)
      || (CASE WHEN d.river_name<>'' AND d.river_id IS NULL THEN jsonb_build_array(jsonb_build_object('field','river','code','UNKNOWN_RIVER','message','River is not in the observatory catalog')) ELSE '[]'::jsonb END)
      || (CASE WHEN d.station_name='' AND (d.state_name='' OR d.district_name='') THEN jsonb_build_array(jsonb_build_object('field','station','code','MISSING_REQUIRED_FIELD','message','Provide station or state and district')) ELSE '[]'::jsonb END)
      || (CASE WHEN d.station_name<>'' AND d.station_id IS NULL THEN jsonb_build_array(jsonb_build_object('field','station','code','UNKNOWN_STATION','message','Station is not registered for this river')) ELSE '[]'::jsonb END)
      || (CASE WHEN d.state_name<>'' AND d.state_id IS NULL THEN jsonb_build_array(jsonb_build_object('field','state','code','UNKNOWN_STATE','message','State is not registered')) ELSE '[]'::jsonb END)
      || (CASE WHEN d.district_name<>'' AND d.district_id IS NULL THEN jsonb_build_array(jsonb_build_object('field','district','code','UNKNOWN_DISTRICT','message','District is not registered for this state')) ELSE '[]'::jsonb END)
      || (CASE WHEN d.date_text='' THEN jsonb_build_array(jsonb_build_object('field','date','code','MISSING_REQUIRED_FIELD','message','Missing date')) WHEN d.observation_date IS NULL THEN jsonb_build_array(jsonb_build_object('field','date','code','INVALID_DATE','message','Invalid date')) ELSE '[]'::jsonb END)
      || (CASE WHEN NOT d.missing_value AND d.numeric_value IS NULL THEN jsonb_build_array(jsonb_build_object('field','value','code','INVALID_NUMBER','message','Value is not numeric')) ELSE '[]'::jsonb END)
      || (CASE WHEN d.parameter_unit IS NOT NULL AND d.unit_text<>'' AND lower(d.parameter_unit)<>lower(d.unit_text) THEN jsonb_build_array(jsonb_build_object('field','unit','code','INVALID_UNIT','message','Unit does not match the parameter')) ELSE '[]'::jsonb END)
      || (CASE WHEN d.observation_date IS NOT NULL AND (d.duplicate_rank>1 OR d.existing_duplicate) THEN jsonb_build_array(jsonb_build_object('field',null,'code','DUPLICATE_RECORD','message','Duplicate observation')) ELSE '[]'::jsonb END) errors
    FROM duplicates d
  )
  UPDATE public."ImportStage" s SET normalized=c.normalized,errors=c.errors FROM checked c WHERE s.id=c.id;

  DELETE FROM public."ImportError" WHERE "importId"=import_id;
  INSERT INTO public."ImportError" (id,"importId","rowNumber",field,code,message,severity,"createdAt")
  SELECT gen_random_uuid()::text,import_id,s."rowNumber",e->>'field',e->>'code',e->>'message','error',now()
  FROM public."ImportStage" s CROSS JOIN LATERAL jsonb_array_elements(s.errors) e
  WHERE s."importId"=import_id ORDER BY s."rowNumber" LIMIT 2000;

  SELECT jsonb_build_object(
    'totalRows',count(*),'validRows',count(*) FILTER (WHERE jsonb_array_length(errors)=0),
    'invalidRows',count(*) FILTER (WHERE jsonb_array_length(errors)>0),
    'duplicateRows',count(*) FILTER (WHERE errors @> '[{"code":"DUPLICATE_RECORD"}]'::jsonb),
    'missingValues',count(*) FILTER (WHERE normalized->'value'='null'::jsonb),
    'fieldErrors',coalesce((SELECT jsonb_agg(jsonb_build_object('field',field,'count',n)) FROM (SELECT coalesce(e->>'field','other') field,count(*) n FROM public."ImportStage" x CROSS JOIN LATERAL jsonb_array_elements(x.errors) e WHERE x."importId"=import_id GROUP BY 1) z),'[]'::jsonb),
    'errorCodes',coalesce((SELECT jsonb_agg(jsonb_build_object('code',code,'count',n)) FROM (SELECT e->>'code' code,count(*) n FROM public."ImportStage" x CROSS JOIN LATERAL jsonb_array_elements(x.errors) e WHERE x."importId"=import_id GROUP BY 1) z),'[]'::jsonb),
    'preview',coalesce((SELECT jsonb_agg(normalized || jsonb_build_object('rowNumber',"rowNumber",'valid',jsonb_array_length(errors)=0,'errors',errors)) FROM (SELECT * FROM public."ImportStage" WHERE "importId"=import_id ORDER BY "rowNumber" LIMIT 10) p),'[]'::jsonb),
    'errorSamples',coalesce((SELECT jsonb_agg(jsonb_build_object('rowNumber',"rowNumber",'field',e->>'field','code',e->>'code','message',e->>'message')) FROM (SELECT "rowNumber",errors FROM public."ImportStage" WHERE "importId"=import_id AND jsonb_array_length(errors)>0 ORDER BY "rowNumber" LIMIT 200) p CROSS JOIN LATERAL jsonb_array_elements(p.errors) e),'[]'::jsonb)
  ) INTO validation_summary FROM public."ImportStage" WHERE "importId"=import_id;
  UPDATE public."Import" SET status='VALIDATED'::public."ImportStatus","columnMapping"=mapping,"validRows"=(validation_summary->>'validRows')::int,
    "invalidRows"=(validation_summary->>'invalidRows')::int,"duplicateRows"=(validation_summary->>'duplicateRows')::int,"missingValues"=(validation_summary->>'missingValues')::int,
    summary=validation_summary,"updatedAt"=now() WHERE id=import_id;
  UPDATE public."Dataset" SET status='VALIDATED'::public."DatasetStatus","updatedAt"=now() WHERE id=imp."datasetId" AND status='DRAFT'::public."DatasetStatus";
  RETURN validation_summary;
END;
$$;
REVOKE ALL ON FUNCTION public.wct_validate_import(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_validate_import(text,jsonb) TO service_role;
