"use client";

import { useCallback, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { Mic, Loader2 } from "lucide-react";
import { players as playersMutations } from "@/lib/supabase/typed-mutations";
import { usePlayerStore } from "@/store/player-store";
import { getDefaultSoundName } from "@/lib/utils/player-sounds";
import type { PlayerSoundsMap } from "@/types/database";

const MAX_RECORDING_MS = 5000;

export interface VoiceRecorderProps {
  slot: 1 | 2 | 3;
  playerId: string;
  playerDbId: string;
  currentSounds: PlayerSoundsMap | null;
  supabase: SupabaseClient<Database>;
  onUploaded: () => void;
}

/**
 * Records a short voice clip (max 5s), uploads to audio_clips, and updates the player's sounds in DB.
 */
export function VoiceRecorder({
  slot,
  playerId,
  playerDbId,
  currentSounds,
  supabase,
  onUploaded,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      mr.stop();
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) {
          setError("ההקלטה ריקה. נסה שוב.");
          return;
        }
        setUploading(true);
        setError(null);
        const fileName = `${playerId}_slot${slot}.webm`;

        const { error: uploadError } = await supabase.storage
          .from("audio_clips")
          .upload(fileName, blob, { upsert: true });

        if (uploadError) {
          setError("אופס, העלאה נכשלה. נסה שוב!");
          setUploading(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("audio_clips").getPublicUrl(fileName);

        const nextSounds: PlayerSoundsMap = {
          ...(currentSounds || {}),
          [String(slot)]: { url: publicUrl, name: getDefaultSoundName(String(slot)) },
        };
        const { error: updateError } = await playersMutations.update(supabase, playerDbId, {
          sounds: nextSounds,
        });

        if (updateError) {
          setError("אופס, שמירה נכשלה. נסה שוב!");
        } else {
          usePlayerStore.getState().setPlayerSounds(nextSounds);
          onUploaded();
        }
        setUploading(false);
      };

      mr.start();
      setRecording(true);

      const timer = setTimeout(stopRecording, MAX_RECORDING_MS);
      return () => clearTimeout(timer);
    } catch (e) {
      setError("לא ניתן לגשת למיקרופון. בדוק הרשאות.");
      setRecording(false);
    }
  }, [slot, playerId, playerDbId, currentSounds, supabase, onUploaded, stopRecording]);

  const handleTap = useCallback(() => {
    if (uploading) return;
    if (recording) stopRecording();
    else startRecording();
  }, [recording, uploading, startRecording, stopRecording]);

  return (
    <div className="flex flex-col items-center gap-2" dir="rtl" lang="he">
      <button
        type="button"
        onClick={handleTap}
        disabled={uploading}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-soft-pink/80 text-white shadow-card transition hover:opacity-95 active:scale-95 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-mint-green focus:ring-offset-2"
        aria-label={recording ? "עצור הקלטה" : "הקלט צליל"}
      >
        {uploading ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <Mic
            className={`h-7 w-7 ${recording ? "text-red-600 animate-pulse" : ""}`}
            strokeWidth={2}
          />
        )}
      </button>
      <span className="text-sm text-foreground/80">
        {recording ? "מקליט... (עד 5 שניות)" : uploading ? "שומר..." : "הקלט צליל"}
      </span>
      {error && (
        <p className="text-sm text-red-600 max-w-[200px] text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
