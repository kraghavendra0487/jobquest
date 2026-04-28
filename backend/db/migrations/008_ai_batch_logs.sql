-- 008_ai_batch_logs.sql
CREATE TABLE IF NOT EXISTS public.ai_batch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.ai_batches(id) ON DELETE CASCADE,
  item_id uuid, -- job_id or company_id
  item_name text, -- company name or job title
  status varchar(20) NOT NULL, -- 'success' | 'failed'
  output jsonb, -- the AI response for this specific item
  prompt_snapshot text, -- The input prompt used
  tokens_used int, -- Total tokens for this call
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_batch_logs_batch_id_idx ON public.ai_batch_logs (batch_id);
CREATE INDEX IF NOT EXISTS ai_batch_logs_created_at_idx ON public.ai_batch_logs (created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_batch_logs ENABLE ROW LEVEL SECURITY;

-- Admin can see/manage everything
DROP POLICY IF EXISTS ai_batch_logs_admin_all ON public.ai_batch_logs;
CREATE POLICY ai_batch_logs_admin_all ON public.ai_batch_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
