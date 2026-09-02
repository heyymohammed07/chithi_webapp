/**
 * find_pure_topic_tracks.js
 *
 * For each song in the current music.ts, searches YouTube for:
 *  1. PRIORITY: A "- Topic" auto-generated channel (pure studio master)
 *  2. FALLBACK: Any official audio / record label upload (>= 120s, no dialogue blacklist)
 *
 * Verifies every chosen ID via oEmbed (embeddability check).
 * Writes the result back to src/lib/music.ts.
 */

const fs = require("fs");
const ytSearch = require("yt-search");

// ── Source playlist ────────────────────────────────────────────────────────────
const SONGS = [
  { title: "Jao Pakhi Bolo Tare",   artist: "Krishnokoli",           currentId: "iPe2K-RRcT8" },
  { title: "Hoyto Tomari Jonno",    artist: "Manna Dey",             currentId: "YFmpvovELEA" },
  { title: "Chiro Odhora",          artist: "Miftah Zaman",          currentId: "ENxLVGP8tr0" },
  { title: "Ei Meghla Dine Ekla",   artist: "Hemanta Mukherjee",     currentId: "aFEPYpcmkEM" },
  { title: "Tumi Ashbe Bole",       artist: "Nachiketa Chakraborty", currentId: "ZrddHUki0RU" },
  { title: "Ki Name Deke Bolbo Tomake", artist: "Shyamal Mitra",     currentId: "NjGlJe1g2KM" },
  { title: "Pori",                  artist: "Bappa Mazumder",        currentId: "bZsEIzEDbIs" },
  { title: "Prem Tumi",             artist: "Tahsan",                currentId: "e2hLjfsSTco" },
  { title: "Chuye Dile Mon",        artist: "Tahsan",                currentId: "qb1HTyRAVV4" },
  { title: "Meghomilon",            artist: "Tanjib Sarowar",        currentId: "t63E5gBDJXU" },
  { title: "Dube Dube",             artist: "Habib Wahid",           currentId: "V1GBgQSMLxU" },
  { title: "Ga Chuye Bolo",         artist: "Habib Wahid",           currentId: "wCNOT8th_xY" },
  { title: "Bolna",                 artist: "Hridoy Khan",           currentId: "0CxuFQ1G0vs" },
  { title: "Bhalobasbo Basbo Re",   artist: "Habib Wahid",           currentId: "IWAke2_ogeI" },
  { title: "Srotoshini",            artist: "Encore",                currentId: "F0_jwKzCDC0" },
  { title: "Alo",                   artist: "Tahsan",                currentId: "FLOB6J_wTp4" },
  { title: "Aniket Prantor",        artist: "Artcell",               currentId: "qw1CVt43VKw" },
  { title: "Jhoom",                 artist: "Minar Rahman",          currentId: "RWnFowWtT78" },
  { title: "Se Je Boshe Ache",      artist: "Arnob",                 currentId: "AgfMv0e1Hy8" },
  { title: "Bhalo Achi Bhalo Theko", artist: "Subir Nandi",          currentId: "7MyC7ynubGo" },
  { title: "Utshorgo",              artist: "Shironamhin",           currentId: "Dj4LEjcSWT8" },
  { title: "Jodi Abar",             artist: "Angel Noor",            currentId: "2g95jnDYGWo" },
  { title: "Bhalobasha Tarpor",     artist: "Arnob",                 currentId: "sjRZJByUGGg" },
  { title: "Onno Groher Chand",     artist: "Shironamhin",           currentId: "pK-7GHSkbdk" },
  { title: "Khola Janala",          artist: "Feedback",              currentId: "DXiS8JSKJXE" },
  { title: "Shudhu Tomake",         artist: "Warfaze",               currentId: "ns8UJhuMq5Q" },
  { title: "Karone Okarone",        artist: "Minar Rahman",          currentId: "zqKwhn-fz2w" },
  { title: "Purnota",               artist: "Warfaze",               currentId: "uB2rhjulY4Q" },
  { title: "Long Distance Love",    artist: "Coke Studio Bangla",    currentId: "xQ2Dz9K9xeg" },
  { title: "Deyale Deyale",         artist: "Minar Rahman",          currentId: "t-jgya0qcpA" },
  { title: "Nitol Paye",            artist: "Fuad ft. Rajib",        currentId: "IHLja3bLaF8" },
  { title: "Hoyto Tomari Jonno",    artist: "Miftah Zaman",          currentId: "ZQgcBpfXdDs" },
  { title: "Shudhu Tomake",         artist: "FRANKLIN",              currentId: "KAn1SIGQrME" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const BLACKLIST = /natok|movie|dialogue|scene|short.?film|drama|telefilm|reaction|status|preview|teaser|trailer|episode|official.?video/i;

async function checkEmbed(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    return res.status === 200;
  } catch {
    return false;
  }
}

async function searchBestId(song) {
  const queries = [
    `${song.title} ${song.artist} Topic`,
    `${song.title} Topic Bengali`,
    `${song.title} ${song.artist} official audio`,
    `${song.title} ${song.artist}`,
  ];

  // Pass 1: Topic channel strict match
  for (const q of queries) {
    let res;
    try { res = await ytSearch(q); } catch { continue; }
    for (const v of (res.videos || []).slice(0, 10)) {
      const ch = (v.author?.name || "").toLowerCase();
      const title = (v.title || "").toLowerCase();
      const isTopic = ch.includes("- topic") || ch.endsWith("topic");
      if (!isTopic) continue;
      if (BLACKLIST.test(title)) continue;
      if ((v.seconds || 0) < 120) continue;
      if (await checkEmbed(v.videoId)) {
        return { id: v.videoId, seconds: v.seconds, channel: v.author?.name, label: "Topic" };
      }
    }
  }

  // Pass 2: Official / label upload (non-blacklisted, embeddable, full length)
  for (const q of queries) {
    let res;
    try { res = await ytSearch(q); } catch { continue; }
    for (const v of (res.videos || []).slice(0, 10)) {
      const title = (v.title || "").toLowerCase();
      if (BLACKLIST.test(title)) continue;
      if ((v.seconds || 0) < 120) continue;
      if (await checkEmbed(v.videoId)) {
        return { id: v.videoId, seconds: v.seconds, channel: v.author?.name, label: "Official" };
      }
    }
  }

  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const results = [];
  const kept = [];
  const replaced = [];
  const failed = [];

  for (let i = 0; i < SONGS.length; i++) {
    const song = SONGS[i];
    process.stdout.write(`[${i + 1}/${SONGS.length}] ${song.title} (${song.artist})... `);

    // First verify current ID
    const currentOk = await checkEmbed(song.currentId);
    
    // Try to find a Topic track
    const found = await searchBestId(song);

    if (found && found.label === "Topic") {
      // Always prefer Topic if found
      const useSong = {
        ...song,
        id: found.id,
        youtubeId: found.id,
        duration: found.seconds,
        thumbnail: `https://i.ytimg.com/vi/${found.id}/hqdefault.jpg`,
        channelLabel: found.label,
        channel: found.channel,
      };
      if (found.id !== song.currentId) {
        replaced.push({ from: song.currentId, to: found.id, title: song.title, channel: found.channel });
        process.stdout.write(`✅ TOPIC REPLACED → ${found.id} | ${found.channel} | ${found.seconds}s\n`);
      } else {
        kept.push(song.title);
        process.stdout.write(`✅ TOPIC (kept) | ${found.channel} | ${found.seconds}s\n`);
      }
      results.push(useSong);
    } else if (currentOk) {
      // Keep current if it's embeddable
      const useSong = {
        ...song,
        id: song.currentId,
        youtubeId: song.currentId,
        thumbnail: `https://i.ytimg.com/vi/${song.currentId}/hqdefault.jpg`,
        channelLabel: "Kept",
      };
      kept.push(song.title);
      process.stdout.write(`✔ KEPT (embeddable, no Topic found)\n`);
      results.push(useSong);
    } else if (found) {
      // Current is broken, use best fallback
      const useSong = {
        ...song,
        id: found.id,
        youtubeId: found.id,
        duration: found.seconds,
        thumbnail: `https://i.ytimg.com/vi/${found.id}/hqdefault.jpg`,
        channelLabel: found.label,
        channel: found.channel,
      };
      replaced.push({ from: song.currentId, to: found.id, title: song.title, channel: found.channel });
      process.stdout.write(`⚠ FALLBACK REPLACED → ${found.id} | ${found.channel} | ${found.seconds}s\n`);
      results.push(useSong);
    } else {
      // Everything failed — keep current and log warning
      const useSong = {
        ...song,
        id: song.currentId,
        youtubeId: song.currentId,
        thumbnail: `https://i.ytimg.com/vi/${song.currentId}/hqdefault.jpg`,
        channelLabel: "FAILED",
      };
      failed.push(song.title);
      process.stdout.write(`❌ FAILED — keeping current ${song.currentId}\n`);
      results.push(useSong);
    }
  }

  // Write music.ts
  const tsContent = `export interface AttachedSong {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  thumbnail: string;
  duration?: number;
}

export const CURATED_SONGS: AttachedSong[] = [
${results.map(t => `  {
    id: "${t.id}",
    youtubeId: "${t.youtubeId}",
    title: "${t.title}",
    artist: "${t.artist}",
    thumbnail: "https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg",
    duration: ${t.duration || 0}
  }`).join(",\n")}
];
`;

  fs.writeFileSync("./src/lib/music.ts", tsContent, "utf-8");

  console.log("\n──────────────────────────────────────────");
  console.log(`✅ Done! ${results.length} tracks written to src/lib/music.ts`);
  console.log(`   Topic/Official upgrades: ${replaced.length}`);
  console.log(`   Kept (already good):     ${kept.length}`);
  console.log(`   Failed (kept original):  ${failed.length}`);
  if (failed.length) console.log("   Failed tracks:", failed);

  // Summary table
  console.table(results.map((t, i) => ({
    "#": i + 1,
    Title: t.title.substring(0, 22),
    Artist: t.artist.substring(0, 18),
    ID: t.youtubeId,
    Type: t.channelLabel,
    Dur: t.duration ? `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, "0")}` : "?",
  })));
}

main().catch(err => { console.error(err); process.exit(1); });
