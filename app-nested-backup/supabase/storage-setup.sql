-- ============================================
-- STORAGE BUCKETS SETUP
-- ============================================
-- Run this in Supabase SQL Editor after creating buckets in the Storage UI
-- ============================================

-- Note: Buckets must be created manually in Supabase Dashboard:
-- 1. Go to Storage → Create bucket
-- 2. Create these buckets:
--    - equipment-images (public)
--    - contracts (private)
--    - invoices (private)
--    - user-documents (private)

-- Storage policies for equipment-images (public bucket)
CREATE POLICY "Equipment images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can upload equipment images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'equipment-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Staff can update equipment images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'equipment-images'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Staff can delete equipment images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'equipment-images'
        AND auth.role() = 'authenticated'
    );

-- Storage policies for contracts (private bucket)
CREATE POLICY "Users can view their own contracts"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'contracts'
        AND (
            -- Users can view contracts for their bookings
            (storage.foldername(name))[1] IN (
                SELECT booking_id::text FROM bookings
                WHERE client_id IN (
                    SELECT id FROM clients WHERE user_id = auth.uid()
                )
            )
            OR
            -- Staff can view all contracts
            auth.role() = 'authenticated'
        )
    );

CREATE POLICY "Staff can upload contracts"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'contracts'
        AND auth.role() = 'authenticated'
    );

-- Storage policies for invoices (private bucket)
CREATE POLICY "Users can view their own invoices"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'invoices'
        AND (
            -- Users can view invoices for their bookings
            (storage.foldername(name))[1] IN (
                SELECT booking_id::text FROM bookings
                WHERE client_id IN (
                    SELECT id FROM clients WHERE user_id = auth.uid()
                )
            )
            OR
            -- Staff can view all invoices
            auth.role() = 'authenticated'
        )
    );

CREATE POLICY "System can upload invoices"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'invoices'
        AND auth.role() = 'authenticated'
    );

-- Storage policies for user-documents (private bucket)
CREATE POLICY "Users can view their own documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'user-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can upload their own documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'user-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'user-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
