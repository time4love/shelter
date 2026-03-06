"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessageRow, PlayerRow } from "@/types/database";
import { Send, X } from "lucide-react";

export interface ChatOverlayProps {
  messages: ChatMessageRow[];
  sendMessage: (text: string) => Promise<{ error: string | null }>;
  sendError: string | null;
  myPlayerInRoom: PlayerRow;
  players: PlayerRow[];
  onClose: () => void;
}

/**
 * Semi-transparent chat overlay (glassmorphism) over the active screen.
 * Consumes global chat state (messages, sendMessage) from useRoomChat.
 */
export function ChatOverlay({
  messages,
  sendMessage,
  sendError,
  myPlayerInRoom,
  players,
  onClose,
}: ChatOverlayProps) {
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const playersMap = useRef<Map<string, { name: string; avatar: string }>>(new Map());
  playersMap.current = new Map(players.map((p) => [p.id, { name: p.name, avatar: p.avatar }]));

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || sending) return;
    setInputValue("");
    setSending(true);
    const { error } = await sendMessage(text);
    setSending(false);
    if (error) setInputValue(text);
  };

  const error = sendError;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-none"
      dir="rtl"
      lang="he"
      aria-label="צ'אט הקבוצה"
    >
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="w-full h-[70vh] bg-white/70 backdrop-blur-md border-t border-white/50 rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-foreground/10">
          <h2 id="chat-title" className="text-lg font-bold text-foreground">
            צ'אט הקבוצה
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/10 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-sky-blue"
            aria-label="סגור"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3"
        >
          {messages.length === 0 && !error && (
            <p className="text-center text-foreground/60 text-sm py-8">
              עדיין אין הודעות. תכתוב משהו!
            </p>
          )}
          {error && (
            <p className="text-center text-rose-600 text-sm py-2" role="alert">
              {error}
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.player_id === myPlayerInRoom.id;
            const author = playersMap.current.get(msg.player_id);
            const name = author?.name ?? "שחקן";
            const avatar = author?.avatar ?? "👤";
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-lg border border-white/50"
                  aria-hidden
                >
                  {avatar}
                </span>
                <div
                  className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}
                >
                  <span className="text-[10px] font-medium text-foreground/70 px-1">
                    {name}
                  </span>
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      isMe
                        ? "bg-sky-blue/90 text-white rounded-br-md"
                        : "bg-white/90 text-foreground border border-foreground/10 rounded-bl-md"
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/50 border-t border-foreground/10 flex gap-2 items-center"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="כתוב הודעה..."
            className="flex-1 min-w-0 rounded-2xl border border-foreground/20 bg-white/90 px-4 py-3 text-base text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-sky-blue focus:border-transparent"
            maxLength={500}
            aria-label="הודעה"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-blue text-white hover:bg-sky-blue/90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition focus:outline-none focus:ring-2 focus:ring-sky-blue focus:ring-offset-2"
            aria-label="שלח"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
