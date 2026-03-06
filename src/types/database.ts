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

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          short_code: string;
          host_id: string;
          status: RoomStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          short_code: string;
          host_id: string;
          status?: RoomStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          short_code?: string;
          host_id?: string;
          status?: RoomStatus;
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
    };
  };
}
