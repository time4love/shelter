"use client";

import { MessageCircle, Trophy } from "lucide-react";

export interface BottomNavBarProps {
  /** Current player display name */
  playerName: string;
  /** Current player avatar emoji */
  playerAvatar: string;
  /** Opens the Leaderboard modal */
  onOpenLeaderboard: () => void;
  /** Opens the Profile Edit modal */
  onOpenProfile: () => void;
  /** Opens the Chat overlay */
  onOpenChat?: () => void;
  /** When true, show unread indicator (red dot) on Chat button */
  chatHasUnread?: boolean;
}

/**
 * Fixed bottom navigation: Trophy (left), Player Avatar/Profile (center, large), Chat (right).
 * RTL-friendly; safe area padding for notched devices.
 */
export function BottomNavBar({
  playerName,
  playerAvatar,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenChat,
  chatHasUnread = false,
}: BottomNavBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-foreground/10 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      dir="rtl"
      lang="he"
      aria-label="ניווט תחתון"
    >
      <div className="flex justify-around items-center h-16 px-2">
        {/* Right (RTL first): Trophy */}
        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-14 rounded-2xl text-playful-yellow hover:bg-playful-yellow/15 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-playful-yellow focus:ring-offset-2"
          aria-label="טבלת ליגה"
        >
          <Trophy className="h-7 w-7" strokeWidth={2} />
          <span className="text-[10px] font-medium text-foreground/70">ליגה</span>
        </button>

        {/* Center: Player profile (avatar + name) */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex flex-col items-center justify-end min-w-[80px] -mt-6 focus:outline-none focus:ring-2 focus:ring-playful-yellow focus:ring-offset-2 rounded-full"
          aria-label="ערוך פרופיל"
        >
          <span
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white border-2 border-playful-yellow/50 text-3xl shadow-card"
            aria-hidden
          >
            {playerAvatar || "👤"}
          </span>
          <span className="text-[10px] font-medium text-foreground/80 truncate max-w-[72px] mt-1">
            {playerName || "אני"}
          </span>
        </button>

        {/* Left (RTL last): Chat */}
        {onOpenChat && (
          <button
            type="button"
            onClick={onOpenChat}
            className="relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-14 rounded-2xl text-sky-blue hover:bg-sky-blue/15 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-sky-blue focus:ring-offset-2"
            aria-label={chatHasUnread ? "צ'אט הקבוצה (הודעות חדשות)" : "צ'אט הקבוצה"}
          >
            {chatHasUnread && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white" />
              </span>
            )}
            <MessageCircle className="h-7 w-7" strokeWidth={2} />
            <span className="text-[10px] font-medium text-foreground/70">צ'אט</span>
          </button>
        )}
      </div>
    </nav>
  );
}
