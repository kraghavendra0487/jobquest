-- Fix pipeline_companies.rating to support decimal values (0-10.0)
-- The error "invalid input syntax for type integer: '6.5'" indicates this column is currently an INTEGER.

-- 1. Ensure the column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pipeline_companies' AND column_name='rating') THEN
        ALTER TABLE public.pipeline_companies ADD COLUMN rating NUMERIC(3,1) DEFAULT 0;
    ELSE
        ALTER TABLE public.pipeline_companies ALTER COLUMN rating TYPE NUMERIC(3,1) USING rating::NUMERIC(3,1);
    END IF;
END $$;

-- 2. Ensure pipeline_step1_output.rating also supports decimals
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pipeline_step1_output' AND column_name='rating') THEN
        ALTER TABLE public.pipeline_step1_output ALTER COLUMN rating TYPE NUMERIC(3,1) USING rating::NUMERIC(3,1);
    END IF;
END $$;
