-- ============================================
-- Shelter: Real-time Text Chat
-- Run this in Supabase SQL Editor
-- ============================================

-- Chat messages: one row per message in a room
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fetching messages by room (ordered by time)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
  ON public.chat_messages(room_id, created_at ASC);

-- Enable RLS: anonymous SELECT and INSERT only (no update/delete for chat)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_chat_messages_select"
  ON public.chat_messages FOR SELECT TO anon USING (true);

CREATE POLICY "anon_chat_messages_insert"
  ON public.chat_messages FOR INSERT TO anon WITH CHECK (true);

-- Realtime: full row on INSERT so subscribers get payload
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add to Realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL; -- already member
END $$;
