
-- Revoke execute from anon/authenticated on internal trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Tighten notifications insert: only admin/staff can insert (system triggers run as definer)
DROP POLICY "System inserts notifications" ON public.notifications;
CREATE POLICY "Admins and staff insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Storage policies for complaint-images bucket
CREATE POLICY "Authenticated can view complaint images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'complaint-images');

CREATE POLICY "Users upload to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'complaint-images' AND auth.uid()::text = (storage.foldername(name))[1]);
