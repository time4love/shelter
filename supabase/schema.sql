-- ============================================
-- Shelter: Party Game - Phase 1 Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Rooms table: one room per game session
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT NOT NULL UNIQUE CHECK (char_length(short_code) = 6),
  host_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'game_selection', 'playing', 'results')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Players table: players in each room
-- client_id = local device UUID from Zustand (for reconnection/upsert)
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  is_host BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, client_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rooms_short_code ON public.rooms(short_code);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON public.players(room_id);

-- Enable Row Level Security (RLS) - allow all for Phase 1; tighten in production
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Policy: allow read/write for authenticated and anon (for mobile kids app)
CREATE POLICY "Allow all for rooms" ON public.rooms
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for players" ON public.players
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for both tables (run these; if they fail, enable via
-- Supabase Dashboard: Database > Replication > supabase_realtime > add tables)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;

-- Optional: function to generate a random 6-char code (alphanumeric, easy to type)
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no ambiguous 0/O, 1/I
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
