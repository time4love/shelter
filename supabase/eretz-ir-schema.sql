-- ============================================
-- Shelter: Eretz Ir (ארץ עיר) - Categories game
-- Run this in Supabase SQL Editor after schema.sql and game-votes-and-rooms.sql
-- ============================================

-- 1. Allow 'eretz_ir' in rooms.current_game and game_votes.game_id
ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_current_game_check;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_current_game_check
  CHECK (current_game IS NULL OR current_game IN ('truth_or_lie', 'the_imposter', 'eretz_ir'));

ALTER TABLE public.game_votes
  DROP CONSTRAINT IF EXISTS game_votes_game_id_check;
ALTER TABLE public.game_votes
  ADD CONSTRAINT game_votes_game_id_check
  CHECK (game_id IN ('truth_or_lie', 'the_imposter', 'eretz_ir'));

-- 2. Eretz Ir answers table (one row per player per room per round)
CREATE TABLE IF NOT EXISTS public.eretz_ir_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_eretz_ir_answers_room_id ON public.eretz_ir_answers(room_id);

-- 3. RLS (anonymous read/write)
ALTER TABLE public.eretz_ir_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_eretz_ir_answers_select" ON public.eretz_ir_answers;
CREATE POLICY "anon_eretz_ir_answers_select"
  ON public.eretz_ir_answers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_eretz_ir_answers_insert" ON public.eretz_ir_answers;
CREATE POLICY "anon_eretz_ir_answers_insert"
  ON public.eretz_ir_answers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_eretz_ir_answers_update" ON public.eretz_ir_answers;
CREATE POLICY "anon_eretz_ir_answers_update"
  ON public.eretz_ir_answers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4. Realtime
ALTER TABLE public.eretz_ir_answers REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.eretz_ir_answers;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
