import { NextRequest } from "next/server";
import ytSearch, { VideoSearchResult } from "yt-search";
import { apiOk, apiErr, getViewerHash } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { AttachedSong } from "@/lib/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 Curated Default Popular Bangla Tracks when search input is empty
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
  {
    id: "quMow7krARY",
    youtubeId: "quMow7krARY",
    title: "Tumi Amar Prothom Shokal",
    artist: "Tahsan",
    thumbnail: "https://i.ytimg.com/vi/quMow7krARY/hqdefault.jpg",
    duration: 284,
  },
  {
    id: "M3q4B8-9xL0",
    youtubeId: "M3q4B8-9xL0",
    title: "Hariye Giyechi",
    artist: "Habib Wahid",
    thumbnail: "https://i.ytimg.com/vi/M3q4B8-9xL0/hqdefault.jpg",
    duration: 310,
  },
];

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(Official.*?\)/gi, "")
    .replace(/\s*\[Official.*?\]/gi, "")
    .replace(/\s*\(Lyric.*?\)/gi, "")
    .replace(/\s*\[Lyric.*?\]/gi, "")
    .replace(/\s*\(Video.*?\)/gi, "")
    .replace(/\s*\[Video.*?\]/gi, "")
    .replace(/\s*\(Audio.*?\)/gi, "")
    .replace(/\s*\[Audio.*?\]/gi, "")
    .replace(/\s*\[HD\]|\(HD\)|4K|1080p/gi, "")
    .replace(/\s*-\s*Topic/gi, "")
    .replace(/\|\s*Audio\s*\|.*/i, "")
    .replace(/\|\s*Lyrics\s*\|.*/i, "")
    .replace(/\|\s*#\w+.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArtist(artist: string): string {
  return artist
    .replace(/\s*-\s*Topic/gi, "")
    .replace(/\s*VEVO/gi, "")
    .replace(/\s*Official/gi, "")
    .trim();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || "";

  // If query is empty or whitespace, return the 5 curated default popular Bangla tracks immediately
  if (!q) {
    return apiOk({ songs: DEFAULT_CURATED_SONGS });
  }

  // Rate limit: 30 searches / 1m per viewer hash
  const viewerHash = getViewerHash(req);
  const rl = await checkRateLimit("music_search", viewerHash);
  if (!rl.success) {
    const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
    return apiErr(
      "RATE_LIMITED",
      "errors.rateLimited",
      429,
      undefined,
      {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.reset),
      }
    );
  }

  try {
    const searchResults = await ytSearch(q);
    const rawVideos: VideoSearchResult[] = searchResults.videos || [];

    // Filter out videos longer than 10 minutes (600s) to discard full albums/podcasts
    const filteredVideos = rawVideos.filter(
      (v) => (v.seconds || 0) > 0 && (v.seconds || 0) <= 600
    );

    const songs: AttachedSong[] = filteredVideos.slice(0, 6).map((v) => ({
      id: v.videoId,
      youtubeId: v.videoId,
      title: cleanTitle(v.title) || v.title,
      artist: cleanArtist(v.author?.name || "Artist"),
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.seconds,
    }));

    return apiOk({ songs });
  } catch (error) {
    console.error("[/api/music/search error]", error);
    return apiOk({ songs: [] });
  }
}
