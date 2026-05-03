-- Tri-state admin approval: NULL = not set, TRUE = approved, FALSE = not approved
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pipeline_job_details' AND column_name = 'approved'
  ) THEN
    ALTER TABLE public.pipeline_job_details
      ADD COLUMN approved BOOLEAN NULL DEFAULT NULL;
  END IF;
END $$;
