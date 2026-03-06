"use client";

import { Megaphone, MessageCircle, Trophy } from "lucide-react";

export interface BottomNavBarProps {
  /** Current player display name */
  playerName: string;
  /** Current player avatar emoji */
  playerAvatar: string;
  /** Opens the Soundboard modal */
  onOpenSoundboard: () => void;
  /** Opens the Leaderboard modal */
  onOpenLeaderboard: () => void;
  /** Opens the Profile Edit modal */
  onOpenProfile: () => void;
  /** Opens the Chat overlay */
  onOpenChat?: () => void;
}

/**
 * Fixed bottom navigation bar with Soundboard, Player Profile (center), and Leaderboard.
 * RTL-friendly; safe area padding for notched devices.
 */
export function BottomNavBar({
  playerName,
  playerAvatar,
  onOpenSoundboard,
  onOpenLeaderboard,
  onOpenProfile,
  onOpenChat,
}: BottomNavBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-t border-foreground/10 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      dir="rtl"
      lang="he"
      aria-label="ניווט תחתון"
    >
      <div className="flex justify-around items-center h-16 px-2">
        {/* Right (RTL first): Soundboard */}
        <button
          type="button"
          onClick={onOpenSoundboard}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-14 rounded-2xl text-mint-green hover:bg-mint-green/15 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-offset-2"
          aria-label="לוח צלילים"
        >
          <Megaphone className="h-7 w-7" strokeWidth={2} />
          <span className="text-[10px] font-medium text-foreground/70">צלילים</span>
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

        {/* Left (RTL last): Trophy + Chat */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-14 rounded-2xl text-playful-yellow hover:bg-playful-yellow/15 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-playful-yellow focus:ring-offset-2"
            aria-label="טבלת ליגה"
          >
            <Trophy className="h-7 w-7" strokeWidth={2} />
            <span className="text-[10px] font-medium text-foreground/70">ליגה</span>
          </button>
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] h-14 rounded-2xl text-sky-blue hover:bg-sky-blue/15 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-sky-blue focus:ring-offset-2"
              aria-label="צ'אט הקבוצה"
            >
              <MessageCircle className="h-7 w-7" strokeWidth={2} />
              <span className="text-[10px] font-medium text-foreground/70">צ'אט</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
