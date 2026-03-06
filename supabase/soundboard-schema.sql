-- ============================================
-- Shelter: Global Soundboard – Storage & players.sounds
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create public storage bucket for voice clips
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio_clips',
  'audio_clips',
  true,
  5242880,  -- 5 MB max per file
  ARRAY['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage policies: allow anonymous INSERT, SELECT, UPDATE, DELETE on audio_clips (idempotent)
-- UPDATE is required when re-recording after delete (same path overwrite)
DROP POLICY IF EXISTS "anon_audio_clips_insert" ON storage.objects;
CREATE POLICY "anon_audio_clips_insert"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'audio_clips');

DROP POLICY IF EXISTS "anon_audio_clips_select" ON storage.objects;
CREATE POLICY "anon_audio_clips_select"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'audio_clips');

DROP POLICY IF EXISTS "anon_audio_clips_update" ON storage.objects;
CREATE POLICY "anon_audio_clips_update"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'audio_clips')
  WITH CHECK (bucket_id = 'audio_clips');

DROP POLICY IF EXISTS "anon_audio_clips_delete" ON storage.objects;
CREATE POLICY "anon_audio_clips_delete"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'audio_clips');

-- 3. Add sounds column to players (JSONB: { "1": "url", "2": "url", "3": "url" })
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS sounds JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.players.sounds IS 'Up to 3 voice clips: keys "1","2","3", values { "url": "...", "name": "..." }. Legacy: value may be plain URL string.';
