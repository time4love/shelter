"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ChatMessageRow, Database, PlayerRow } from "@/types/database";

export interface FloatingBubbleItem {
  id: string;
  message: ChatMessageRow;
  senderName: string;
  senderAvatar: string;
}

export interface UseRoomChatResult {
  messages: ChatMessageRow[];
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  hasUnread: boolean;
  floatingBubbles: FloatingBubbleItem[];
  sendMessage: (text: string) => Promise<{ error: string | null }>;
  error: string | null;
}

const BUBBLE_DURATION_MS = 4000;

/**
 * Global room chat: messages, unread indicator, floating soap bubbles.
 * Listens to chat_messages Realtime even when chat overlay is closed.
 */
export function useRoomChat(
  roomId: string | null,
  myPlayerId: string,
  players: PlayerRow[]
): UseRoomChatResult {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [isChatOpen, setIsChatOpenState] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [floatingBubbles, setFloatingBubbles] = useState<FloatingBubbleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const playersMapRef = useRef<Map<string, { name: string; avatar: string }>>(new Map());
  playersMapRef.current = new Map(
    players.map((p) => [p.id, { name: p.name, avatar: p.avatar }])
  );

  const isChatOpenRef = useRef(isChatOpen);
  isChatOpenRef.current = isChatOpen;

  const setIsChatOpen = useCallback((open: boolean) => {
    setIsChatOpenState(open);
    if (open) setHasUnread(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!roomId || !myPlayerId) return;
    const id = roomId as string;
    let cancelled = false;
    const supabase = createBrowserClient();
    async function fetchMessages() {
      const { data, error: fetchErr } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", id)
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
  }, [roomId, myPlayerId]);

  // Realtime: listen globally so we get new messages even when chat is closed
  useEffect(() => {
    if (!roomId) return;
    const supabase = createBrowserClient();
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
          if (!row || row.room_id !== roomId) return;

          setMessages((prev) => [...prev, row]);

          const chatClosed = !isChatOpenRef.current;
          const isFromOther = row.player_id !== myPlayerId;
          if (chatClosed && isFromOther) {
            setHasUnread(true);
            const author = playersMapRef.current.get(row.player_id);
            const bubbleId = `bubble-${row.id}-${Date.now()}`;
            const item: FloatingBubbleItem = {
              id: bubbleId,
              message: row,
              senderName: author?.name ?? "שחקן",
              senderAvatar: author?.avatar ?? "👤",
            };
            setFloatingBubbles((prev) => [...prev, item]);
            setTimeout(() => {
              setFloatingBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
            }, BUBBLE_DURATION_MS);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, myPlayerId]);

  const sendMessage = useCallback(
    async (text: string): Promise<{ error: string | null }> => {
      if (!roomId || !myPlayerId || !text.trim()) return { error: null };
      const supabase = createBrowserClient();
      const insertRow: Database["public"]["Tables"]["chat_messages"]["Insert"] = {
        room_id: roomId,
        player_id: myPlayerId,
        message: text.trim(),
      };
      const { error: insertErr } = await supabase.from("chat_messages").insert(insertRow as never);
      if (insertErr) {
        setError("אופס, משהו השתבש. נסה שוב!");
        return { error: "אופס, משהו השתבש. נסה שוב!" };
      }
      return { error: null };
    },
    [roomId, myPlayerId]
  );

  return {
    messages,
    isChatOpen,
    setIsChatOpen,
    hasUnread,
    floatingBubbles,
    sendMessage,
    error,
  };
}
