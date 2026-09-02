"use client";
/* eslint-disable @next/next/no-img-element, react-hooks/exhaustive-deps */

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useGlobalAudio, formatTime } from "@/hooks/useGlobalAudio";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Music,
  Disc,
  Shuffle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Global typing for YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

function getThumbSrc(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

function cleanMeta(str: string): string {
  return str
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*\[.*?\]\s*/g, " ")
    .replace(/\s*-\s*Topic/gi, "")
    .replace(/\s*Official\s*(Audio|Video|Lyrical Video|Track)\s*/gi, "")
    .replace(/\|\s*Audio\s*\|.*/i, "")
    .replace(/\|\s*Lyrics\s*\|.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function AppleMusicPlayer() {
  const {
    currentSong,
    isPlaying,
    isMuted,
    volume,
    isExpanded,
    isShuffle,
    currentTime,
    duration,
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
  } = useGlobalAudio();

  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  const [thumbError, setThumbError] = useState(false);

  // Reset thumbnail error when song changes
  useEffect(() => {
    setThumbError(false);
  }, [currentSong?.youtubeId]);

  // ─── Imperative video playback ─────────────────────────────────────────────
  const imperativePlay = useCallback((videoId: string) => {
    if (!isPlayerReadyRef.current || !playerRef.current) return;
    try {
      playerRef.current.unMute?.();
      playerRef.current.setVolume?.(Math.round(volumeRef.current * 100) || 15);
      playerRef.current.loadVideoById({ videoId, startSeconds: 0 });
      playerRef.current.playVideo?.();
    } catch (err) {
      console.warn("[imperativePlay error]", err);
    }
  }, []);

  // ─── Instant Zero-Delay Navigation (Next / Prev) ───────────────────────────
  const handleNext = useCallback(async () => {
    const nextVideoId = await advanceNextTrack();
    if (nextVideoId) {
      imperativePlay(nextVideoId);
    }
  }, [advanceNextTrack, imperativePlay]);

  const handlePrev = useCallback(async () => {
    const prevVideoId = await advancePrevTrack();
    if (prevVideoId) {
      imperativePlay(prevVideoId);
    }
  }, [advancePrevTrack, imperativePlay]);

  // ─── YouTube IFrame API bootstrap ──────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initPlayer = () => {
      if (!window.YT || typeof window.YT.Player !== "function") return;
      if (playerRef.current) return;

      const mountEl = document.getElementById("yt-audio-player-mount");
      if (!mountEl) return;

      try {
        const activeSongId = currentSongRef.current?.youtubeId;
        playerRef.current = new window.YT.Player("yt-audio-player-mount", {
          height: "200",
          width: "200",
          videoId: activeSongId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: typeof window !== "undefined" ? window.location.origin : undefined,
          },
          events: {
            onReady: (event: any) => {
              isPlayerReadyRef.current = true;
              if (typeof window !== "undefined") {
                (window as any).__CHITHI_YT_PLAYER__ = event.target;
              }
              try {
                // Strictly lock to 15% volume
                event.target.unMute();
                event.target.setVolume(15);

                const targetSongId = currentSongRef.current?.youtubeId;
                const loadedId = event.target.getVideoData?.()?.video_id;
                if (targetSongId && loadedId !== targetSongId) {
                  event.target.loadVideoById({ videoId: targetSongId, startSeconds: 0 });
                } else if (targetSongId) {
                  event.target.playVideo();
                }

                const dur = event.target.getDuration?.();
                if (dur) setDuration(dur);
              } catch (err) {
                console.warn("[YouTube onReady error]", err);
              }
            },
            onStateChange: (event: any) => {
              // YT.PlayerState: ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3, CUED=5
              if (event.data === 1) {
                setIsPlaying(true);
                const dur = event.target.getDuration?.();
                if (dur) setDuration(dur);

                // Real-time metadata sync directly from YouTube stream
                try {
                  const videoData = event.target.getVideoData?.();
                  if (videoData) {
                    const actualId = videoData.video_id;
                    const expectedId = currentSongRef.current?.youtubeId;
                    
                    // Anti-desync: if YouTube wandered to a random recommendation, force reload
                    if (actualId && expectedId && actualId !== expectedId) {
                      event.target.loadVideoById({ videoId: expectedId, startSeconds: 0 });
                    } else if (videoData.title) {
                      const liveTitle = cleanMeta(videoData.title);
                      const liveArtist = cleanMeta(videoData.author || "");
                      if (liveTitle) {
                        updateLiveMetadata({
                          title: liveTitle,
                          artist: liveArtist || undefined,
                        });
                      }
                    }
                  }
                } catch {}

              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Track ended — advance to next pre-fetched track instantly
                handleNext();
              }
            },
            onError: (event: any) => {
              console.warn("[YouTube Player error code:", event.data, "]");
              setIsPlaying(false);
              setTimeout(() => {
                handleNext();
              }, 1200);
            },
          },
        });
      } catch (err) {
        console.warn("[YouTube Player init error]", err);
      }
    };

    let checkInterval: any = null;

    if (window.YT && typeof window.YT.Player === "function") {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };

      if (!document.getElementById("yt-iframe-api-script")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }

      checkInterval = setInterval(() => {
        if (window.YT && typeof window.YT.Player === "function" && !playerRef.current) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 250);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // ─── Song-change effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentSong?.youtubeId) return;
    if (!isPlayerReadyRef.current || !playerRef.current) return;
    try {
      const loadedId = playerRef.current.getVideoData?.()?.video_id;
      if (loadedId === currentSong.youtubeId) return;
      playerRef.current.unMute?.();
      playerRef.current.setVolume?.(Math.round(volumeRef.current * 100) || 15);
      playerRef.current.loadVideoById({ videoId: currentSong.youtubeId, startSeconds: 0 });
      playerRef.current.playVideo?.();
    } catch (err) {
      console.warn("[YouTube song-change load error]", err);
    }
  }, [currentSong?.youtubeId]);

  // ─── Play/pause sync ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlayerReadyRef.current || !playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.unMute?.();
        playerRef.current.playVideo?.();
      } else {
        playerRef.current.pauseVideo?.();
      }
    } catch (err) {
      console.warn("[YouTube sync play state error]", err);
    }
  }, [isPlaying]);

  // ─── Volume / mute sync ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlayerReadyRef.current || !playerRef.current) return;
    try {
      const targetVol = volume > 0 ? Math.round(volume * 100) : 15;
      playerRef.current.setVolume?.(targetVol);
      if (isMuted) {
        playerRef.current.mute?.();
      } else {
        playerRef.current.unMute?.();
      }
    } catch {}
  }, [isMuted, volume]);

  // ─── Playback progress polling ──────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (isPlayerReadyRef.current && playerRef.current) {
        try {
          const cur = playerRef.current.getCurrentTime?.() || 0;
          const dur = playerRef.current.getDuration?.() || 0;
          setCurrentTime(cur);
          if (dur && dur !== duration) setDuration(dur);
        } catch {}
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, duration, setCurrentTime, setDuration]);

  // ─── First user interaction unlock & autoplay fallback ─────────────────────
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (isPlayerReadyRef.current && playerRef.current) {
        try {
          playerRef.current.unMute?.();
          playerRef.current.setVolume?.(Math.round(volumeRef.current * 100) || 15);
          const targetSongId = currentSongRef.current?.youtubeId;
          const loadedId = playerRef.current.getVideoData?.()?.video_id;
          if (targetSongId && loadedId !== targetSongId) {
            playerRef.current.loadVideoById({ videoId: targetSongId, startSeconds: 0 });
          } else {
            playerRef.current.playVideo?.();
          }
          setIsPlaying(true);
        } catch {}
      }
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  // ─── Play/Pause button handler ──────────────────────────────────────────────
  const handleTogglePlay = () => {
    const nextPlaying = !isPlaying;
    isPlayingRef.current = nextPlaying;

    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        if (nextPlaying) {
          playerRef.current.unMute?.();
          playerRef.current.setVolume?.(volume > 0 ? Math.round(volume * 100) : 15);
          const targetSongId = currentSong?.youtubeId;
          const loadedId = playerRef.current.getVideoData?.()?.video_id;
          if (targetSongId && loadedId !== targetSongId) {
            playerRef.current.loadVideoById({ videoId: targetSongId, startSeconds: 0 });
          } else {
            playerRef.current.playVideo?.();
          }
        } else {
          playerRef.current.pauseVideo?.();
        }
      } catch (err) {
        console.warn("[Play toggle error]", err);
      }
    }
    togglePlay();
  };

  // ─── Seek handler ───────────────────────────────────────────────────────────
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (isPlayerReadyRef.current && playerRef.current) {
      try {
        playerRef.current.seekTo?.(seekTime, true);
      } catch {}
    }
  };

  if (!currentSong) return null;

  const thumbSrc = getThumbSrc(currentSong.youtubeId);
  const showThumb = !thumbError;

  const handleThumbError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const src = e.currentTarget.src;
    if (src.includes("hqdefault")) {
      e.currentTarget.src = `https://i.ytimg.com/vi/${currentSong.youtubeId}/mqdefault.jpg`;
    } else {
      setThumbError(true);
    }
  };

  return (
    <>
      {/* YouTube Audio Engine Mount - tiny in-viewport div prevents Chromium background throttling */}
      <div
        className="fixed bottom-4 right-4 w-[200px] h-[200px] pointer-events-none opacity-[0.01] select-none overflow-hidden -z-10"
        aria-hidden="true"
      >
        <div id="yt-audio-player-mount" />
      </div>

      {/* Floating Audio Player Container with Spring Physics */}
      <div className="fixed bottom-24 sm:bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
        {/* Mini Player Bar */}
        <AnimatePresence mode="wait">
          {!isExpanded && (
            <motion.div
              key="mini-player"
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ type: "spring", damping: 26, stiffness: 300, mass: 0.8 }}
              className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 pl-2.5 rounded-full bg-[#FFF8F0]/95 dark:bg-[#170A24]/95 backdrop-blur-md border border-[#F0E2D2] dark:border-[#351D4D] shadow-[0_12px_32px_-8px_rgba(70,48,32,0.12)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] hover:shadow-lg transition-shadow"
            >
              {/* Spinning Vinyl / Album Thumbnail (1:1 Spotify-style cropped with smooth crossfade) */}
              <button
                type="button"
                onClick={toggleExpand}
                aria-label="Expand Music Player"
                className="relative w-10 h-10 rounded-full overflow-hidden border border-[#F0E2D2] dark:border-[#351D4D] shadow-sm shrink-0 group cursor-pointer bg-[#FFE5B4]/50 dark:bg-[#2B143D] flex items-center justify-center"
              >
                <AnimatePresence mode="wait">
                  {showThumb ? (
                    <motion.img
                      key={currentSong.youtubeId}
                      src={thumbSrc}
                      alt={currentSong.title}
                      onError={handleThumbError}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`w-full h-full object-cover scale-[1.75] ${
                        isPlaying ? "animate-spin [animation-duration:8s]" : ""
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#FFE5B4] dark:bg-[#2B143D] flex items-center justify-center text-[#E88B60]">
                      <Disc size={20} className={isPlaying ? "animate-spin [animation-duration:8s]" : ""} />
                    </div>
                  )}
                </AnimatePresence>
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
              </button>

              {/* Title & Artist & Mini Progress with Smooth Crossfade */}
              <div className="text-left min-w-0 max-w-[110px] sm:max-w-[160px]">
                <button
                  type="button"
                  onClick={toggleExpand}
                  className="w-full text-left cursor-pointer select-none group"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSong.youtubeId}
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="text-xs font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] truncate group-hover:text-[#E88B60] transition-colors">
                        {currentSong.title}
                      </div>
                      <div className="text-[10px] text-[#857367] dark:text-[#A592A4] truncate">
                        {currentSong.artist}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </button>

                {/* Mini Time Display */}
                <div className="text-[9px] font-mono text-[#857367] dark:text-[#A592A4] tracking-tight">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Mini Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="w-8 h-8 rounded-full bg-[#E88B60] hover:bg-[#D67448] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause size={13} fill="currentColor" />
                  ) : (
                    <Play size={13} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next Song"
                  className="w-7 h-7 rounded-full hover:bg-[#FFE5B4]/50 dark:hover:bg-[#2B143D] text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <SkipForward size={14} />
                </button>

                <button
                  type="button"
                  onClick={toggleExpand}
                  aria-label="Expand Player"
                  className="w-7 h-7 rounded-full hover:bg-[#FFE5B4]/50 dark:hover:bg-[#2B143D] text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronUp size={15} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded Sheet Card with Native Apple Music Style Slide & Spring Physics */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              key="expanded-player"
              initial={{ y: 80, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", damping: 28, stiffness: 280, mass: 0.8 }}
              className="w-[300px] sm:w-[330px] p-5 rounded-3xl bg-[#FFF8F0]/95 dark:bg-[#170A24]/95 backdrop-blur-xl border border-[#F0E2D2] dark:border-[#351D4D] shadow-[0_20px_48px_-12px_rgba(70,48,32,0.18)] dark:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6)] space-y-4 relative overflow-hidden"
            >
              {/* Dynamic Blurred Ambient Artwork Glow with Fluid Crossfade */}
              {showThumb && (
                <div className="absolute -top-12 -left-12 -right-12 h-44 opacity-25 filter blur-3xl pointer-events-none -z-10">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentSong.youtubeId}
                      src={thumbSrc}
                      alt=""
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="w-full h-full object-cover"
                    />
                  </AnimatePresence>
                </div>
              )}

              {/* Top Header Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#857367] dark:text-[#A592A4]">
                  <Music size={13} className="text-[#E88B60]" />
                  <span>Chithi Jukebox</span>
                </div>
                <button
                  type="button"
                  onClick={toggleExpand}
                  aria-label="Collapse Player"
                  className="w-7 h-7 rounded-full hover:bg-[#FFE5B4]/50 dark:hover:bg-[#2B143D] text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronDown size={18} />
                </button>
              </div>

              {/* Center Artwork: 1:1 Spotify-style Square with 16:9 Black Bars Cropped Out & Smooth Crossfade */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-black/40 flex items-center justify-center border border-[#F0E2D2] dark:border-[#351D4D]">
                <AnimatePresence mode="wait">
                  {showThumb ? (
                    <motion.div
                      key={currentSong.youtubeId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                      className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden"
                    >
                      {/* Ambient Blurred Glow Backdrop */}
                      <img
                        src={thumbSrc}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50 scale-125 pointer-events-none"
                      />
                      {/* Cropped Square Album Art (scale-[1.75] cuts off left/right black bars) */}
                      <img
                        src={thumbSrc}
                        alt={currentSong.title}
                        onError={handleThumbError}
                        className="relative z-10 w-full h-full object-cover scale-[1.75] transition-transform duration-500"
                      />
                    </motion.div>
                  ) : (
                    <div className="w-full h-full bg-[#FFE5B4] dark:bg-[#2B143D] flex items-center justify-center text-[#E88B60]">
                      <Disc size={64} className={isPlaying ? "animate-spin [animation-duration:10s]" : ""} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Song Information with Smooth Crossfade */}
              <div className="text-center space-y-0.5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSong.youtubeId}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h4 className="text-base font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] truncate">
                      {currentSong.title}
                    </h4>
                    <p className="text-xs text-[#857367] dark:text-[#A592A4] truncate">
                      {currentSong.artist}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Interactive Seekbar Scrubber */}
              <div className="space-y-1 pt-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={handleSeek}
                  aria-label="Seek track"
                  className="w-full h-1.5 bg-[#F0E2D2] dark:bg-[#351D4D] rounded-lg appearance-none cursor-pointer accent-[#E88B60]"
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-[#857367] dark:text-[#A592A4]">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls Row */}
              <div className="flex items-center justify-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  aria-label={isShuffle ? "Shuffle Enabled" : "Shuffle Disabled"}
                  title={isShuffle ? "Shuffle: On" : "Shuffle: Off"}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isShuffle
                      ? "bg-[#FFE5B4] text-[#E88B60] dark:bg-[#351D4D] dark:text-[#FCD34D] shadow-sm scale-105"
                      : "text-[#857367] dark:text-[#A592A4] hover:bg-[#FFE5B4]/50 dark:hover:bg-[#2B143D]"
                  }`}
                >
                  <Shuffle size={15} />
                </button>

                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous Track"
                  className="w-9 h-9 rounded-full hover:bg-[#FFE5B4]/50 dark:hover:bg-[#2B143D] text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <SkipBack size={18} />
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="w-12 h-12 rounded-full bg-[#E88B60] hover:bg-[#D67448] text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next Track"
                  className="w-9 h-9 rounded-full hover:bg-[#FFE5B4]/50 dark:hover:bg-[#2B143D] text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <SkipForward size={18} />
                </button>
              </div>

              {/* Volume Slider (Strictly 15% default) */}
              <div className="flex items-center gap-3 pt-1 px-2 border-t border-[#F0E2D2]/60 dark:border-[#351D4D]/60">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                  className="text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0] transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  aria-label="Volume slider"
                  className="w-full h-1.5 bg-[#F0E2D2] dark:bg-[#351D4D] rounded-lg appearance-none cursor-pointer accent-[#E88B60]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
