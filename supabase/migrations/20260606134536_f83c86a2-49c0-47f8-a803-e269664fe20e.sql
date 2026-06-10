
-- 1. Extend priority enum (must be in its own statement, committed before use)
ALTER TYPE public.complaint_priority ADD VALUE IF NOT EXISTS 'critical';
ALTER TYPE public.complaint_category ADD VALUE IF NOT EXISTS 'washroom';

-- 2. Profile status + last login
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_sign_in_at timestamptz;

-- 3. Assignment extras
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS expected_completion_date date,
  ADD COLUMN IF NOT EXISTS priority public.complaint_priority;

-- 4. Status history (timeline)
CREATE TABLE IF NOT EXISTS public.complaint_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  from_status public.complaint_status,
  to_status public.complaint_status NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.complaint_status_history TO authenticated;
GRANT ALL ON public.complaint_status_history TO service_role;

ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View related complaint history"
ON public.complaint_status_history FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
  OR EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_status_history.complaint_id AND c.user_id = auth.uid())
);

CREATE POLICY "Admin/staff insert complaint history"
ON public.complaint_status_history FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'staff'::app_role)
  OR EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_status_history.complaint_id AND c.user_id = auth.uid())
);

-- 5. Auto-log status changes (replaces simple notify trigger? keep both)
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.complaint_status_history (complaint_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.user_id);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.complaint_status_history (complaint_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_status_change_ins ON public.complaints;
DROP TRIGGER IF EXISTS trg_log_status_change_upd ON public.complaints;
CREATE TRIGGER trg_log_status_change_ins AFTER INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change();
CREATE TRIGGER trg_log_status_change_upd AFTER UPDATE OF status ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change();

DROP TRIGGER IF EXISTS trg_notify_status_change ON public.complaints;
CREATE TRIGGER trg_notify_status_change AFTER UPDATE OF status ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();

-- 6. Admin policies on profiles & user_roles
CREATE POLICY "Admins update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert profiles"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. App settings (singleton row, admin-managed)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  college_name text NOT NULL DEFAULT 'Smart Campus',
  college_address text,
  support_email text,
  notify_on_new_complaint boolean NOT NULL DEFAULT true,
  notify_on_assignment boolean NOT NULL DEFAULT true,
  notify_on_critical boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'system',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
GRANT UPDATE, INSERT ON public.app_settings TO authenticated;

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- 8. Convenience: allow admin to read all roles is already via "Users view own roles" (admin branch); ok.
