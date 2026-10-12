-- =============================================================
-- FIX: Storage policies for the id-documents bucket
-- =============================================================

-- 1. Make sure the bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can upload their own ID document" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own ID document" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own ID document" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all ID documents" ON storage.objects;

-- 3. Users can UPLOAD their own ID document (path starts with their user_id)
CREATE POLICY "Users can upload their own ID document"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Users can UPDATE (upsert) their own ID document
CREATE POLICY "Users can update their own ID document"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Users can VIEW their own ID document
CREATE POLICY "Users can view their own ID document"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. Admins can VIEW ALL ID documents (this is the key fix)
CREATE POLICY "Admins can view all ID documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'id-documents'
    AND public.is_admin()
  );
