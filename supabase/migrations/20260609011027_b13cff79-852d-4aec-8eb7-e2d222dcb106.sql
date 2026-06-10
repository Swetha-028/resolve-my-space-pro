
-- 1) Profiles: restrict broad read
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- 2) Storage: scope complaint-images SELECT to owner folder or admin/staff
DROP POLICY IF EXISTS "Authenticated can view complaint images" ON storage.objects;

CREATE POLICY "Users view own complaint images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'complaint-images'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'staff')
    )
  );

-- 3) Revoke direct execute on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_status_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_status_change() FROM anon, authenticated, PUBLIC;
