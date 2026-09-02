/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/hooks/useLocale";
import { AttachedSong, CURATED_SONGS } from "@/lib/music";
import { getThumbnailUrl } from "@/hooks/useGlobalAudio";
import { Music, Search, Check, Sparkles, Disc } from "lucide-react";

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
      className="w-full h-full object-cover"
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
  const [songs, setSongs] = useState<AttachedSong[]>(CURATED_SONGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setSongs(CURATED_SONGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        if (json.ok && json.data?.songs) {
          setSongs(json.data.songs);
        } else {
          setSongs(CURATED_SONGS);
        }
      } catch {
        setSongs(CURATED_SONGS);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="space-y-5 text-left p-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFE5B4] dark:bg-[#2B143D] border border-[#FCD34D] dark:border-[#52336B] flex items-center justify-center text-[#E88B60] shadow-sm">
            <Music size={20} strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#857367] dark:text-[#A592A4] block">
              Acoustic Soundtrack
            </span>
            <h3 className="text-lg font-serif font-bold text-[#382A22] dark:text-[#FFF8F0]">
              {locale === "bn" ? "চিঠির সাথে গান যুক্ত করুন" : "Attach a Song to Letter"}
            </h3>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              locale === "bn"
                ? "বাংলা গান বা শিল্পীর নাম দিয়ে খুঁজুন..."
                : "Search acoustic song or artist..."
            }
            className="pl-10 rounded-full"
          />
          <Search
            size={16}
            className="absolute left-3.5 top-3.5 text-[#857367] dark:text-[#A592A4]"
          />
        </div>

        {/* Songs List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          <div className="flex items-center gap-1.5 text-xs text-[#857367] dark:text-[#A592A4] px-1 pb-1">
            <Sparkles size={13} className="text-[#E88B60]" />
            <span>
              {!query.trim()
                ? locale === "bn"
                  ? "বাছাই করা বাংলা নস্টালজিক সুর"
                  : "Curated Bengali Acoustic Songs"
                : locale === "bn"
                ? "অনুসন্ধানের ফলাফল"
                : "Search Results"}
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-[#857367] dark:text-[#A592A4] animate-pulse">
              {locale === "bn" ? "গান খোঁজা হচ্ছে..." : "Searching music..."}
            </div>
          ) : songs.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#857367] dark:text-[#A592A4]">
              {locale === "bn"
                ? "কোনো গান পাওয়া যায়নি। অন্য নামে চেষ্টা করুন।"
                : "No songs found. Try another query."}
            </div>
          ) : (
            songs.map((song) => {
              const isSelected = currentSong?.youtubeId === song.youtubeId;

              return (
                <div
                  key={song.id || song.youtubeId}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl border transition-all ${
                    isSelected
                      ? "bg-[#FFE5B4]/80 dark:bg-[#2B143D] border-[#FCD34D] dark:border-[#52336B] shadow-sm"
                      : "bg-[#FFF8F0] dark:bg-[#1E0F2E] border-[#F0E2D2] dark:border-[#351D4D] hover:border-[#E88B60] hover:bg-[#FFE5B4]/20 dark:hover:bg-[#2B143D]/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#FFE5B4]/30 dark:bg-[#170A24] border border-[#F0E2D2] dark:border-[#351D4D] shrink-0">
                      <SongThumbnail song={song} />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-serif font-bold text-[#382A22] dark:text-[#FFF8F0] truncate">
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-[#857367] dark:text-[#A592A4] truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? "primary" : "outline"}
                    onClick={() => {
                      onSelectSong(song);
                      onClose();
                    }}
                    className="rounded-full shrink-0 text-xs gap-1"
                  >
                    {isSelected ? (
                      <>
                        <Check size={14} />
                        <span>{locale === "bn" ? "যুক্ত আছে" : "Attached"}</span>
                      </>
                    ) : (
                      <span>{locale === "bn" ? "যুক্ত করুন" : "Attach"}</span>
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
