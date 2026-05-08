-- Lock down profile-photos bucket
UPDATE storage.buckets SET public = false WHERE id = 'profile-photos';

-- Remove the wide-open public read policy
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;

-- Allow anonymous + authenticated reads for STAFF photos only (used on public staff page)
CREATE POLICY "Public can view staff profile photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] = 'staff'
);

-- Authenticated users can view all profile photos (covers student photos for admins/teachers/own student/parent)
CREATE POLICY "Authenticated users can view profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-photos');

-- Enable HIBP leaked-password protection is configured separately via configure_auth (not migration).