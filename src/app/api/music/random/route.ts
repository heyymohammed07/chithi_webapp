import { NextRequest } from "next/server";
import ytSearch, { VideoSearchResult } from "yt-search";
import { apiOk } from "@/lib/api";
import { AttachedSong, DYNAMIC_DISCOVERY_POOLS, QUERY_SALTS, DEFAULT_RADIO_SONG } from "@/lib/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Era & Relevance Guard: Exclude vintage 1950s-1970s gramophone and non-music noise
const BLACKLIST = /1950|1960|1970|purono\s*diner|gramophone|swarnojug|natok|drama|telefilm|scene|short.?film|clip|teaser|trailer|ar-topic|status|tiktok|whatsapp|fan|cover|remix|reaction/i;

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

function isLegitimateTopicTrack(v: VideoSearchResult): boolean {
  const author = v.author?.name || "";
  const title = v.title || "";

  // 1. Strict Channel Pattern: MUST end with " - Topic"
  const isOfficialTopic = /\s-\sTopic$/i.test(author);
  if (!isOfficialTopic) return false;

  // 2. Reject negative keywords in title, author, or description
  if (BLACKLIST.test(title) || BLACKLIST.test(author) || BLACKLIST.test(v.description || "")) {
    return false;
  }

  // 3. Full-length tracks only (120s to 600s)
  const seconds = v.seconds || 0;
  if (seconds < 120 || seconds > 600) {
    return false;
  }

  return true;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const excludeParam = url.searchParams.get("exclude") || "";
    const excludedIds = new Set(
      excludeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    // Pick 2 distinct random seeds and query salts for parallel searching
    const shuffledPool = [...DYNAMIC_DISCOVERY_POOLS].sort(() => Math.random() - 0.5);
    const seed1 = shuffledPool[0] || "bangla 90s 2000s pop nostalgia topic audio";
    const seed2 = shuffledPool[1] || "bangla band classics topic audio";
    const salt = QUERY_SALTS[Math.floor(Math.random() * QUERY_SALTS.length)] || "studio audio";

    const [res1, res2] = await Promise.allSettled([
      ytSearch(`${seed1} ${salt}`),
      ytSearch(seed2),
    ]);

    const allVideos: VideoSearchResult[] = [
      ...(res1.status === "fulfilled" ? res1.value.videos || [] : []),
      ...(res2.status === "fulfilled" ? res2.value.videos || [] : []),
    ];

    // Filter strictly for legitimate Topic tracks not in the 50-track exclusion history
    const freshCandidates = allVideos.filter(
      (v) => isLegitimateTopicTrack(v) && !excludedIds.has(v.videoId)
    );

    if (freshCandidates.length > 0) {
      // Pick random video from unplayed filtered candidates (never default to index 0)
      const selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
      if (selected) {
        const song: AttachedSong = {
          id: selected.videoId,
          youtubeId: selected.videoId,
          title: cleanString(selected.title) || selected.title,
          artist: cleanString(selected.author?.name || "Artist"),
          thumbnail: `https://i.ytimg.com/vi/${selected.videoId}/hqdefault.jpg`,
          duration: selected.seconds,
        };
        return apiOk({ song });
      }
    }

    // Secondary fallback: if all were in exclude list, pick any valid un-blacklisted Topic track
    const allTopicVideos = allVideos.filter(isLegitimateTopicTrack);
    if (allTopicVideos.length > 0) {
      const selected = allTopicVideos[Math.floor(Math.random() * allTopicVideos.length)];
      if (selected) {
        const song: AttachedSong = {
          id: selected.videoId,
          youtubeId: selected.videoId,
          title: cleanString(selected.title) || selected.title,
          artist: cleanString(selected.author?.name || "Artist"),
          thumbnail: `https://i.ytimg.com/vi/${selected.videoId}/hqdefault.jpg`,
          duration: selected.seconds,
        };
        return apiOk({ song });
      }
    }

    return apiOk({ song: DEFAULT_RADIO_SONG });
  } catch (error) {
    console.error("[/api/music/random error]", error);
    return apiOk({ song: DEFAULT_RADIO_SONG });
  }
}
