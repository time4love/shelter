import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Browser Supabase client for Client Components (singleton).
 * Use in components that need auth, realtime, or mutations.
 */
export function createBrowserClient(): SupabaseClient<Database> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local."
    );
  }
  if (typeof window === "undefined") {
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}
