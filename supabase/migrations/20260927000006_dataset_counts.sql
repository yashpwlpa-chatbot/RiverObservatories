CREATE OR REPLACE FUNCTION public.wct_dataset_counts()
RETURNS TABLE("datasetId" text, "recordCount" bigint)
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT "datasetId", count(*) FROM public."HydrologyRecord" WHERE "datasetId" IS NOT NULL GROUP BY "datasetId";
$$;
REVOKE ALL ON FUNCTION public.wct_dataset_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_dataset_counts() TO service_role;
