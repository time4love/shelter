-- Allow clearing game_votes when returning to game selection (anon DELETE).
-- Run in Supabase SQL Editor if deleteByRoomId was failing.
DROP POLICY IF EXISTS "anon_game_votes_delete" ON public.game_votes;
CREATE POLICY "anon_game_votes_delete"
  ON public.game_votes FOR DELETE TO anon USING (true);
