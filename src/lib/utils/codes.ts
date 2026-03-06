/**
 * Generate a random 6-character alphanumeric code for room URLs.
 * Uses uppercase + digits, excluding ambiguous chars (0/O, 1/I).
 */
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateShortCode(): string {
  let code = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const values = new Uint8Array(6);
    crypto.getRandomValues(values);
    for (let i = 0; i < 6; i++) {
      code += CHARS[values[i]! % CHARS.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
  }
  return code;
}
