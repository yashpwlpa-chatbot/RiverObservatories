-- Keep the existing application schema while Supabase Auth becomes the identity source.
-- Every API operation goes through an Edge Function; tables have no browser policies.
ALTER TABLE public."User" ALTER COLUMN "passwordHash" SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.wct_create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public."User" ("id", "email", "name", "passwordHash", "role", "active", "createdAt", "updatedAt")
  VALUES (NEW.id::text, lower(NEW.email),
          coalesce(nullif(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1)),
          '', 'VIEWER'::public."Role", true, now(), now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER wct_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.wct_create_user_profile();

-- The Data API must never expose unpublished observations or staff records.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename <> 'spatial_ref_sys'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.tablename);
  END LOOP;
END;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wct_create_user_profile() FROM PUBLIC, anon, authenticated;
