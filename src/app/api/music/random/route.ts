import { NextRequest } from "next/server";
import ytSearch, { VideoSearchResult } from "yt-search";
import { apiOk } from "@/lib/api";
import { AttachedSong, CURATED_SONGS } from "@/lib/music";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED_QUERIES = [
  "Manna Dey topic",
  "Hemanta Mukherjee topic",
  "Kishore Kumar bangla topic",
  "Shyamal Mitra topic",
  "R.D. Burman bangla topic",
  "Tahsan topic",
  "Habib Wahid topic",
  "Arnob topic",
  "Minar Rahman topic",
  "Warfaze topic",
  "Shironamhin topic",
  "Artcell topic",
  "Bappa Mazumder topic",
  "Anupam Roy bangla topic",
  "Rabindra Sangeet topic",
];

const BLACKLIST = /natok|movie|dialogue|scene|short.?film|drama|telefilm|reaction|status|preview|teaser|trailer|episode|ar-topic|tiktok|whatsapp|clip|cover|remix/i;

function cleanString(str: string): string {
  return str
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s*\[.*?\]\s*/g, " ")
    .replace(/\s*-\s*Topic/gi, "")
    .replace(/\s*Official\s*(Audio|Video|Lyrical Video|Track)\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLegitimateTopicTrack(v: VideoSearchResult): boolean {
  const author = v.author?.name || "";
  const title = v.title || "";

  // 1. Strict Channel Pattern: MUST end with " - Topic"
  const isOfficialTopicChannel = /\s-\sTopic$/i.test(author);

  // 2. Reject any negative keywords in title, author, or description
  if (BLACKLIST.test(title) || BLACKLIST.test(author) || BLACKLIST.test(v.description || "")) {
    return false;
  }

  // 3. Reject suspiciously short tracks
  if ((v.seconds || 0) < 120) {
    return false;
  }

  return isOfficialTopicChannel;
}

export async function GET(_req: NextRequest) {
  try {
    const randomQuery = SEED_QUERIES[Math.floor(Math.random() * SEED_QUERIES.length)] || "Manna Dey topic";
    const searchResults = await ytSearch(randomQuery);
    const videos: VideoSearchResult[] = searchResults.videos || [];

    // Filter strictly for legitimate YouTube Music "- Topic" tracks
    const topicVideos = videos.filter(isLegitimateTopicTrack);

    if (topicVideos.length > 0) {
      const selected = topicVideos[Math.floor(Math.random() * topicVideos.length)];
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

    // If search didn't yield a strict topic track, fallback to verified curated list
    const fallback = CURATED_SONGS[Math.floor(Math.random() * CURATED_SONGS.length)] || CURATED_SONGS[0];
    return apiOk({ song: fallback });
  } catch (error) {
    console.error("[/api/music/random error]", error);
    const fallback = CURATED_SONGS[Math.floor(Math.random() * CURATED_SONGS.length)] || CURATED_SONGS[0];
    return apiOk({ song: fallback });
  }
}
