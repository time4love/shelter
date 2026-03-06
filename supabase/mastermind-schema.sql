-- ============================================
-- Shelter: Mastermind (בול פגיעה) - Code breaker multiplayer
-- Tables: mastermind_codes (secret code per round), mastermind_guesses (guess + bulls/hits)
-- Run in Supabase SQL Editor after schema.sql and game-votes (with other games)
-- ============================================

-- 0. Allow 'mastermind' in rooms.current_game and game_votes.game_id
ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_current_game_check;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_current_game_check
  CHECK (current_game IS NULL OR current_game IN ('truth_or_lie', 'the_imposter', 'eretz_ir', 'battleship', 'mastermind'));

ALTER TABLE public.game_votes
  DROP CONSTRAINT IF EXISTS game_votes_game_id_check;
ALTER TABLE public.game_votes
  ADD CONSTRAINT game_votes_game_id_check
  CHECK (game_id IN ('truth_or_lie', 'the_imposter', 'eretz_ir', 'battleship', 'mastermind'));

-- 1. Mastermind codes: one per room per round (setter hides the code)
--    code: JSONB array of 4 string color names (e.g. ["red","blue","green","yellow"])
CREATE TABLE public.mastermind_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  setter_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  code JSONB NOT NULL CHECK (jsonb_array_length(code) = 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mastermind_codes_room_id ON public.mastermind_codes(room_id);

-- 2. Mastermind guesses: one row per guess with bulls/hits feedback
CREATE TABLE public.mastermind_guesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  guesser_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  guess JSONB NOT NULL CHECK (jsonb_array_length(guess) = 4),
  bulls INTEGER NOT NULL CHECK (bulls >= 0 AND bulls <= 4),
  hits INTEGER NOT NULL CHECK (hits >= 0 AND hits <= 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mastermind_guesses_room_id ON public.mastermind_guesses(room_id);
CREATE INDEX idx_mastermind_guesses_created_at ON public.mastermind_guesses(room_id, created_at);

-- 3. RLS: allow anonymous ALL for both tables
ALTER TABLE public.mastermind_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastermind_guesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_mastermind_codes_all" ON public.mastermind_codes;
CREATE POLICY "anon_mastermind_codes_all"
  ON public.mastermind_codes FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_mastermind_guesses_all" ON public.mastermind_guesses;
CREATE POLICY "anon_mastermind_guesses_all"
  ON public.mastermind_guesses FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Realtime: REPLICA IDENTITY FULL and add mastermind_guesses to publication
--    (mastermind_codes is read once when submitting a guess; optional to add if you want live code-created events)
ALTER TABLE public.mastermind_codes REPLICA IDENTITY FULL;
ALTER TABLE public.mastermind_guesses REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mastermind_codes;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mastermind_guesses;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
