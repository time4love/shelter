import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type RoomInsert = Database["public"]["Tables"]["rooms"]["Insert"];
type RoomUpdate = Database["public"]["Tables"]["rooms"]["Update"];
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
type PlayerUpsert = PlayerInsert & Partial<Database["public"]["Tables"]["players"]["Update"]>;
type GameVoteInsert = Database["public"]["Tables"]["game_votes"]["Insert"];
type GameVoteUpsert = GameVoteInsert & Partial<Database["public"]["Tables"]["game_votes"]["Update"]>;

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
    currentGame: RoomUpdate["current_game"]
  ) =>
    client.from("rooms").update({ status, current_game: currentGame } as never).eq("id", roomId),
};

export const players = {
  upsert: (
    client: SupabaseClient<Database>,
    row: PlayerUpsert,
    options: { onConflict: string } = { onConflict: "room_id,client_id" }
  ) =>
    client.from("players").upsert(row as never, options as never),
};

export const gameVotes = {
  upsert: (
    client: SupabaseClient<Database>,
    row: GameVoteUpsert,
    options: { onConflict: string } = { onConflict: "room_id,player_id" }
  ) =>
    client.from("game_votes").upsert(row as never, options as never),
};
