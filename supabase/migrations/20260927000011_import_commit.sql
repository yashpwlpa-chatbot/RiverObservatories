CREATE UNIQUE INDEX IF NOT EXISTS hydrology_import_source_unique
  ON public."HydrologyRecord" ("importId", "sourceRowId") WHERE "importId" IS NOT NULL;

CREATE OR REPLACE FUNCTION public.wct_commit_import(import_id text, actor_id text)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  imp public."Import"%ROWTYPE;
  staged_count bigint;
  inserted_count bigint;
  river_count bigint;
  type_count bigint;
  unit_count bigint;
  river_id text;
  data_type text;
  data_unit text;
  date_first timestamp;
  date_last timestamp;
  result jsonb;
BEGIN
  SELECT * INTO imp FROM public."Import" WHERE id = import_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Import not found'; END IF;
  IF imp.status <> 'VALIDATED'::public."ImportStatus" THEN RAISE EXCEPTION 'Import must be validated before approval'; END IF;
  IF imp."validRows" IS NULL OR imp."validRows" < 1 THEN RAISE EXCEPTION 'No valid observations to import'; END IF;
  IF imp."datasetId" IS NULL THEN RAISE EXCEPTION 'Import has no dataset'; END IF;
  SELECT count(*) INTO staged_count FROM public."ImportStage" WHERE "importId" = import_id;
  IF staged_count <> imp."totalRows" OR staged_count <> imp."validRows" + imp."invalidRows" THEN
    RAISE EXCEPTION 'Import row counts changed after validation';
  END IF;
  IF EXISTS (SELECT 1 FROM public."HydrologyRecord" WHERE "importId" = import_id) THEN
    RAISE EXCEPTION 'Import already contains published observations';
  END IF;

  INSERT INTO public."HydrologyRecord" (
    id,"datasetId","importId","parameterId","riverId","stateId","districtId","stationId",
    "dataType","dataSubType",season,"observedAt",value,flag,unit,"sourceRowId","createdAt")
  SELECT gen_random_uuid()::text,imp."datasetId",import_id,
    s.normalized->>'parameterId',s.normalized->>'riverId',s.normalized->>'stateId',
    s.normalized->>'districtId',s.normalized->>'stationId',
    s.normalized->>'dataType',s.normalized->>'dataSubType',s.normalized->>'season',
    (s.normalized->>'observedAt')::timestamp,(s.normalized->>'value')::double precision,
    s.normalized->>'flag',s.normalized->>'unit',import_id || ':' || s."rowNumber",now()
  FROM public."ImportStage" s
  WHERE s."importId" = import_id AND jsonb_array_length(s.errors) = 0;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count <> imp."validRows" THEN RAISE EXCEPTION 'Validated row count did not match inserted count'; END IF;

  SELECT count(DISTINCT "riverId"),min("riverId"),count(DISTINCT "dataType"),min("dataType"),
    count(DISTINCT unit),min(unit),min("observedAt"),max("observedAt")
  INTO river_count,river_id,type_count,data_type,unit_count,data_unit,date_first,date_last
  FROM public."HydrologyRecord" WHERE "importId" = import_id;

  UPDATE public."Dataset" SET
    name = regexp_replace(name, ' \(draft\)$', ''),
    "riverId" = CASE WHEN river_count = 1 THEN river_id ELSE NULL END,
    "dataType" = CASE WHEN type_count = 1 THEN data_type ELSE NULL END,
    units = CASE WHEN unit_count = 1 THEN data_unit ELSE NULL END,
    "dateFrom" = date_first,"dateTo" = date_last,
    status = 'APPROVED'::public."DatasetStatus","updatedAt" = now()
  WHERE id = imp."datasetId";

  result := jsonb_build_object('inserted',inserted_count,'skippedInvalid',imp."invalidRows",
    'skippedDuplicate',imp."duplicateRows",'missingCount',imp."missingValues",
    'datasetId',imp."datasetId",'datasetStatus','APPROVED');
  UPDATE public."Import" SET status = CASE WHEN imp."invalidRows" > 0 THEN 'PARTIAL'::public."ImportStatus" ELSE 'IMPORTED'::public."ImportStatus" END,
    summary = coalesce(imp.summary,'{}'::jsonb) || result,"updatedAt" = now()
  WHERE id = import_id;
  INSERT INTO public."AuditLog" (id,"userId",action,"entityType","entityId",details,"createdAt")
  VALUES (gen_random_uuid()::text,actor_id,'IMPORT_APPROVED','Import',import_id,result,now());
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.wct_commit_import(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_commit_import(text,text) TO service_role;
