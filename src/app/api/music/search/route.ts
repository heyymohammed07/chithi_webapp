import { NextRequest } from "next/server";
import ytSearch from "yt-search";
import { apiOk, apiErr, getViewerHash } from "@/lib/api";
import { checkRateLimit } from "@/lib/ratelimit";
import { AttachedSong, CURATED_SONGS } from "@/lib/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();

  if (!q) {
    return apiOk({ songs: CURATED_SONGS });
  }

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
    const videos = searchResults.videos.slice(0, 10);

    const songs: AttachedSong[] = videos.map((v) => ({
      id: v.videoId,
      youtubeId: v.videoId,
      title: v.title,
      artist: v.author?.name || "Artist",
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.seconds,
    }));

    return apiOk({ songs: songs.length > 0 ? songs : CURATED_SONGS });
  } catch (error) {
    console.error("[Music Search Fallback]", error);
    return apiOk({ songs: CURATED_SONGS });
  }
}
