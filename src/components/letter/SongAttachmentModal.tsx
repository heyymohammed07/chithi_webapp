/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { AttachedSong } from "@/lib/music";
import { getThumbnailUrl } from "@/hooks/useGlobalAudio";
import { Search, Check, Disc, Play, Square, Loader2 } from "lucide-react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export interface SongAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: AttachedSong) => void;
  currentSong?: AttachedSong | null;
}

// 5 Curated Default Popular Bangla Tracks (Displayed by default when query is empty)
const DEFAULT_CURATED_SONGS: AttachedSong[] = [
  {
    id: "iPe2K-RRcT8",
    youtubeId: "iPe2K-RRcT8",
    title: "Jao Pakhi Bolo Tare",
    artist: "Krishnokoli Islam",
    thumbnail: "https://i.ytimg.com/vi/iPe2K-RRcT8/hqdefault.jpg",
    duration: 209,
  },
  {
    id: "sK38b9FwO_w",
    youtubeId: "sK38b9FwO_w",
    title: "Meghomilon",
    artist: "Tahsan Khan",
    thumbnail: "https://i.ytimg.com/vi/sK38b9FwO_w/hqdefault.jpg",
    duration: 275,
  },
  {
    id: "N6d3d9d3c_A",
    youtubeId: "N6d3d9d3c_A",
    title: "Tumi Robe Nirobe",
    artist: "Rabindrasangeet",
    thumbnail: "https://i.ytimg.com/vi/N6d3d9d3c_A/hqdefault.jpg",
    duration: 242,
  },
  {
    id: "86OFfPhQsNY",
    youtubeId: "86OFfPhQsNY",
    title: "Mon Shudhu Mon Chhuyechhe",
    artist: "Partha Barua",
    thumbnail: "https://i.ytimg.com/vi/86OFfPhQsNY/hqdefault.jpg",
    duration: 275,
  },
  {
    id: "CjM4q807kR0",
    youtubeId: "CjM4q807kR0",
    title: "Shey Je Boshe Ache",
    artist: "Arnob",
    thumbnail: "https://i.ytimg.com/vi/CjM4q807kR0/hqdefault.jpg",
    duration: 215,
  },
];

function SongThumbnail({ song }: { song: AttachedSong }) {
  const [error, setError] = useState(false);
  const resolvedUrl = getThumbnailUrl(song);

  if (!resolvedUrl || error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[#E88B60] bg-[#FFE5B4]/40">
        <Disc size={18} />
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={song.title}
      onError={() => setError(true)}
      className="w-full h-full object-cover scale-[1.75]"
    />
  );
}

export function SongAttachmentModal({
  isOpen,
  onClose,
  onSelectSong,
  currentSong,
}: SongAttachmentModalProps) {
  const { locale } = useLocale();

  // Controlled input value separated from debounced query to prevent focus drops
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [songs, setSongs] = useState<AttachedSong[]>(DEFAULT_CURATED_SONGS);
  const [loading, setLoading] = useState(false);

  // 20-second preview state
  const [previewingSongId, setPreviewingSongId] = useState<string | null>(null);
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState<number>(20);
  const [isPreviewBuffering, setIsPreviewBuffering] = useState<boolean>(false);

  const previewPlayerRef = useRef<any>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasFocusedRef = useRef(false);

  // Stop active preview helper
  const stopActivePreview = useCallback(() => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (previewPlayerRef.current) {
      try {
        previewPlayerRef.current.pauseVideo?.();
        previewPlayerRef.current.stopVideo?.();
      } catch {}
    }
    setPreviewingSongId(null);
    setPreviewSecondsLeft(20);
    setIsPreviewBuffering(false);
  }, []);

  // Initialize background YouTube iframe player once when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopActivePreview();
      hasFocusedRef.current = false;
      return;
    }

    if (!hasFocusedRef.current) {
      hasFocusedRef.current = true;
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }

    const initPreviewPlayer = () => {
      if (!window.YT || typeof window.YT.Player !== "function") return;
      if (previewPlayerRef.current) return;

      const mountEl = document.getElementById("preview-yt-mount");
      if (!mountEl) return;

      try {
        previewPlayerRef.current = new window.YT.Player("preview-yt-mount", {
          height: "100",
          width: "100",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            rel: 0,
          },
          events: {
            onStateChange: (event: any) => {
              if (event.data === 1) {
                // Playing
                setIsPreviewBuffering(false);
              } else if (event.data === 3) {
                // Buffering
                setIsPreviewBuffering(true);
              } else if (event.data === 0) {
                // Ended
                stopActivePreview();
              }
            },
            onError: () => {
              stopActivePreview();
            },
          },
        });
      } catch (err) {
        console.warn("[Preview Player init error]", err);
      }
    };

    if (window.YT && typeof window.YT.Player === "function") {
      initPreviewPlayer();
    } else {
      if (!document.getElementById("yt-iframe-api-script")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const checkInterval = setInterval(() => {
        if (window.YT && typeof window.YT.Player === "function") {
          clearInterval(checkInterval);
          initPreviewPlayer();
        }
      }, 250);
      return () => clearInterval(checkInterval);
    }
  }, [isOpen, stopActivePreview]);

  // Debounce search query: 300ms delay, instant reset to 5 defaults when empty
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setDebouncedQuery("");
      setSongs(DEFAULT_CURATED_SONGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch search results on debouncedQuery changes
  useEffect(() => {
    if (!isOpen || !debouncedQuery) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/music/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok && json.data?.songs) {
          setSongs(json.data.songs);
        }
      })
      .catch((err) => {
        console.error("[SongAttachmentModal search error]", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, isOpen]);

  // Toggle 20s Audio Preview
  const handleTogglePreview = (e: React.MouseEvent, song: AttachedSong) => {
    e.stopPropagation();

    if (previewingSongId === song.youtubeId) {
      stopActivePreview();
      return;
    }

    stopActivePreview();

    setPreviewingSongId(song.youtubeId);
    setPreviewSecondsLeft(20);
    setIsPreviewBuffering(true);

    if (previewPlayerRef.current) {
      try {
        previewPlayerRef.current.unMute?.();
        previewPlayerRef.current.setVolume?.(80);
        previewPlayerRef.current.loadVideoById({
          videoId: song.youtubeId,
          startSeconds: 10,
        });
        previewPlayerRef.current.playVideo?.();
      } catch (err) {
        console.warn("[Preview play error]", err);
      }
    }

    countdownIntervalRef.current = setInterval(() => {
      setPreviewSecondsLeft((prev) => {
        if (prev <= 1) {
          stopActivePreview();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);

    previewTimerRef.current = setTimeout(() => {
      stopActivePreview();
    }, 20000);
  };

  const handleSelect = (song: AttachedSong) => {
    stopActivePreview();
    onSelectSong(song);
    onClose();
  };

  const handleClose = () => {
    stopActivePreview();
    onClose();
  };

  const hasSearchQuery = searchTerm.trim().length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={locale === "bn" ? "চিঠির গান নির্বাচন" : "Select Background Song"}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 pt-2">
        {/* Invisible mount for YouTube preview playback */}
        <div
          id="preview-yt-mount"
          className="fixed bottom-0 right-0 w-1 h-1 pointer-events-none opacity-[0.01] overflow-hidden -z-20"
          aria-hidden="true"
        />

        {/* Clean Subtitle Description without promotional parenthetical clutter */}
        <p className="text-xs text-[#857367] dark:text-[#A592A4] font-serif italic">
          {locale === "bn"
            ? "চিঠির সাথে একটি গান যুক্ত করুন যা প্রাপকের পড়ার সময় বাজবে।"
            : "Attach a soundtrack to play while the recipient reads your letter."}
        </p>

        {/* Stable Native Input Container with persistent DOM element & id */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#857367] dark:text-[#A592A4]">
            <Search size={18} />
          </div>
          <input
            id="song-search-input"
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              locale === "bn"
                ? "গানের নাম বা শিল্পীর নাম লিখুন..."
                : "Search song or artist..."
            }
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl bg-[#FFF8F0] dark:bg-[#1E0F2E] border border-[#F0E2D2] dark:border-[#351D4D] text-[#382A22] dark:text-[#FFF8F0] placeholder:text-[#857367]/60 dark:placeholder:text-[#A592A4]/60 focus:outline-none focus:ring-1 focus:ring-[#E88B60] focus:border-[#E88B60] transition-colors"
          />
        </div>

        {/* Dynamic Songs List or 5 Default Curated Bangla Tracks */}
        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading && songs.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#857367] dark:text-[#A592A4] animate-pulse">
              {locale === "bn" ? "গান খোঁজা হচ্ছে..." : "Searching tracks..."}
            </div>
          ) : !loading && hasSearchQuery && songs.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#857367] dark:text-[#A592A4]">
              {locale === "bn" ? "কোনো গান পাওয়া যায়নি" : "No songs found for this query"}
            </div>
          ) : (
            songs.map((song) => {
              const isSelected = currentSong?.youtubeId === song.youtubeId;
              const isPreviewing = previewingSongId === song.youtubeId;

              return (
                <div
                  key={song.youtubeId || song.id}
                  onClick={() => handleSelect(song)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer ${
                    isSelected
                      ? "bg-[#FFE5B4]/60 dark:bg-[#351D4D] border-[#E88B60] shadow-sm"
                      : isPreviewing
                      ? "bg-[#FFF8F0] dark:bg-[#251338] border-[#E88B60]/80 shadow-md ring-1 ring-[#E88B60]"
                      : "bg-[#FFFDF9] dark:bg-[#170A24] border-[#F0E2D2] dark:border-[#351D4D]/60 hover:border-[#E88B60]/60 hover:bg-[#FFF8F0] dark:hover:bg-[#231235]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#F0E2D2] dark:border-[#351D4D] relative bg-[#FFE5B4]/30 flex items-center justify-center">
                      <SongThumbnail song={song} />
                    </div>

                    {/* Metadata & Preview Indicator */}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] truncate group-hover:text-[#E88B60] transition-colors">
                        {song.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#857367] dark:text-[#A592A4] truncate">
                        <span>{song.artist}</span>
                        {isPreviewing && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#E88B60] font-bold animate-pulse">
                            • {isPreviewBuffering ? "Buffering..." : `Preview (${previewSecondsLeft}s)`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Right: 20s Preview Button + Selection Tick */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* 20s Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => handleTogglePreview(e, song)}
                      aria-label={isPreviewing ? "Stop Preview" : "Preview 20s"}
                      title={isPreviewing ? "Stop Preview" : "Play 20s Preview"}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isPreviewing
                          ? "bg-[#E88B60] text-white shadow-sm scale-105"
                          : "bg-[#FFE5B4]/70 dark:bg-[#351D4D] text-[#857367] dark:text-[#A592A4] hover:text-[#382A22] dark:hover:text-[#FFF8F0] hover:bg-[#FFE5B4]"
                      }`}
                    >
                      {isPreviewing ? (
                        isPreviewBuffering ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Square size={11} fill="currentColor" />
                        )
                      ) : (
                        <Play size={12} fill="currentColor" className="ml-0.5" />
                      )}
                    </button>

                    {/* Selection State */}
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-[#E88B60] text-white flex items-center justify-center shadow-sm">
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                    ) : (
                      <div className="text-xs font-mono text-[#857367] dark:text-[#A592A4] group-hover:text-[#E88B60] opacity-0 group-hover:opacity-100 transition-opacity">
                        {locale === "bn" ? "যুক্ত করুন" : "Select"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions with Clean Single Accent Label */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0E2D2] dark:border-[#351D4D]">
          <div className="text-[11px] font-mono text-[#857367] dark:text-[#A592A4]">
            <span>✨ {locale === "bn" ? "চিঠির গান" : "Letter Soundtrack"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {locale === "bn" ? "বাতিল" : "Cancel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
