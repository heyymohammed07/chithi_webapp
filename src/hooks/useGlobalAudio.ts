"use client";

import { useState, useEffect, useCallback } from "react";
import { AttachedSong, DEFAULT_RADIO_SONG } from "@/lib/music";

export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function getThumbnailUrl(song?: AttachedSong | null): string {
  if (!song) return "";
  if (song.thumbnail) return song.thumbnail;
  if (song.youtubeId) {
    return `https://i.ytimg.com/vi/${song.youtubeId}/hqdefault.jpg`;
  }
  return "";
}

interface GlobalAudioState {
  currentSong: AttachedSong | null;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isExpanded: boolean;
  isShuffle: boolean;
  currentTime: number;
  duration: number;
}

// ── Strict 10-Song FIFO Anti-Repeat History Buffer & Pre-Cache State ───────
let listeners: Array<() => void> = [];
const trackBuffer: AttachedSong[] = []; // Target 3 pre-cached ready tracks
const historyQueue: AttachedSong[] = [];
let recentPlayedIds: string[] = [DEFAULT_RADIO_SONG.youtubeId]; // Strict 10-track FIFO history
let isReplenishing = false;

const state: GlobalAudioState = {
  currentSong: DEFAULT_RADIO_SONG,
  isPlaying: true,
  isMuted: false,
  volume: 0.15,
  isExpanded: false,
  isShuffle: true,
  currentTime: 0,
  duration: 0,
};

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

// Preload thumbnail images in browser cache so transitions have 0ms visual pop
function preloadThumbnail(thumbnailUrl: string) {
  if (typeof window !== "undefined" && thumbnailUrl) {
    try {
      const img = new Image();
      img.src = thumbnailUrl;
    } catch {}
  }
}

// Background buffer replenishment (maintains 3 ready unplayed tracks)
async function replenishBuffer() {
  if (isReplenishing || trackBuffer.length >= 3) return;
  isReplenishing = true;

  try {
    while (trackBuffer.length < 3) {
      const excludeList = Array.from(
        new Set([
          ...recentPlayedIds,
          ...trackBuffer.map((t) => t.youtubeId),
          state.currentSong?.youtubeId || "",
        ])
      ).filter(Boolean);

      const excludeParam = encodeURIComponent(excludeList.slice(-10).join(","));
      const res = await fetch(`/api/music/random?exclude=${excludeParam}`);
      const json = await res.json();

      if (json.ok && json.data?.song) {
        const song: AttachedSong = json.data.song;
        const alreadyBuffered = trackBuffer.some((q) => q.youtubeId === song.youtubeId);
        const isCurrent = state.currentSong?.youtubeId === song.youtubeId;
        const isRecent = recentPlayedIds.includes(song.youtubeId);

        if (!alreadyBuffered && !isCurrent && !isRecent) {
          trackBuffer.push(song);
          preloadThumbnail(song.thumbnail);
        } else if (!alreadyBuffered && !isCurrent) {
          // If queue was running low and only recent was returned, add it
          trackBuffer.push(song);
          preloadThumbnail(song.thumbnail);
        } else {
          break;
        }
      } else {
        break;
      }
    }
  } catch (err) {
    console.warn("[replenishBuffer error]", err);
  } finally {
    isReplenishing = false;
  }
}

export function useGlobalAudio() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.push(listener);

    // Initial session storage hydration for strict 10-song history
    if (typeof window !== "undefined") {
      try {
        const storedHistory = sessionStorage.getItem("chithi:audio:recent_played");
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            recentPlayedIds = parsed.slice(-10);
          }
        }
      } catch {}

      // Load persisted mute & shuffle states
      const savedMute = localStorage.getItem("chithi:audio:muted");
      if (savedMute !== null) {
        state.isMuted = savedMute === "true";
      }
      const savedShuffle = localStorage.getItem("chithi:audio:shuffle");
      if (savedShuffle !== null) {
        state.isShuffle = savedShuffle === "true";
      }
    }

    // Bootstrap initial radio queue & pre-warm 3 tracks
    if (!state.currentSong) {
      state.currentSong = DEFAULT_RADIO_SONG;
      emitChange();
    }
    replenishBuffer();

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const playSong = useCallback((song: AttachedSong) => {
    if (state.currentSong && state.currentSong.youtubeId !== song.youtubeId) {
      historyQueue.push(state.currentSong);
      if (historyQueue.length > 10) historyQueue.shift();
    }
    state.currentSong = song;

    // Strict 10-track FIFO history update
    recentPlayedIds.push(song.youtubeId);
    if (recentPlayedIds.length > 10) recentPlayedIds.shift();

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("chithi:audio:recent_played", JSON.stringify(recentPlayedIds));
      } catch {}
    }

    state.isPlaying = true;
    state.currentTime = 0;
    emitChange();
    replenishBuffer();
  }, []);

  const updateLiveMetadata = useCallback((meta: { title?: string; artist?: string }) => {
    if (!state.currentSong) return;
    let changed = false;
    const cleanTitle = meta.title
      ?.replace(/\s*\(.*?\)\s*/g, " ")
      ?.replace(/\s*\[.*?\]\s*/g, " ")
      ?.replace(/\s*-\s*Topic/gi, "")
      ?.replace(/\s*Official\s*(Audio|Video|Lyrical Video|Track)\s*/gi, "")
      ?.trim();
    const cleanArtist = meta.artist?.replace(/\s*-\s*Topic/gi, "")?.trim();

    if (cleanTitle && cleanTitle !== state.currentSong.title) {
      state.currentSong = { ...state.currentSong, title: cleanTitle };
      changed = true;
    }
    if (cleanArtist && cleanArtist !== state.currentSong.artist) {
      state.currentSong = { ...state.currentSong, artist: cleanArtist };
      changed = true;
    }
    if (changed) {
      emitChange();
    }
  }, []);

  const togglePlay = useCallback(() => {
    state.isPlaying = !state.isPlaying;
    emitChange();
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    state.isPlaying = playing;
    emitChange();
  }, []);

  const toggleMute = useCallback(() => {
    state.isMuted = !state.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("chithi:audio:muted", String(state.isMuted));
    }
    emitChange();
  }, []);

  const toggleShuffle = useCallback(() => {
    state.isShuffle = !state.isShuffle;
    if (typeof window !== "undefined") {
      localStorage.setItem("chithi:audio:shuffle", String(state.isShuffle));
    }
    emitChange();
  }, []);

  const setVolume = useCallback((vol: number) => {
    state.volume = Math.max(0, Math.min(1, vol));
    emitChange();
  }, []);

  const toggleExpand = useCallback(() => {
    state.isExpanded = !state.isExpanded;
    emitChange();
  }, []);

  const setCurrentTime = useCallback((cur: number) => {
    state.currentTime = cur;
    emitChange();
  }, []);

  const setDuration = useCallback((dur: number) => {
    state.duration = dur;
    emitChange();
  }, []);

  // ── Instant Zero-Delay Advance (Next Track from Pre-Cache Buffer) ──────────
  const advanceNextTrack = useCallback(async (): Promise<string> => {
    if (state.currentSong) {
      historyQueue.push(state.currentSong);
      if (historyQueue.length > 10) historyQueue.shift();
    }

    // 1. Instant pop from pre-cache buffer (0ms latency, pre-cached image)
    if (trackBuffer.length > 0) {
      const nextSong = trackBuffer.shift()!;
      state.currentSong = nextSong;

      // Update strict 10-track FIFO history
      recentPlayedIds.push(nextSong.youtubeId);
      if (recentPlayedIds.length > 10) recentPlayedIds.shift();

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("chithi:audio:recent_played", JSON.stringify(recentPlayedIds));
        } catch {}
      }

      state.isPlaying = true;
      state.currentTime = 0;
      emitChange();

      // Refill pre-cache buffer in background (non-blocking)
      replenishBuffer();
      return nextSong.youtubeId;
    }

    // 2. On-demand fetch if buffer was empty
    try {
      const excludeParam = encodeURIComponent(recentPlayedIds.slice(-10).join(","));
      const res = await fetch(`/api/music/random?exclude=${excludeParam}`);
      const json = await res.json();
      if (json.ok && json.data?.song) {
        const song: AttachedSong = json.data.song;
        state.currentSong = song;

        recentPlayedIds.push(song.youtubeId);
        if (recentPlayedIds.length > 10) recentPlayedIds.shift();

        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("chithi:audio:recent_played", JSON.stringify(recentPlayedIds));
          } catch {}
        }

        state.isPlaying = true;
        state.currentTime = 0;
        emitChange();
        replenishBuffer();
        return song.youtubeId;
      }
    } catch (err) {
      console.error("[advanceNextTrack error]", err);
    }

    state.currentSong = DEFAULT_RADIO_SONG;
    state.isPlaying = true;
    emitChange();
    return DEFAULT_RADIO_SONG.youtubeId;
  }, []);

  // ── Instant Zero-Delay History (Previous Track) ────────────────────────────
  const advancePrevTrack = useCallback(async (): Promise<string> => {
    if (historyQueue.length > 0) {
      const prevSong = historyQueue.pop()!;
      state.currentSong = prevSong;
      state.isPlaying = true;
      state.currentTime = 0;
      emitChange();
      return prevSong.youtubeId;
    }

    return advanceNextTrack();
  }, [advanceNextTrack]);

  return {
    ...state,
    playSong,
    updateLiveMetadata,
    advanceNextTrack,
    advancePrevTrack,
    togglePlay,
    setIsPlaying,
    toggleMute,
    toggleShuffle,
    setVolume,
    toggleExpand,
    setCurrentTime,
    setDuration,
  };
}
