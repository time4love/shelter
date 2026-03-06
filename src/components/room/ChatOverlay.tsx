"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessageRow, PlayerRow } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { Send, X } from "lucide-react";

export interface ChatOverlayProps {
  roomId: string;
  myPlayerInRoom: PlayerRow;
  players: PlayerRow[];
  supabase: SupabaseClient<Database>;
  onClose: () => void;
}

/**
 * Semi-transparent chat overlay (glassmorphism) over the active screen.
 * Fetches messages on mount, subscribes to Realtime INSERT, supports sending.
 */
export function ChatOverlay({
  roomId,
  myPlayerInRoom,
  players,
  supabase,
  onClose,
}: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const playersMap = useRef<Map<string, { name: string; avatar: string }>>(new Map());
  playersMap.current = new Map(players.map((p) => [p.id, { name: p.name, avatar: p.avatar }]));

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch existing messages on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchMessages() {
      const { data, error: fetchErr } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (fetchErr) {
        setError("אופס, משהו השתבש. נסה שוב!");
        return;
      }
      setMessages((data ?? []) as ChatMessageRow[]);
    }
    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [roomId, supabase]);

  // Realtime: subscribe to INSERT on chat_messages for this room
  useEffect(() => {
    const channel = supabase
      .channel(`chat_messages_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          if (row?.room_id === roomId) {
            setMessages((prev) => [...prev, row]);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || sending) return;
    setInputValue(""); // Clear immediately for snappy UX
    setSending(true);
    setError(null);
    const { error: insertErr } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      player_id: myPlayerInRoom.id,
      message: text,
    });
    setSending(false);
    if (insertErr) {
      setError("אופס, משהו השתבש. נסה שוב!");
      setInputValue(text); // Restore on failure
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-none"
      dir="rtl"
      lang="he"
      aria-label="צ'אט הקבוצה"
    >
      {/* Backdrop: allow closing by click, but don't capture pointer for the overlay */}
      <div
        className="absolute inset-0 bg-black/20 pointer-events-auto"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="w-full h-[70vh] bg-white/70 backdrop-blur-md border-t border-white/50 rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto transition-transform duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

        {/* Message list */}
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

        {/* Input area */}
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
