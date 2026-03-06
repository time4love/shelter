"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export interface RoomNotFoundViewProps {
  message: string;
}

/**
 * Shown when the room does not exist or is closed. Offers a button to go back to Home.
 */
export function RoomNotFoundView({ message }: RoomNotFoundViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-soft-pink/20 to-sky-blue/20 flex flex-col items-center justify-center p-6 gap-6">
      <p className="text-xl text-foreground/90 text-center font-medium">{message}</p>
      <Link
        href="/"
        className="flex items-center gap-2 py-3 px-6 rounded-2xl bg-playful-yellow text-foreground font-bold shadow-soft hover:opacity-95"
      >
        <Home className="w-5 h-5" />
        חזרה לדף הבית
      </Link>
    </div>
  );
}
