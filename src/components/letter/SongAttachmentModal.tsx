/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { AttachedSong, DEFAULT_RADIO_SONG } from "@/lib/music";
import { getThumbnailUrl } from "@/hooks/useGlobalAudio";
import { Search, Check, Sparkles, Disc } from "lucide-react";

export interface SongAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: AttachedSong) => void;
  currentSong?: AttachedSong | null;
}

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
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<AttachedSong[]>([DEFAULT_RADIO_SONG]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const searchQuery = query.trim() || "classic bangla song";
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (json.ok && json.data?.songs) {
          setSongs(json.data.songs);
        }
      } catch (err) {
        console.error("[SongAttachmentModal search error]", err);
      } finally {
        setLoading(false);
      }
    }, query.trim() ? 350 : 0);

    return () => clearTimeout(timeout);
  }, [query, isOpen]);

  const handleSelect = (song: AttachedSong) => {
    onSelectSong(song);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={locale === "bn" ? "গান যুক্ত করুন" : "Attach a Song"}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 pt-2">
        {/* Subtitle Description */}
        <p className="text-xs text-[#857367] dark:text-[#A592A4] font-serif italic">
          {locale === "bn"
            ? "চিঠির সাথে একটি গান যুক্ত করুন যা প্রাপকের পড়ার সময় বাজবে।"
            : "Attach a soundtrack to play while the recipient reads your letter."}
        </p>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#857367] dark:text-[#A592A4]">
            <Search size={18} />
          </div>
          <Input
            placeholder={
              locale === "bn"
                ? "গানের নাম বা শিল্পীর নাম দিয়ে খুঁজুন..."
                : "Search classic songs or artists..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 rounded-2xl bg-[#FFF8F0] dark:bg-[#1E0F2E] border-[#F0E2D2] dark:border-[#351D4D]"
          />
        </div>

        {/* Dynamic Songs List */}
        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-[#857367] dark:text-[#A592A4] animate-pulse">
              {locale === "bn" ? "গান খোঁজা হচ্ছে..." : "Searching YouTube Music tracks..."}
            </div>
          ) : songs.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#857367] dark:text-[#A592A4]">
              {locale === "bn" ? "কোনো গান পাওয়া যায়নি" : "No songs found for this query"}
            </div>
          ) : (
            songs.map((song) => {
              const isSelected = currentSong?.youtubeId === song.youtubeId;
              return (
                <button
                  key={song.youtubeId || song.id}
                  type="button"
                  onClick={() => handleSelect(song)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left group cursor-pointer ${
                    isSelected
                      ? "bg-[#FFE5B4]/60 dark:bg-[#351D4D] border-[#E88B60] shadow-sm"
                      : "bg-[#FFFDF9] dark:bg-[#170A24] border-[#F0E2D2] dark:border-[#351D4D]/60 hover:border-[#E88B60]/60 hover:bg-[#FFF8F0] dark:hover:bg-[#231235]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[#F0E2D2] dark:border-[#351D4D] relative bg-[#FFE5B4]/30 flex items-center justify-center">
                      <SongThumbnail song={song} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] truncate group-hover:text-[#E88B60] transition-colors">
                        {song.title}
                      </div>
                      <div className="text-xs text-[#857367] dark:text-[#A592A4] truncate">
                        {song.artist}
                      </div>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-7 h-7 rounded-full bg-[#E88B60] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-[#857367] dark:text-[#A592A4] group-hover:text-[#E88B60] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {locale === "bn" ? "নির্বাচন" : "Select"}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F0E2D2] dark:border-[#351D4D]">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#857367] dark:text-[#A592A4]">
            <Sparkles size={12} className="text-[#E88B60]" />
            <span>{locale === "bn" ? "অফিসিয়াল স্টুডিও অডিও" : "Official Studio Audio"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {locale === "bn" ? "বাতিল" : "Cancel"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
