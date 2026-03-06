-- ============================================
-- Shelter: Battleship (צוללות) - Full classic multiplayer
-- Tables: battleship_boards (10x10, 5 ships), battleship_shots (per-target)
-- Run in Supabase SQL Editor after schema.sql and game-votes (with eretz_ir)
-- ============================================

-- 0. Allow 'battleship' in rooms.current_game and game_votes.game_id
ALTER TABLE public.rooms
  DROP CONSTRAINT IF EXISTS rooms_current_game_check;
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_current_game_check
  CHECK (current_game IS NULL OR current_game IN ('truth_or_lie', 'the_imposter', 'eretz_ir', 'battleship'));

ALTER TABLE public.game_votes
  DROP CONSTRAINT IF EXISTS game_votes_game_id_check;
ALTER TABLE public.game_votes
  ADD CONSTRAINT game_votes_game_id_check
  CHECK (game_id IN ('truth_or_lie', 'the_imposter', 'eretz_ir', 'battleship'));

-- 1. Drop old tables (removed from publication automatically)
DROP TABLE IF EXISTS public.battleship_subs;
DROP TABLE IF EXISTS public.battleship_shots;

-- 2. Battleship boards: one per player, ships as JSONB
--    ships: Array of { id: string, size: number, cells: number[] } (cell indices 0-99)
CREATE TABLE public.battleship_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  ships JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

CREATE INDEX idx_battleship_boards_room_id ON public.battleship_boards(room_id);
CREATE INDEX idx_battleship_boards_player_id ON public.battleship_boards(player_id);

-- 3. Battleship shots: one row per shot, per target
CREATE TABLE public.battleship_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  shooter_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  cell_index INTEGER NOT NULL CHECK (cell_index >= 0 AND cell_index <= 99),
  is_hit BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_battleship_shots_room_id ON public.battleship_shots(room_id);
CREATE INDEX idx_battleship_shots_target_id ON public.battleship_shots(target_id);
CREATE INDEX idx_battleship_shots_shooter_id ON public.battleship_shots(shooter_id);

-- 4. RLS: allow anonymous ALL for both tables
ALTER TABLE public.battleship_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battleship_shots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_battleship_boards_all" ON public.battleship_boards;
CREATE POLICY "anon_battleship_boards_all"
  ON public.battleship_boards FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_battleship_shots_all" ON public.battleship_shots;
CREATE POLICY "anon_battleship_shots_all"
  ON public.battleship_shots FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Realtime: REPLICA IDENTITY FULL and add to publication
ALTER TABLE public.battleship_boards REPLICA IDENTITY FULL;
ALTER TABLE public.battleship_shots REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.battleship_boards;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.battleship_shots;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
