/**
 * App-wide constants. Keeps magic numbers and strings in one place.
 */

/** Default display name for the room host (auto-joined, no form). */
export const HOST_DEFAULT_NAME = "מארח";

/** Default avatar emoji for the room host. */
export const HOST_DEFAULT_AVATAR = "🦁";

/** How often to refetch the players list in the lobby (ms). Fallback when Realtime is slow. */
export const LOBBY_POLL_INTERVAL_MS = 2500;
