-- ============================================
-- Shelter: Battleship (צוללות) - Multiplayer game
-- Tables: battleship_subs, battleship_shots; rooms.game_state
-- Run in Supabase SQL Editor after schema.sql and game-votes (with eretz_ir)
-- ============================================

-- 0. Allow 'battleship' in game_votes.game_id (if constraint exists)
ALTER TABLE public.game_votes
  DROP CONSTRAINT IF EXISTS game_votes_game_id_check;
ALTER TABLE public.game_votes
  ADD CONSTRAINT game_votes_game_id_check
  CHECK (game_id IN ('truth_or_lie', 'the_imposter', 'eretz_ir', 'battleship'));

-- 1. Battleship: secret submarine positions (2 cells per player)
CREATE TABLE IF NOT EXISTS public.battleship_subs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  cells INTEGER[] NOT NULL CHECK (array_length(cells, 1) = 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_battleship_subs_room_id ON public.battleship_subs(room_id);
CREATE INDEX IF NOT EXISTS idx_battleship_subs_player_id ON public.battleship_subs(player_id);

-- 2. Battleship: public shots (one row per shot)
CREATE TABLE IF NOT EXISTS public.battleship_shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  shooter_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  cell_index INTEGER NOT NULL CHECK (cell_index >= 0),
  result TEXT NOT NULL CHECK (result IN ('water', 'hit')),
  hit_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_battleship_shots_room_id ON public.battleship_shots(room_id);
CREATE INDEX IF NOT EXISTS idx_battleship_shots_shooter_id ON public.battleship_shots(shooter_id);

-- 3. RLS: allow anonymous read/write for both tables
ALTER TABLE public.battleship_subs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battleship_shots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_battleship_subs_all" ON public.battleship_subs;
CREATE POLICY "anon_battleship_subs_all"
  ON public.battleship_subs FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_battleship_shots_all" ON public.battleship_shots;
CREATE POLICY "anon_battleship_shots_all"
  ON public.battleship_shots FOR ALL TO anon USING (true) WITH CHECK (true);

-- 4. Realtime: REPLICA IDENTITY FULL and add to publication
ALTER TABLE public.battleship_subs REPLICA IDENTITY FULL;
ALTER TABLE public.battleship_shots REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.battleship_subs;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.battleship_shots;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
