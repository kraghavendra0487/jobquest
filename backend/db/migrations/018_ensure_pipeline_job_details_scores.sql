-- Ensure pipeline_job_details has ai_score and rating columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pipeline_job_details' AND column_name='ai_score') THEN
        ALTER TABLE public.pipeline_job_details ADD COLUMN ai_score NUMERIC(3,1) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pipeline_job_details' AND column_name='rating') THEN
        ALTER TABLE public.pipeline_job_details ADD COLUMN rating NUMERIC(3,1) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pipeline_job_details' AND column_name='assigned_schools') THEN
        ALTER TABLE public.pipeline_job_details ADD COLUMN assigned_schools TEXT[] DEFAULT '{}';
    END IF;
END $$;
