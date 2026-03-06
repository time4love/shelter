-- ============================================
-- Shelter: Phase 2 - Game Votes + current_game on rooms
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add current_game column to rooms (nullable until host starts a game)
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS current_game TEXT
  CHECK (current_game IS NULL OR current_game IN ('truth_or_lie', 'the_imposter'));

-- 2. Create game_votes table
CREATE TABLE IF NOT EXISTS public.game_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL CHECK (game_id IN ('truth_or_lie', 'the_imposter')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_game_votes_room_id ON public.game_votes(room_id);

-- 3. Enable RLS on game_votes (anonymous read + insert + update, like others)
ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_game_votes_select" ON public.game_votes;
CREATE POLICY "anon_game_votes_select"
  ON public.game_votes FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_game_votes_insert" ON public.game_votes;
CREATE POLICY "anon_game_votes_insert"
  ON public.game_votes FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_game_votes_update" ON public.game_votes;
CREATE POLICY "anon_game_votes_update"
  ON public.game_votes FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4. Realtime: REPLICA IDENTITY FULL and add to publication
ALTER TABLE public.game_votes REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.game_votes;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;

-- 5. Allow updating current_game on rooms (RLS already allows anon update)
-- No extra policy needed; existing anon_rooms_update covers it.
