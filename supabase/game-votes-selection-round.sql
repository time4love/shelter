-- ============================================
-- Shelter: Game votes per selection round
-- Run in Supabase SQL Editor after game_votes exists
-- ============================================
-- Each "return to game selection" starts a new round; votes are scoped by selection_round_id.
-- We need a single UNIQUE(room_id, player_id, selection_round_id) so ON CONFLICT works.

-- 1. Add selection_round_id (nullable first for backfill)
ALTER TABLE public.game_votes
  ADD COLUMN IF NOT EXISTS selection_round_id UUID NULL;

-- 2. Backfill: give existing rows a deterministic "legacy" round per room (so one per room)
UPDATE public.game_votes
SET selection_round_id = room_id
WHERE selection_round_id IS NULL;

-- 3. Now make it NOT NULL so we can have a simple unique constraint
ALTER TABLE public.game_votes
  ALTER COLUMN selection_round_id SET NOT NULL;

-- 4. Drop old unique constraint (one vote per room+player)
ALTER TABLE public.game_votes
  DROP CONSTRAINT IF EXISTS game_votes_room_id_player_id_key;

-- 5. Drop partial indexes if they exist (from a previous run of this migration)
DROP INDEX IF EXISTS public.idx_game_votes_room_player_legacy;
DROP INDEX IF EXISTS public.idx_game_votes_room_player_round;

-- 6. One vote per (room, player, selection_round_id) – required for upsert ON CONFLICT
ALTER TABLE public.game_votes
  ADD CONSTRAINT game_votes_room_player_selection_round_key
  UNIQUE (room_id, player_id, selection_round_id);

-- 7. Index for fetching votes by room + round
CREATE INDEX IF NOT EXISTS idx_game_votes_selection_round
  ON public.game_votes(room_id, selection_round_id);
