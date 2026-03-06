import { create } from "zustand";

export interface AudioUnlockState {
  /** True when the browser blocked autoplay (NotAllowedError); show unlock CTA. */
  audioBlocked: boolean;
  setAudioBlocked: (blocked: boolean) => void;
}

export const useAudioUnlockStore = create<AudioUnlockState>((set) => ({
  audioBlocked: false,
  setAudioBlocked: (blocked) => set({ audioBlocked: blocked }),
}));
