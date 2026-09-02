import { NextRequest } from "next/server";
import ytSearch, { VideoSearchResult } from "yt-search";
import { apiOk, apiErr, getViewerHash } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { AttachedSong, DYNAMIC_DISCOVERY_POOLS, DEFAULT_RADIO_SONG } from "@/lib/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanString(str: string): string {
  return str
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*\[.*?\]\s*/g, " ")
    .replace(/\s*-\s*Topic/gi, "")
    .replace(/\s*Official\s*(Audio|Video|Lyrical Video|Track)\s*/gi, "")
    .replace(/\|\s*Audio\s*\|.*/i, "")
    .replace(/\|\s*Lyrics\s*\|.*/i, "")
    .replace(/\|\s*#\w+.*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() || DYNAMIC_DISCOVERY_POOLS[0] || "bangla 90s 2000s pop nostalgia topic audio";

  // Rate limit: 15 searches / 1m per viewer hash (CWE-400 mitigation)
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
    const videos: VideoSearchResult[] = searchResults.videos || [];

    const songs: AttachedSong[] = videos.slice(0, 10).map((v: VideoSearchResult) => ({
      id: v.videoId,
      youtubeId: v.videoId,
      title: cleanString(v.title) || v.title,
      artist: cleanString(v.author?.name || "Artist"),
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.seconds,
    }));

    return apiOk({ songs: songs.length > 0 ? songs : [DEFAULT_RADIO_SONG] });
  } catch (error) {
    console.error("[Music Search Error]", error);
    return apiOk({ songs: [DEFAULT_RADIO_SONG] });
  }
}
