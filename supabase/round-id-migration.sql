-- ============================================
-- Shelter: Add round_id to game tables for session isolation
-- Run this in Supabase SQL Editor after existing game schemas
-- ============================================

-- 1. game_votes: nullable round_id (votes are for game selection; no unique change)
ALTER TABLE public.game_votes
  ADD COLUMN IF NOT EXISTS round_id TEXT;

CREATE INDEX IF NOT EXISTS idx_game_votes_round_id ON public.game_votes(round_id);

-- 2. eretz_ir_answers: nullable round_id, update unique to (room_id, round_id, player_id)
ALTER TABLE public.eretz_ir_answers
  ADD COLUMN IF NOT EXISTS round_id TEXT;

ALTER TABLE public.eretz_ir_answers
  DROP CONSTRAINT IF EXISTS eretz_ir_answers_room_id_player_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eretz_ir_answers_room_round_player
  ON public.eretz_ir_answers(room_id, round_id, player_id);

CREATE INDEX IF NOT EXISTS idx_eretz_ir_answers_round_id ON public.eretz_ir_answers(round_id);

-- 3. battleship_boards: nullable round_id, update unique to (room_id, round_id, player_id)
ALTER TABLE public.battleship_boards
  ADD COLUMN IF NOT EXISTS round_id TEXT;

ALTER TABLE public.battleship_boards
  DROP CONSTRAINT IF EXISTS battleship_boards_room_id_player_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_battleship_boards_room_round_player
  ON public.battleship_boards(room_id, round_id, player_id);

CREATE INDEX IF NOT EXISTS idx_battleship_boards_round_id ON public.battleship_boards(round_id);

-- 4. battleship_shots: nullable round_id
ALTER TABLE public.battleship_shots
  ADD COLUMN IF NOT EXISTS round_id TEXT;

CREATE INDEX IF NOT EXISTS idx_battleship_shots_round_id ON public.battleship_shots(round_id);

-- 5. mastermind_codes: nullable round_id
ALTER TABLE public.mastermind_codes
  ADD COLUMN IF NOT EXISTS round_id TEXT;

CREATE INDEX IF NOT EXISTS idx_mastermind_codes_round_id ON public.mastermind_codes(round_id);

-- 6. mastermind_guesses: nullable round_id
ALTER TABLE public.mastermind_guesses
  ADD COLUMN IF NOT EXISTS round_id TEXT;

CREATE INDEX IF NOT EXISTS idx_mastermind_guesses_round_id ON public.mastermind_guesses(round_id);
