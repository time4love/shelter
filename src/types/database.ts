/**
 * Supabase database types for rooms and players.
 * Regenerate from Supabase CLI if schema changes: npx supabase gen types typescript
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoomStatus = "lobby" | "game_selection" | "playing" | "results";

export type GameId = "truth_or_lie" | "the_imposter";

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          short_code: string;
          host_id: string;
          status: RoomStatus;
          current_game: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          short_code: string;
          host_id: string;
          status?: RoomStatus;
          current_game?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          short_code?: string;
          host_id?: string;
          status?: RoomStatus;
          current_game?: string | null;
          created_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          room_id: string;
          client_id: string;
          name: string;
          avatar: string;
          score: number;
          is_host: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          client_id: string;
          name: string;
          avatar: string;
          score?: number;
          is_host?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          client_id?: string;
          name?: string;
          avatar?: string;
          score?: number;
          is_host?: boolean;
          created_at?: string;
        };
      };
      game_votes: {
        Row: {
          id: string;
          room_id: string;
          player_id: string;
          game_id: GameId;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          player_id: string;
          game_id: GameId;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          player_id?: string;
          game_id?: GameId;
          created_at?: string;
        };
      };
    };
  };
}

export type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
export type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
export type GameVoteRow = Database["public"]["Tables"]["game_votes"]["Row"];
