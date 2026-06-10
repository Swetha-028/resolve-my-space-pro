ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS ai_suggested_priority public.complaint_priority,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS ai_reason text;