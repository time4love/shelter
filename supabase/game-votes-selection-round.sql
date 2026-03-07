-- ============================================
-- Shelter: Game votes per selection round
-- Run in Supabase SQL Editor after game-votes exists
-- ============================================
-- Each "return to game selection" starts a new round; votes are scoped by selection_round_id
-- so votes from different rounds do not collide.

-- 1. Add selection_round_id (nullable for existing rows)
ALTER TABLE public.game_votes
  ADD COLUMN IF NOT EXISTS selection_round_id UUID NULL;

-- 2. Drop old unique constraint (one vote per room+player)
ALTER TABLE public.game_votes
  DROP CONSTRAINT IF EXISTS game_votes_room_id_player_id_key;

-- 3. One vote per (room, player) when selection_round_id is NULL (legacy)
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_votes_room_player_legacy
  ON public.game_votes(room_id, player_id)
  WHERE selection_round_id IS NULL;

-- 4. One vote per (room, player, selection_round_id) when round is set
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_votes_room_player_round
  ON public.game_votes(room_id, player_id, selection_round_id)
  WHERE selection_round_id IS NOT NULL;

-- 5. Index for fetching votes by room + round
CREATE INDEX IF NOT EXISTS idx_game_votes_selection_round
  ON public.game_votes(room_id, selection_round_id);
