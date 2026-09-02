"use client";

import { useState, useEffect, useCallback } from "react";
import { AttachedSong, CURATED_SONGS } from "@/lib/music";

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

// Global state in module scope for cross-component sync
let listeners: Array<() => void> = [];

// Pick initial random index immediately so state.currentSong is never null
const initialRandomIndex =
  CURATED_SONGS.length > 0 ? Math.floor(Math.random() * CURATED_SONGS.length) : 0;
let playedIndices: number[] = [initialRandomIndex];

const state: GlobalAudioState = {
  currentSong: CURATED_SONGS[initialRandomIndex] || null,
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

export function useGlobalAudio() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.push(listener);

    // If for any reason state.currentSong was null, ensure a random pick
    if (!state.currentSong && CURATED_SONGS.length > 0) {
      const randomIdx = Math.floor(Math.random() * CURATED_SONGS.length);
      state.currentSong = CURATED_SONGS[randomIdx] || CURATED_SONGS[0] || null;
      playedIndices = [randomIdx];
      emitChange();
    }

    // Load persisted mute & shuffle states
    if (typeof window !== "undefined") {
      const savedMute = localStorage.getItem("chithi:audio:muted");
      if (savedMute !== null) {
        state.isMuted = savedMute === "true";
      }
      const savedShuffle = localStorage.getItem("chithi:audio:shuffle");
      if (savedShuffle !== null) {
        state.isShuffle = savedShuffle === "true";
      }
    }

    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const playSong = useCallback((song: AttachedSong) => {
    state.currentSong = song;
    const idx = CURATED_SONGS.findIndex((s) => s.youtubeId === song.youtubeId);
    if (idx !== -1 && !playedIndices.includes(idx)) {
      playedIndices.push(idx);
    }
    state.isPlaying = true;
    state.currentTime = 0;
    emitChange();
  }, []);

  const updateLiveMetadata = useCallback((meta: { title?: string; artist?: string }) => {
    if (!state.currentSong) return;
    let changed = false;
    const cleanTitle = meta.title?.replace(/\s*\(.*?\)\s*/g, " ")?.replace(/\s*-\s*Topic/gi, "")?.trim();
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

  const nextSong = useCallback(() => {
    if (CURATED_SONGS.length === 0) return;

    if (state.isShuffle) {
      if (playedIndices.length >= CURATED_SONGS.length) {
        const currentIdx = CURATED_SONGS.findIndex(
          (s) => s.youtubeId === state.currentSong?.youtubeId
        );
        playedIndices = currentIdx !== -1 ? [currentIdx] : [];
      }

      const unplayed = CURATED_SONGS.map((_, idx) => idx).filter(
        (idx) => !playedIndices.includes(idx)
      );

      const randomUnplayed =
        unplayed.length > 0
          ? unplayed[Math.floor(Math.random() * unplayed.length)]
          : undefined;
      const fallbackIdx =
        (CURATED_SONGS.findIndex(
          (s) => s.youtubeId === state.currentSong?.youtubeId
        ) + 1) % CURATED_SONGS.length;
      const chosenIdx: number =
        typeof randomUnplayed === "number"
          ? randomUnplayed
          : fallbackIdx >= 0
          ? fallbackIdx
          : 0;

      playedIndices.push(chosenIdx);
      state.currentSong = CURATED_SONGS[chosenIdx] || CURATED_SONGS[0] || null;
    } else {
      const currentIndex = CURATED_SONGS.findIndex(
        (s) => s.youtubeId === state.currentSong?.youtubeId
      );
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % CURATED_SONGS.length;
      state.currentSong = CURATED_SONGS[nextIndex] || CURATED_SONGS[0] || null;
    }

    state.isPlaying = true;
    state.currentTime = 0;
    emitChange();
  }, []);

  const nextSongId = useCallback((): string | null => {
    if (CURATED_SONGS.length === 0) return null;

    let chosenSong: (typeof CURATED_SONGS)[number] | null = null;

    if (state.isShuffle) {
      if (playedIndices.length >= CURATED_SONGS.length) {
        const currentIdx = CURATED_SONGS.findIndex(
          (s) => s.youtubeId === state.currentSong?.youtubeId
        );
        playedIndices = currentIdx !== -1 ? [currentIdx] : [];
      }
      const unplayed = CURATED_SONGS.map((_, idx) => idx).filter(
        (idx) => !playedIndices.includes(idx)
      );
      const randomUnplayed =
        unplayed.length > 0
          ? unplayed[Math.floor(Math.random() * unplayed.length)]
          : undefined;
      const fallbackIdx =
        (CURATED_SONGS.findIndex(
          (s) => s.youtubeId === state.currentSong?.youtubeId
        ) + 1) % CURATED_SONGS.length;
      const chosenIdx: number =
        typeof randomUnplayed === "number"
          ? randomUnplayed
          : fallbackIdx >= 0
          ? fallbackIdx
          : 0;
      playedIndices.push(chosenIdx);
      chosenSong = CURATED_SONGS[chosenIdx] || CURATED_SONGS[0] || null;
    } else {
      const currentIndex = CURATED_SONGS.findIndex(
        (s) => s.youtubeId === state.currentSong?.youtubeId
      );
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % CURATED_SONGS.length;
      chosenSong = CURATED_SONGS[nextIndex] || CURATED_SONGS[0] || null;
    }

    state.currentSong = chosenSong;
    state.isPlaying = true;
    state.currentTime = 0;
    emitChange();
    return chosenSong?.youtubeId ?? null;
  }, []);

  const prevSong = useCallback(() => {
    if (CURATED_SONGS.length === 0) return;
    const currentIndex = CURATED_SONGS.findIndex(
      (s) => s.youtubeId === state.currentSong?.youtubeId
    );
    const prevIndex =
      currentIndex === -1
        ? 0
        : (currentIndex - 1 + CURATED_SONGS.length) % CURATED_SONGS.length;
    state.currentSong = CURATED_SONGS[prevIndex] || CURATED_SONGS[0] || null;
    state.isPlaying = true;
    state.currentTime = 0;
    emitChange();
  }, []);

  const prevSongId = useCallback((): string | null => {
    if (CURATED_SONGS.length === 0) return null;
    const currentIndex = CURATED_SONGS.findIndex(
      (s) => s.youtubeId === state.currentSong?.youtubeId
    );
    const prevIndex =
      currentIndex === -1
        ? 0
        : (currentIndex - 1 + CURATED_SONGS.length) % CURATED_SONGS.length;
    const chosenSong = CURATED_SONGS[prevIndex] || CURATED_SONGS[0] || null;
    state.currentSong = chosenSong;
    state.isPlaying = true;
    state.currentTime = 0;
    emitChange();
    return chosenSong?.youtubeId ?? null;
  }, []);

  return {
    ...state,
    playSong,
    updateLiveMetadata,
    togglePlay,
    setIsPlaying,
    toggleMute,
    toggleShuffle,
    setVolume,
    toggleExpand,
    setCurrentTime,
    setDuration,
    nextSong,
    nextSongId,
    prevSong,
    prevSongId,
  };
}
