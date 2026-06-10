-- 1) Followers table
CREATE TABLE IF NOT EXISTS public.complaint_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (complaint_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.complaint_followers TO authenticated;
GRANT ALL ON public.complaint_followers TO service_role;

ALTER TABLE public.complaint_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View related followers" ON public.complaint_followers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
    OR EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users follow complaints" ON public.complaint_followers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users unfollow own" ON public.complaint_followers
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS complaint_followers_complaint_idx ON public.complaint_followers(complaint_id);

-- 2) Update notify_status_change to fan out to followers too
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Notify reporter
    INSERT INTO public.notifications (user_id, message)
    VALUES (NEW.user_id, 'Your complaint "' || NEW.title || '" is now ' || NEW.status::text);

    -- Notify followers (excluding the reporter to avoid duplicates)
    INSERT INTO public.notifications (user_id, message)
    SELECT f.user_id,
           'Complaint you are following "' || NEW.title || '" is now ' || NEW.status::text
    FROM public.complaint_followers f
    WHERE f.complaint_id = NEW.id
      AND f.user_id <> NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;