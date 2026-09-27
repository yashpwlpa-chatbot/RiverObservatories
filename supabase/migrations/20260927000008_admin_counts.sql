CREATE OR REPLACE FUNCTION public.wct_admin_counts()
RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'rivers',(SELECT count(*) FROM public."River"),
    'stations',(SELECT count(*) FROM public."MonitoringStation"),
    'datasets',(SELECT count(*) FROM public."Dataset"),
    'records',(SELECT count(*) FROM public."HydrologyRecord"),
    'pendingSubmissions',(SELECT count(*) FROM public."Submission" WHERE status='PENDING'::public."SubmissionStatus"),
    'failedImports',(SELECT count(*) FROM public."Import" WHERE status='FAILED'::public."ImportStatus"),
    'users',(SELECT count(*) FROM public."User")
  );
$$;
REVOKE ALL ON FUNCTION public.wct_admin_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wct_admin_counts() TO service_role;
