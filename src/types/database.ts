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

export type GameId = "truth_or_lie" | "the_imposter" | "eretz_ir" | "battleship" | "mastermind";

/** Truth or Lie: one statement entry in the statements array */
export type TolStatementItem = { text: string; isTruth: boolean };

/** Room.game_state for Truth or Lie (and future games) */
export type GameStateTOL =
  | { phase: "writing" }
  | {
      phase: "playing";
      currentAuthorId: string;
      authorsLeft: string[];
    }
  | {
      phase: "revealing_answers";
      currentAuthorId: string;
      authorsLeft: string[];
    }
  | { phase: "round_results" };

/** Room.game_state for Eretz Ir (ארץ עיר) */
export type GameStateEretzIr =
  | { phase: "rolling"; roundId?: string }
  | { phase: "writing"; letter: string; roundId?: string }
  | { phase: "revealing"; currentCategoryIndex: number; roundId?: string }
  | { phase: "round_results"; roundId?: string };

/** Eretz Ir: answers object - keys are category names, values are typed words */
export type EretzIrAnswersMap = Record<string, string>;

/** Battleship: one ship entry in boards.ships */
export type BattleshipShip = { id: string; size: number; cells: number[] };

/** Room.game_state for Battleship (צוללות) */
export type GameStateBattleship =
  | { phase: "hiding"; roundId?: string }
  | {
      phase: "playing";
      currentTurnId: string;
      targetQueue: string[];
      currentTargetId: string;
      alivePlayers: string[];
      roundId?: string;
    }
  | { phase: "round_results"; winnerId?: string | null; roundId?: string };

/** Mastermind (בול פגיעה): code color names stored as strings in JSONB */
export type MastermindColorName = "red" | "blue" | "green" | "yellow" | "orange" | "purple";

/** Room.game_state for Mastermind */
export type GameStateMastermind =
  | { phase: "setting"; setterId: string; roundId?: string }
  | {
      phase: "playing";
      setterId: string;
      currentTurnId: string;
      guessersQueue: string[];
      roundId?: string;
    }
  | { phase: "round_results"; setterId: string; winnerId?: string | null; roundId?: string };

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
          game_state: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          short_code: string;
          host_id: string;
          status?: RoomStatus;
          current_game?: string | null;
          game_state?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          short_code?: string;
          host_id?: string;
          status?: RoomStatus;
          current_game?: string | null;
          game_state?: Json | null;
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
          round_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          player_id: string;
          game_id: GameId;
          round_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          player_id?: string;
          game_id?: GameId;
          round_id?: string | null;
          created_at?: string;
        };
      };
      tol_statements: {
        Row: {
          id: string;
          room_id: string;
          player_id: string;
          statements: TolStatementItem[];
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          player_id: string;
          statements: TolStatementItem[];
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          player_id?: string;
          statements?: TolStatementItem[];
          created_at?: string;
        };
      };
      tol_guesses: {
        Row: {
          id: string;
          room_id: string;
          author_id: string;
          guesser_id: string;
          guessed_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          author_id: string;
          guesser_id: string;
          guessed_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          author_id?: string;
          guesser_id?: string;
          guessed_index?: number;
          created_at?: string;
        };
      };
      eretz_ir_answers: {
        Row: {
          id: string;
          room_id: string;
          player_id: string;
          round_id: string | null;
          answers: EretzIrAnswersMap;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          player_id: string;
          round_id?: string | null;
          answers?: EretzIrAnswersMap;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          player_id?: string;
          round_id?: string | null;
          answers?: EretzIrAnswersMap;
          created_at?: string;
        };
      };
      battleship_boards: {
        Row: {
          id: string;
          room_id: string;
          player_id: string;
          round_id: string | null;
          ships: BattleshipShip[];
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          player_id: string;
          round_id?: string | null;
          ships?: BattleshipShip[];
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          player_id?: string;
          round_id?: string | null;
          ships?: BattleshipShip[];
          created_at?: string;
        };
      };
      battleship_shots: {
        Row: {
          id: string;
          room_id: string;
          shooter_id: string;
          target_id: string;
          round_id: string | null;
          cell_index: number;
          is_hit: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          shooter_id: string;
          target_id: string;
          round_id?: string | null;
          cell_index: number;
          is_hit: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          shooter_id?: string;
          target_id?: string;
          round_id?: string | null;
          cell_index?: number;
          is_hit?: boolean;
          created_at?: string;
        };
      };
      mastermind_codes: {
        Row: {
          id: string;
          room_id: string;
          setter_id: string;
          round_id: string | null;
          code: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          setter_id: string;
          round_id?: string | null;
          code: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          setter_id?: string;
          round_id?: string | null;
          code?: string[];
          created_at?: string;
        };
      };
      mastermind_guesses: {
        Row: {
          id: string;
          room_id: string;
          guesser_id: string;
          round_id: string | null;
          guess: string[];
          bulls: number;
          hits: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          guesser_id: string;
          round_id?: string | null;
          guess: string[];
          bulls: number;
          hits: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          guesser_id?: string;
          round_id?: string | null;
          guess?: string[];
          bulls?: number;
          hits?: number;
          created_at?: string;
        };
      };
    };
  };
}

export type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];
export type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
export type GameVoteRow = Database["public"]["Tables"]["game_votes"]["Row"];
export type TolStatementRow = Database["public"]["Tables"]["tol_statements"]["Row"];
export type TolGuessRow = Database["public"]["Tables"]["tol_guesses"]["Row"];
export type EretzIrAnswerRow = Database["public"]["Tables"]["eretz_ir_answers"]["Row"];
export type BattleshipBoardRow = Database["public"]["Tables"]["battleship_boards"]["Row"];
export type BattleshipShotRow = Database["public"]["Tables"]["battleship_shots"]["Row"];
export type MastermindCodeRow = Database["public"]["Tables"]["mastermind_codes"]["Row"];
export type MastermindGuessRow = Database["public"]["Tables"]["mastermind_guesses"]["Row"];
