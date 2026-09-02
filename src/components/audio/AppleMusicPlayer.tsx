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

// Reliable thumbnail helper: prefer hqdefault (always present)
function getThumbSrc(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

function cleanMeta(str: string): string {
  return str
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*\[.*?\]\s*/g, " ")
    .replace(/\s*-\s*Topic/gi, "")
    .replace(/\s*Official\s*(Audio|Video|Lyrical Video|Track)\s*/gi, "")
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
    togglePlay,
    setIsPlaying,
    toggleMute,
    toggleShuffle,
    setVolume,
    toggleExpand,
    setCurrentTime,
    setDuration,
    nextSongId,
    prevSongId,
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

  // ─── Core imperative player command ────────────────────────────────────────
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
                // Start strictly at 15% volume (§3)
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

                // Live Metadata & Anti-Desync Enforcement (§1)
                try {
                  const videoData = event.target.getVideoData?.();
                  if (videoData) {
                    const actualId = videoData.video_id;
                    const expectedId = currentSongRef.current?.youtubeId;
                    
                    // Anti-desync: if YouTube wandered to a random recommendation, force reload
                    if (actualId && expectedId && actualId !== expectedId) {
                      event.target.loadVideoById({ videoId: expectedId, startSeconds: 0 });
                    } else if (videoData.title) {
                      // Live metadata sync: parse the actual title/artist from the playing video
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
                // Track ended — immediately play next song
                try {
                  const nextId = nextSongId();
                  if (nextId && playerRef.current) {
                    playerRef.current.unMute?.();
                    playerRef.current.setVolume?.(Math.round(volumeRef.current * 100) || 15);
                    playerRef.current.loadVideoById({ videoId: nextId, startSeconds: 0 });
                    playerRef.current.playVideo?.();
                  }
                } catch {}
              }
            },
            onError: (event: any) => {
              console.warn("[YouTube Player error code:", event.data, "]");
              setIsPlaying(false);
              setTimeout(() => {
                try {
                  const nextId = nextSongId();
                  if (nextId && playerRef.current) {
                    playerRef.current.loadVideoById({ videoId: nextId, startSeconds: 0 });
                    playerRef.current.playVideo?.();
                  }
                } catch {}
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

  // ─── First-interaction autoplay unlock ─────────────────────────────────────
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

  // ─── Next / Previous handlers (instant zero-delay autoplay) ────────────────
  const handleNext = useCallback(() => {
    const id = nextSongId();
    if (id) imperativePlay(id);
  }, [nextSongId, imperativePlay]);

  const handlePrev = useCallback(() => {
    const id = prevSongId();
    if (id) imperativePlay(id);
  }, [prevSongId, imperativePlay]);

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

      {/* Floating Audio Player Container */}
      <div className="fixed bottom-24 sm:bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
        <AnimatePresence>
          {!isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 pl-2.5 rounded-full bg-[#FFF8F0]/95 dark:bg-[#170A24]/95 backdrop-blur-md border border-[#F0E2D2] dark:border-[#351D4D] shadow-[0_12px_32px_-8px_rgba(70,48,32,0.12)] dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] hover:shadow-lg transition-all"
            >
              {/* Spinning Vinyl / Album Thumbnail with Black Bars Cropped Out */}
              <button
                type="button"
                onClick={toggleExpand}
                aria-label="Expand Music Player"
                className="relative w-10 h-10 rounded-full overflow-hidden border border-[#F0E2D2] dark:border-[#351D4D] shadow-sm shrink-0 group cursor-pointer bg-[#FFE5B4]/50 dark:bg-[#2B143D] flex items-center justify-center"
              >
                {showThumb ? (
                  <img
                    src={thumbSrc}
                    alt={currentSong.title}
                    onError={handleThumbError}
                    className={`w-full h-full object-cover scale-[1.75] ${
                      isPlaying ? "animate-spin [animation-duration:8s]" : ""
                    }`}
                  />
                ) : (
                  <div className="w-full h-full bg-[#FFE5B4] dark:bg-[#2B143D] flex items-center justify-center text-[#E88B60]">
                    <Disc size={20} className={isPlaying ? "animate-spin [animation-duration:8s]" : ""} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
              </button>

              {/* Title & Artist & Mini Progress */}
              <div className="text-left min-w-0 max-w-[110px] sm:max-w-[160px]">
                <button
                  type="button"
                  onClick={toggleExpand}
                  className="w-full text-left cursor-pointer select-none group"
                >
                  <div className="text-xs font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] truncate group-hover:text-[#E88B60] transition-colors">
                    {currentSong.title}
                  </div>
                  <div className="text-[10px] text-[#857367] dark:text-[#A592A4] truncate">
                    {currentSong.artist}
                  </div>
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

        {/* Expanded Ambient Player Card */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-[300px] sm:w-[330px] p-5 rounded-3xl bg-[#FFF8F0]/95 dark:bg-[#170A24]/95 backdrop-blur-xl border border-[#F0E2D2] dark:border-[#351D4D] shadow-[0_20px_48px_-12px_rgba(70,48,32,0.18)] dark:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6)] space-y-4 relative overflow-hidden"
            >
              {/* Dynamic Blurred Ambient Artwork Glow */}
              {showThumb && (
                <div className="absolute -top-12 -left-12 -right-12 h-44 opacity-25 filter blur-3xl pointer-events-none -z-10">
                  <img
                    src={thumbSrc}
                    alt=""
                    className="w-full h-full object-cover"
                  />
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

              {/* Center Artwork (§2: 1:1 Aspect Ratio with Black Pillarbox Cropped Out) */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-black/40 flex items-center justify-center border border-[#F0E2D2] dark:border-[#351D4D]">
                {showThumb ? (
                  <>
                    {/* Blurred ambient background image filling full square */}
                    <img
                      src={thumbSrc}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-xl opacity-50 scale-125 pointer-events-none"
                    />
                    {/* Centered 1:1 square artwork with 16:9 pillarbox bars cropped via scale-[1.75] */}
                    <img
                      src={thumbSrc}
                      alt={currentSong.title}
                      onError={handleThumbError}
                      className="relative z-10 w-full h-full object-cover scale-[1.75] transition-transform duration-500"
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-[#FFE5B4] dark:bg-[#2B143D] flex items-center justify-center text-[#E88B60]">
                    <Disc size={64} className={isPlaying ? "animate-spin [animation-duration:10s]" : ""} />
                  </div>
                )}
              </div>

              {/* Song Information */}
              <div className="text-center space-y-0.5">
                <h4 className="text-base font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] truncate">
                  {currentSong.title}
                </h4>
                <p className="text-xs text-[#857367] dark:text-[#A592A4] truncate">
                  {currentSong.artist}
                </p>
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

              {/* Volume Slider */}
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
