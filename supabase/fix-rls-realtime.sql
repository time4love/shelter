-- ============================================
-- Shelter: Fix RLS + Realtime for anonymous lobby
-- Run this in Supabase SQL Editor after the main schema
-- ============================================

-- 1. Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Allow all for rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow all for players" ON public.players;

-- 2. RLS: Allow anonymous read + insert + update for game without registration
--    anon key is used by the app; these policies allow full access for anon

CREATE POLICY "anon_rooms_select"
  ON public.rooms FOR SELECT TO anon USING (true);

CREATE POLICY "anon_rooms_insert"
  ON public.rooms FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_rooms_update"
  ON public.rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_players_select"
  ON public.players FOR SELECT TO anon USING (true);

CREATE POLICY "anon_players_insert"
  ON public.players FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_players_update"
  ON public.players FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_players_delete"
  ON public.players FOR DELETE TO anon USING (true);

-- 3. Realtime: tables must have REPLICA IDENTITY FULL so UPDATE/DELETE send full row
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- 4. Add tables to Realtime publication (no-op if already added; error 42710 = already member)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
EXCEPTION
  WHEN SQLSTATE '42710' THEN NULL;
END $$;
