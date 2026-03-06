"use client";

import { useAudioUnlockStore } from "@/store/audio-unlock-store";
import { unlockAudioContext } from "@/hooks/useRoomAudio";

/**
 * When the browser blocks autoplay (NotAllowedError), show a prominent CTA at the top.
 * Tapping it plays a silent clip to unlock the audio context and hides the banner.
 */
export function AudioUnlockBanner() {
  const audioBlocked = useAudioUnlockStore((s) => s.audioBlocked);

  if (!audioBlocked) return null;

  return (
    <button
      type="button"
      onClick={unlockAudioContext}
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-playful-yellow px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-base font-bold text-white shadow-card focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-offset-2"
      dir="rtl"
      lang="he"
      aria-label="לחץ כאן כדי לאפשר צלילים מחברים"
    >
      <span className="text-xl" aria-hidden>
        🔊
      </span>
      <span>לחץ כאן כדי לאפשר צלילים מחברים!</span>
    </button>
  );
}
