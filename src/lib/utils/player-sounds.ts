import type { PlayerSoundEntry, PlayerSoundsMap } from "@/types/database";

/** Legacy format from DB/persist: value can be URL string. New format: { url, name }. */
export type RawPlayerSounds = Record<string, string | PlayerSoundEntry>;

const DEFAULT_NAMES: Record<string, string> = {
  "1": "הקלטה 1",
  "2": "הקלטה 2",
  "3": "הקלטה 3",
};

/**
 * Normalizes player sounds to the new object format.
 * If a value is a string (legacy URL), converts to { url: value, name: "הקלטה N" }.
 */
export function normalizePlayerSounds(raw: RawPlayerSounds | null | undefined): PlayerSoundsMap {
  if (!raw || typeof raw !== "object") return {};
  const out: PlayerSoundsMap = {};
  for (const [slot, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim()) {
      out[slot] = { url: value, name: DEFAULT_NAMES[slot] ?? `הקלטה ${slot}` };
    } else if (value && typeof value === "object" && "url" in value && typeof (value as PlayerSoundEntry).url === "string") {
      const entry = value as PlayerSoundEntry;
      const name = typeof entry.name === "string" && entry.name.trim() ? entry.name : (DEFAULT_NAMES[slot] ?? `הקלטה ${slot}`);
      out[slot] = { url: entry.url, name };
    }
  }
  return out;
}

/** Default display name for a slot (e.g. "הקלטה 1"). */
export function getDefaultSoundName(slot: string): string {
  return DEFAULT_NAMES[slot] ?? `הקלטה ${slot}`;
}
