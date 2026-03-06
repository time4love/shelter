"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { usePlayerStore, AVATAR_OPTIONS, type AvatarOption } from "@/store/player-store";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Copy, Users } from "lucide-react";

type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

/**
 * Room page: Join flow (name + avatar) or Lobby with real-time players.
 * Listens to room status and players via Supabase Realtime.
 */
export default function RoomPage() {
  const params = useParams();
  const shortCode = params.short_code as string;
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    playerId,
    playerName,
    playerAvatar,
    roomId,
    setPlayerName,
    setPlayerAvatar,
    setRoomId,
    joinRoom,
    hasJoinedProfile,
  } = usePlayerStore();

  const supabase = createBrowserClient();
  const isHost = room?.host_id === playerId;

  // Resolve room by short_code and subscribe to room + players
  useEffect(() => {
    if (!shortCode) return;
    const client = createBrowserClient();
    let roomSubscription: { unsubscribe: () => void } | null = null;
    let playersSubscription: { unsubscribe: () => void } | null = null;

    async function init() {
      setLoading(true);
      setError(null);
      const { data: roomData, error: roomErr } = await client
        .from("rooms")
        .select("*")
        .eq("short_code", shortCode.toUpperCase())
        .maybeSingle();

      if (roomErr) {
        setError("שגיאה בטעינת החדר");
        setLoading(false);
        return;
      }
      const roomRow = roomData as RoomRow | null;
      if (!roomRow) {
        setError("החדר לא נמצא");
        setLoading(false);
        return;
      }

      setRoom(roomRow);
      setRoomId(roomRow.id);

      const { data: playersData, error: playersErr } = await client
        .from("players")
        .select("*")
        .eq("room_id", roomRow.id)
        .order("created_at", { ascending: true });

      if (!playersErr) setPlayers((playersData as PlayerRow[] | null) ?? []);

      roomSubscription = client
        .channel(`room:${roomRow.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomRow.id}` },
          (payload) => {
            if (payload.new) setRoom(payload.new as RoomRow);
          }
        )
        .subscribe();

      playersSubscription = client
        .channel(`players:${roomRow.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomRow.id}` },
          () => {
            client
              .from("players")
              .select("*")
              .eq("room_id", roomRow.id)
              .order("created_at", { ascending: true })
              .then(({ data }) => setPlayers((data as PlayerRow[] | null) ?? []));
          }
        )
        .subscribe();

      setLoading(false);
    }

    init();
    return () => {
      roomSubscription?.unsubscribe();
      playersSubscription?.unsubscribe();
      setRoomId(null);
    };
  }, [shortCode, setRoomId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-soft-pink/20 to-sky-blue/20 flex items-center justify-center p-6">
        <p className="text-xl text-foreground/80">טוען...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-soft-pink/20 to-sky-blue/20 flex items-center justify-center p-6">
        <p className="text-xl text-soft-pink font-medium">{error ?? "החדר לא נמצא"}</p>
      </div>
    );
  }

  // Not yet joined: show Join modal/view
  if (!hasJoinedProfile()) {
    return (
      <JoinView
        shortCode={shortCode}
        roomId={room.id}
        playerId={playerId}
        playerName={playerName}
        playerAvatar={playerAvatar}
        setPlayerName={setPlayerName}
        setPlayerAvatar={setPlayerAvatar}
        onJoin={joinRoom}
        isHost={isHost}
        supabase={supabase}
      />
    );
  }

  // Status changed to game_selection
  if (room.status === "game_selection") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-soft-pink/20 to-sky-blue/20 flex items-center justify-center p-6">
        <p className="text-2xl font-bold text-foreground">עוברים לבחירת משחק...</p>
      </div>
    );
  }

  // Lobby view
  return (
    <LobbyView
      shortCode={shortCode}
      room={room}
      players={players}
      isHost={isHost}
      supabase={supabase}
    />
  );
}

/** Join flow: name input + avatar grid + Join button */
function JoinView({
  shortCode,
  roomId,
  playerId,
  playerName,
  playerAvatar,
  setPlayerName,
  setPlayerAvatar,
  onJoin,
  isHost,
  supabase,
}: {
  shortCode: string;
  roomId: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  setPlayerName: (n: string) => void;
  setPlayerAvatar: (a: AvatarOption | string) => void;
  onJoin: (roomId: string, name?: string, avatar?: string) => void;
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}) {
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleJoin() {
    const name = playerName?.trim();
    if (!name) {
      setJoinError("כתוב את השם שלך");
      return;
    }
    if (!playerAvatar) {
      setJoinError("בחר אווטר");
      return;
    }
    const id = playerId || crypto.randomUUID();
    if (!playerId) usePlayerStore.setState({ playerId: id });
    setJoinError(null);
    setJoining(true);
    try {
      const { error } = await (supabase as any)
        .from("players")
        .upsert(
          {
            room_id: roomId,
            client_id: id,
            name,
            avatar: playerAvatar,
            is_host: isHost,
          },
          { onConflict: "room_id,client_id" }
        );
      if (error) throw error;
      onJoin(roomId, name, playerAvatar);
    } catch {
      setJoinError("שגיאה בהצטרפות לחדר");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-pink/30 via-background to-sky-blue/20 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/90 shadow-card p-8 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-foreground text-center">היכנס לחדר</h2>
        <p className="text-foreground/70 text-center">חדר: {shortCode}</p>

        <label className="flex flex-col gap-2">
          <span className="font-medium text-foreground">השם שלך</span>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="כתוב כאן"
            className="rounded-2xl border-2 border-foreground/10 bg-background px-4 py-3 text-lg focus:border-sky-blue focus:outline-none"
            dir="rtl"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="font-medium text-foreground">בחר אווטר</span>
          <div className="grid grid-cols-3 gap-3">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setPlayerAvatar(emoji)}
                className={`aspect-square rounded-2xl text-4xl flex items-center justify-center transition shadow-soft ${
                  playerAvatar === emoji
                    ? "ring-4 ring-playful-yellow bg-playful-yellow/30"
                    : "bg-background hover:bg-soft-pink/20"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {joinError && (
          <p className="text-soft-pink font-medium text-center text-sm">{joinError}</p>
        )}

        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-4 rounded-2xl bg-mint-green text-white font-bold text-lg shadow-soft hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
        >
          {joining ? "נכנס..." : "היכנס לחדר"}
        </button>
      </div>
    </div>
  );
}

/** Lobby: players grid, copy link, host start button */
function LobbyView({
  shortCode,
  room,
  players,
  isHost,
  supabase,
}: {
  shortCode: string;
  room: RoomRow;
  players: PlayerRow[];
  isHost: boolean;
  supabase: SupabaseClient<Database>;
}) {
  const [copyDone, setCopyDone] = useState(false);
  const [starting, setStarting] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${shortCode}`
      : "";

  function handleCopyInvite() {
    if (typeof navigator === "undefined" || !inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }

  async function handleStart() {
    setStarting(true);
    await (supabase as any)
      .from("rooms")
      .update({ status: "game_selection" })
      .eq("id", room.id);
    setStarting(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-pink/20 via-background to-sky-blue/20 flex flex-col p-6">
      <h1 className="text-3xl font-bold text-foreground text-center mt-4 mb-2">
        מחכים לחברים...
      </h1>
      <p className="text-foreground/70 text-center mb-6">חדר: {shortCode}</p>

      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={handleCopyInvite}
          className="flex items-center gap-2 py-3 px-6 rounded-2xl bg-sky-blue/90 text-white font-medium shadow-soft"
        >
          <Copy className="w-5 h-5" />
          {copyDone ? "הועתק!" : "העתק קישור להזמנה"}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-foreground/70" />
          <span className="font-medium text-foreground">{players.length} משתתפים</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-md">
          {players.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl bg-white/90 shadow-soft p-4 flex flex-col items-center gap-2"
            >
              <span className="text-4xl">{p.avatar}</span>
              <span className="font-bold text-foreground">{p.name}</span>
              {p.is_host && (
                <span className="text-xs text-foreground/60">מארח/ת</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {isHost && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleStart}
            disabled={starting}
            className="w-full max-w-xs py-4 rounded-2xl bg-playful-yellow text-foreground font-bold text-xl shadow-card hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
          >
            {starting ? "מעביר..." : "כולנו כאן אפשר להתחיל"}
          </button>
        </div>
      )}
    </div>
  );
}
