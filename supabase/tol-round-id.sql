-- ============================================
-- Shelter: Truth or Lie – associate statements/guesses with a round
-- Run in Supabase SQL Editor after truth-or-lie-schema.sql
-- ============================================
-- When a new round of Truth or Lie starts, only data for the current round is shown.

-- 1. tol_statements: add round_id (nullable first for backfill)
ALTER TABLE public.tol_statements
  ADD COLUMN IF NOT EXISTS round_id UUID NULL;

-- 2. Backfill: one "legacy" round per room
UPDATE public.tol_statements
SET round_id = room_id
WHERE round_id IS NULL;

ALTER TABLE public.tol_statements
  ALTER COLUMN round_id SET NOT NULL;

-- 3. Drop old unique, add new unique (room_id, round_id, player_id)
ALTER TABLE public.tol_statements
  DROP CONSTRAINT IF EXISTS tol_statements_room_id_player_id_key;

ALTER TABLE public.tol_statements
  ADD CONSTRAINT tol_statements_room_round_player_key
  UNIQUE (room_id, round_id, player_id);

CREATE INDEX IF NOT EXISTS idx_tol_statements_room_round
  ON public.tol_statements(room_id, round_id);

-- 4. tol_guesses: add round_id (nullable first for backfill)
ALTER TABLE public.tol_guesses
  ADD COLUMN IF NOT EXISTS round_id UUID NULL;

UPDATE public.tol_guesses
SET round_id = room_id
WHERE round_id IS NULL;

ALTER TABLE public.tol_guesses
  ALTER COLUMN round_id SET NOT NULL;

-- 5. Drop old unique, add new unique (room_id, round_id, author_id, guesser_id)
ALTER TABLE public.tol_guesses
  DROP CONSTRAINT IF EXISTS tol_guesses_room_id_author_id_guesser_id_key;

ALTER TABLE public.tol_guesses
  ADD CONSTRAINT tol_guesses_room_round_author_guesser_key
  UNIQUE (room_id, round_id, author_id, guesser_id);

CREATE INDEX IF NOT EXISTS idx_tol_guesses_room_round_author
  ON public.tol_guesses(room_id, round_id, author_id);
