import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { GameStateTOL } from "@/types/database";

type RoomInsert = Database["public"]["Tables"]["rooms"]["Insert"];
type RoomUpdate = Database["public"]["Tables"]["rooms"]["Update"];
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
type PlayerUpsert = PlayerInsert & Partial<Database["public"]["Tables"]["players"]["Update"]>;
type GameVoteInsert = Database["public"]["Tables"]["game_votes"]["Insert"];
type GameVoteUpsert = GameVoteInsert & Partial<Database["public"]["Tables"]["game_votes"]["Update"]>;
type TolStatementInsert = Database["public"]["Tables"]["tol_statements"]["Insert"];
type TolGuessInsert = Database["public"]["Tables"]["tol_guesses"]["Insert"];

export type RoomInsertResult = { data: { id: string } | null; error: unknown };

/**
 * Typed Supabase mutations. Use these instead of (client as any) for better safety.
 * The Supabase JS client can infer poorly with custom Database types; these wrappers are explicit.
 */
export const rooms = {
  insert: async (
    client: SupabaseClient<Database>,
    row: RoomInsert
  ): Promise<RoomInsertResult> => {
    const result = await client.from("rooms").insert(row as never).select("id").single();
    return result as RoomInsertResult;
  },

  updateStatus: (client: SupabaseClient<Database>, roomId: string, status: RoomUpdate["status"]) =>
    client.from("rooms").update({ status } as never).eq("id", roomId),

  updateStatusAndGame: (
    client: SupabaseClient<Database>,
    roomId: string,
    status: RoomUpdate["status"],
    currentGame: RoomUpdate["current_game"],
    gameState?: GameStateTOL
  ) =>
    client
      .from("rooms")
      .update(
        gameState != null
          ? ({ status, current_game: currentGame, game_state: gameState } as never)
          : ({ status, current_game: currentGame } as never)
      )
      .eq("id", roomId),

  updateGameState: (
    client: SupabaseClient<Database>,
    roomId: string,
    gameState: GameStateTOL
  ) =>
    client.from("rooms").update({ game_state: gameState as never }).eq("id", roomId),

  /** Set room back to game selection: status, clear current_game and game_state */
  updateToGameSelection: (client: SupabaseClient<Database>, roomId: string) =>
    client
      .from("rooms")
      .update({ status: "game_selection", current_game: null, game_state: null } as never)
      .eq("id", roomId),
};

type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

export const players = {
  upsert: (
    client: SupabaseClient<Database>,
    row: PlayerUpsert,
    options: { onConflict: string } = { onConflict: "room_id,client_id" }
  ) =>
    client.from("players").upsert(row as never, options as never),

  /** Update a player by id (e.g. score). Use partial Update type to satisfy client inference. */
  update: (
    client: SupabaseClient<Database>,
    playerId: string,
    updates: PlayerUpdate
  ) =>
    client.from("players").update(updates as never).eq("id", playerId),
};

export const gameVotes = {
  upsert: async (
    client: SupabaseClient<Database>,
    row: GameVoteUpsert,
    options: { onConflict: string } = { onConflict: "room_id,player_id" }
  ) => {
    const result = await client
      .from("game_votes")
      .upsert(row as never, options as never)
      .select()
      .single();
    return result as { data: Database["public"]["Tables"]["game_votes"]["Row"] | null; error: unknown };
  },

  deleteByRoomId: (client: SupabaseClient<Database>, roomId: string) =>
    client.from("game_votes").delete().eq("room_id", roomId),
};

export const tolStatements = {
  insert: (
    client: SupabaseClient<Database>,
    row: TolStatementInsert
  ) =>
    client.from("tol_statements").upsert(row as never, { onConflict: "room_id,player_id" }),
};

export const tolGuesses = {
  insert: (
    client: SupabaseClient<Database>,
    row: TolGuessInsert
  ) =>
    client.from("tol_guesses").insert(row as never),
};
