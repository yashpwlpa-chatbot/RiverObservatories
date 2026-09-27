CREATE TABLE public."ImportStage" (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "importId" text NOT NULL REFERENCES public."Import"(id) ON DELETE CASCADE,
  "rowNumber" integer NOT NULL,
  raw jsonb NOT NULL,
  normalized jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT import_stage_import_row_unique UNIQUE ("importId","rowNumber")
);
CREATE INDEX import_stage_import_idx ON public."ImportStage"("importId");
ALTER TABLE public."ImportStage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."ImportStage" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public."ImportStage_id_seq" FROM anon, authenticated;
