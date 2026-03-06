-- ============================================
-- Shelter: Phase 3 - Truth or Lie (אמת או שקר)
-- Tables: tol_statements, tol_guesses; rooms.game_state
-- Run in Supabase SQL Editor after schema.sql and game-votes-and-rooms.sql
-- ============================================

-- 1. Add game_state (JSONB) to rooms for syncing inner game phase across clients
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS game_state JSONB DEFAULT NULL;

-- 2. Truth or Lie: statements per player (4 items: 1 truth, 3 lies)
CREATE TABLE IF NOT EXISTS public.tol_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  statements JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

-- statements format: [ { "text": string, "isTruth": boolean }, ... ] (length 4, exactly one isTruth)

CREATE INDEX IF NOT EXISTS idx_tol_statements_room_id ON public.tol_statements(room_id);
CREATE INDEX IF NOT EXISTS idx_tol_statements_player_id ON public.tol_statements(player_id);

-- 3. Truth or Lie: guesses (which statement index 0-3 each guesser chose)
CREATE TABLE IF NOT EXISTS public.tol_guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  guesser_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  guessed_index INTEGER NOT NULL CHECK (guessed_index >= 0 AND guessed_index <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, author_id, guesser_id)
);

CREATE INDEX IF NOT EXISTS idx_tol_guesses_room_author ON public.tol_guesses(room_id, author_id);

-- 4. RLS: anonymous read/write for tol_statements and tol_guesses
ALTER TABLE public.tol_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tol_guesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_tol_statements_select" ON public.tol_statements;
CREATE POLICY "anon_tol_statements_select"
  ON public.tol_statements FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_tol_statements_insert" ON public.tol_statements;
CREATE POLICY "anon_tol_statements_insert"
  ON public.tol_statements FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_tol_statements_update" ON public.tol_statements;
CREATE POLICY "anon_tol_statements_update"
  ON public.tol_statements FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_tol_guesses_select" ON public.tol_guesses;
CREATE POLICY "anon_tol_guesses_select"
  ON public.tol_guesses FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_tol_guesses_insert" ON public.tol_guesses;
CREATE POLICY "anon_tol_guesses_insert"
  ON public.tol_guesses FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_tol_guesses_update" ON public.tol_guesses;
CREATE POLICY "anon_tol_guesses_update"
  ON public.tol_guesses FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 5. Realtime: REPLICA IDENTITY FULL and add to publication
ALTER TABLE public.tol_statements REPLICA IDENTITY FULL;
ALTER TABLE public.tol_guesses REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tol_statements;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tol_guesses;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
