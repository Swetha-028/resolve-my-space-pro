
-- Staff module: work notes, before/after photos, realtime
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS before_image_url text,
  ADD COLUMN IF NOT EXISTS after_image_url text;

CREATE TABLE IF NOT EXISTS public.complaint_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.complaint_notes TO authenticated;
GRANT ALL ON public.complaint_notes TO service_role;

ALTER TABLE public.complaint_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View related notes" ON public.complaint_notes
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Staff or admin insert notes" ON public.complaint_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
  );

-- Realtime
ALTER TABLE public.complaints REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.assignments REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
