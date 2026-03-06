"use client";

import type { FloatingBubbleItem } from "@/hooks/useRoomChat";

export interface FloatingChatBubblesProps {
  bubbles: FloatingBubbleItem[];
}

/**
 * Renders floating soap-bubble style notifications when new chat messages
 * arrive while the chat overlay is closed. Positioned above the bottom nav.
 */
export function FloatingChatBubbles({ bubbles }: FloatingChatBubblesProps) {
  if (bubbles.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none"
      dir="rtl"
      lang="he"
      aria-live="polite"
      aria-label="הודעות צ'אט חדשות"
    >
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="animate-float-bubble max-w-[200px] bg-white/80 backdrop-blur-sm border border-white/40 shadow-lg rounded-2xl rounded-br-sm p-3 flex flex-col gap-1"
        >
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/90 text-sm border border-white/50"
              aria-hidden
            >
              {bubble.senderAvatar}
            </span>
            <span className="text-[10px] font-medium text-foreground/80 truncate">
              {bubble.senderName}
            </span>
          </div>
          <p className="text-sm text-foreground break-words text-right">
            {bubble.message.message}
          </p>
        </div>
      ))}
    </div>
  );
}
