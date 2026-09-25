-- Remove the unbound public read on the private avatars bucket.
-- Avatar images are served through short-lived signed URLs, so no public
-- SELECT policy is needed; direct reads are limited to the file owner.
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;

DROP POLICY IF EXISTS "Avatar owner read" ON storage.objects;
CREATE POLICY "Avatar owner read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND owner_id = (select auth.uid()::text));