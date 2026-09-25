-- Chat file/image uploads live in the private "attachments" bucket.
-- Each user can only read and write inside their own folder (<user_id>/...).
DROP POLICY IF EXISTS "Attachments owner read" ON storage.objects;
DROP POLICY IF EXISTS "Attachments owner write" ON storage.objects;
DROP POLICY IF EXISTS "Attachments owner delete" ON storage.objects;

CREATE POLICY "Attachments owner read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Attachments owner write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Attachments owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);