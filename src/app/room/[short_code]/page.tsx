"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { usePlayerStore } from "@/store/player-store";
import { useEnsurePlayerId } from "@/hooks/useEnsurePlayerId";
import { useRoomAndJoinStatus } from "@/hooks/useRoomAndJoinStatus";
import { useLobbyPlayers } from "@/hooks/useLobbyPlayers";
import { AudioUnlockBanner, GameEngine, GameSelectionView, GlobalLeaderboard, GlobalSoundboard, JoinModal, LobbyView, RoomNotFoundView } from "@/components/room";
import { useRoomAudio } from "@/hooks/useRoomAudio";

/**
 * Room page – strict flow:
 * 1. Ensure local playerId in store.
 * 2. Fetch room by short_code; if not found → RoomNotFoundView + link to Home.
 * 3. If no player record for this room in DB, or missing name/avatar in store → JoinModal.
 * 4. On JoinModal submit: update store, INSERT/upsert player, then refetch → show Lobby.
 * 5. Lobby: fetch players, Realtime sync, grid + copy link + (host) start button.
 */
export default function RoomPage() {
  const params = useParams();
  const shortCode = (params?.short_code as string) ?? "";

  useEnsurePlayerId();
  const playerId = usePlayerStore((s) => s.playerId || "");
  const playerName = usePlayerStore((s) => s.playerName);
  const playerAvatar = usePlayerStore((s) => s.playerAvatar);
  const setPlayerName = usePlayerStore((s) => s.setPlayerName);
  const setPlayerAvatar = usePlayerStore((s) => s.setPlayerAvatar);
  const setRoomId = usePlayerStore((s) => s.setRoomId);

  const { room, roomError, loading, myPlayerInRoom, refetchMyPlayer } =
    useRoomAndJoinStatus(shortCode, playerId);

  const inLobby =
    Boolean(room) &&
    Boolean(myPlayerInRoom) &&
    Boolean(playerName?.trim()) &&
    Boolean(playerAvatar);
  const inRoomView =
    inLobby ||
    Boolean(room?.status === "game_selection" && myPlayerInRoom) ||
    Boolean(room?.status === "playing" && myPlayerInRoom);
  const players = useLobbyPlayers(room?.id ?? null, inRoomView);

  const supabase = createBrowserClient();
  const isHost = Boolean(room && playerId && room.host_id === playerId);
  const { broadcastSound, playSound } = useRoomAudio(room?.id ?? null);

  useEffect(() => {
    if (room) setRoomId(room.id);
    return () => setRoomId(null);
  }, [room, setRoomId]);

  if (loading || !playerId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-soft-pink/20 to-sky-blue/20 flex items-center justify-center p-6">
        <p className="text-xl text-foreground/80">טוען...</p>
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <RoomNotFoundView message={roomError ?? "החדר לא קיים או נסגר"} />
    );
  }

  const mustShowJoinModal =
    !myPlayerInRoom || !playerName?.trim() || !playerAvatar;

  if (mustShowJoinModal) {
    return (
      <JoinModal
        room={room}
        shortCode={shortCode}
        localPlayerId={playerId}
        playerName={playerName}
        playerAvatar={playerAvatar}
        setPlayerName={setPlayerName}
        setPlayerAvatar={setPlayerAvatar}
        onJoined={refetchMyPlayer}
        supabase={supabase}
      />
    );
  }

  if (room.status === "game_selection" && myPlayerInRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col pb-24 bg-gray-50">
        <AudioUnlockBanner />
        <GameSelectionView
          room={room}
          players={players}
          isHost={isHost}
          myPlayerInRoom={myPlayerInRoom}
          supabase={supabase}
        />
        <GlobalLeaderboard players={players} />
        <GlobalSoundboard
          myPlayerInRoom={myPlayerInRoom}
          supabase={supabase}
          broadcastSound={broadcastSound}
          playSound={playSound}
          refetchMyPlayer={refetchMyPlayer}
        />
      </div>
    );
  }

  if (room.status === "playing" && myPlayerInRoom) {
    return (
      <div className="min-h-screen w-full flex flex-col pb-24 bg-gray-50">
        <AudioUnlockBanner />
        <GameEngine
          room={room}
          players={players}
          myPlayerInRoom={myPlayerInRoom}
          isHost={isHost}
          supabase={supabase}
        />
        <GlobalLeaderboard players={players} />
        <GlobalSoundboard
          myPlayerInRoom={myPlayerInRoom}
          supabase={supabase}
          broadcastSound={broadcastSound}
          playSound={playSound}
          refetchMyPlayer={refetchMyPlayer}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col pb-24 bg-gray-50">
      <AudioUnlockBanner />
      <LobbyView
        shortCode={shortCode}
        room={room}
        players={players}
        isHost={isHost}
        supabase={supabase}
      />
      <GlobalLeaderboard players={players} />
      <GlobalSoundboard
        myPlayerInRoom={myPlayerInRoom}
        supabase={supabase}
        broadcastSound={broadcastSound}
        playSound={playSound}
        refetchMyPlayer={refetchMyPlayer}
      />
    </div>
  );
}
