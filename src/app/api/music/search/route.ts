import { NextRequest } from "next/server";
import ytSearch, { VideoSearchResult } from "yt-search";
import { apiOk, apiErr, getViewerHash } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { AttachedSong } from "@/lib/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 5 Curated Default Popular Bangla Tracks with verified, active YouTube IDs
const DEFAULT_CURATED_SONGS: AttachedSong[] = [
  {
    id: "J2p57B2Fq4c",
    youtubeId: "J2p57B2Fq4c", // Jao Pakhi Bolo Tare
    title: "Jao Pakhi Bolo Tare",
    artist: "Krishnokoli Islam",
    thumbnail: "https://i.ytimg.com/vi/J2p57B2Fq4c/hqdefault.jpg",
    duration: 208,
  },
  {
    id: "o3vP3bQ2X-Q",
    youtubeId: "o3vP3bQ2X-Q", // Meghomilon - Tahsan
    title: "Meghomilon",
    artist: "Tahsan Khan",
    thumbnail: "https://i.ytimg.com/vi/o3vP3bQ2X-Q/hqdefault.jpg",
    duration: 252,
  },
  {
    id: "7kK8-k8eP3k",
    youtubeId: "7kK8-k8eP3k", // Tumi Robe Nirobe
    title: "Tumi Robe Nirobe",
    artist: "Rabindrasangeet",
    thumbnail: "https://i.ytimg.com/vi/7kK8-k8eP3k/hqdefault.jpg",
    duration: 225,
  },
  {
    id: "8Lg3_vL2l3k",
    youtubeId: "8Lg3_vL2l3k", // Mon Shudhu Mon Chhuyechhe
    title: "Mon Shudhu Mon Chhuyechhe",
    artist: "Partha Barua",
    thumbnail: "https://i.ytimg.com/vi/8Lg3_vL2l3k/hqdefault.jpg",
    duration: 230,
  },
  {
    id: "mN2q8bV4Z8w",
    youtubeId: "mN2q8bV4Z8w", // Shei Je Boshe Achi
    title: "Shei Je Boshe Achi",
    artist: "Enamul Kabir",
    thumbnail: "https://i.ytimg.com/vi/mN2q8bV4Z8w/hqdefault.jpg",
    duration: 245,
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
