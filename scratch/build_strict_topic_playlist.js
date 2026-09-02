const fs = require('fs');
const ytSearch = require('yt-search');

const SONGS_SEED = [
  { title: "Jao Pakhi Bolo Tare", artist: "Krishnokoli" },
  { title: "Hoyto Tomari Jonno", artist: "Manna Dey" },
  { title: "Ei Meghla Dine Ekla", artist: "Hemanta Mukherjee" },
  { title: "Tumi Ashbe Bole", artist: "Nachiketa Chakraborty" },
  { title: "Ki Name Deke Bolbo Tomake", artist: "Shyamal Mitra" },
  { title: "Pori", artist: "Bappa Mazumder" },
  { title: "Prem Tumi", artist: "Tahsan" },
  { title: "Chuye Dile Mon", artist: "Tahsan" },
  { title: "Meghomilon", artist: "Tanjib Sarowar" },
  { title: "Dube Dube", artist: "Habib Wahid" },
  { title: "Ga Chuye Bolo", artist: "Habib Wahid" },
  { title: "Bolna", artist: "Hridoy Khan" },
  { title: "Bhalobasbo Basbo Re", artist: "Habib Wahid" },
  { title: "Srotoshini", artist: "Encore" },
  { title: "Alo", artist: "Tahsan" },
  { title: "Aniket Prantor", artist: "Artcell" },
  { title: "Jhoom", artist: "Minar Rahman" },
  { title: "Se Je Boshe Ache", artist: "Arnob" },
  { title: "Bhalo Achi Bhalo Theko", artist: "Subir Nandi" },
  { title: "Utshorgo", artist: "Shironamhin" },
  { title: "Jodi Abar", artist: "Sudeshna Ganguli" },
  { title: "Bhalobasha Tarpor", artist: "Arnob" },
  { title: "Onno Groher Chand", artist: "Shironamhin" },
  { title: "Khola Janala", artist: "Feedback" },
  { title: "Shudhu Tomake", artist: "Warfaze" },
  { title: "Karone Okarone", artist: "Minar Rahman" },
  { title: "Purnota", artist: "Warfaze" },
  { title: "Long Distance Love", artist: "Coke Studio Bangla" },
  { title: "Deyale Deyale", artist: "Minar Rahman" },
  { title: "Nitol Paye", artist: "Fuad ft. Rajib" },
  { title: "Chiro Odhora", artist: "Miftah Zaman" },
  { title: "Shudhu Tomake", artist: "FRANKLIN" },
];

const BLACKLIST = /natok|movie|dialogue|scene|short.?film|drama|telefilm|reaction|status|preview|teaser|trailer|episode|ar-topic|tiktok|whatsapp|clip|fan|cover|remix/i;

async function checkEmbed(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: AbortSignal.timeout(6000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

function cleanTitle(title) {
  return title
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*\[.*?\]\s*/g, ' ')
    .replace(/\s*-\s*Topic/gi, '')
    .replace(/\s*Official\s*(Audio|Video|Lyrical Video|Track)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findStrictTopicTrack(song) {
  const queries = [
    `"${song.title}" ${song.artist} Topic`,
    `${song.title} ${song.artist} Topic`,
    `${song.title} Topic`,
  ];

  for (const q of queries) {
    let res;
    try { res = await ytSearch(q); } catch { continue; }
    const videos = res.videos || [];
    
    for (const v of videos.slice(0, 10)) {
      const channel = v.author?.name || "";
      const title = v.title || "";
      
      // STRICT REQUIREMENT: channel MUST end with " - Topic"
      const isStrictTopic = /\s-\sTopic$/i.test(channel);
      if (!isStrictTopic) continue;
      if (BLACKLIST.test(title) || BLACKLIST.test(channel) || BLACKLIST.test(v.description || "")) continue;
      if ((v.seconds || 0) < 100) continue;

      const ok = await checkEmbed(v.videoId);
      if (ok) {
        return {
          id: v.videoId,
          title: cleanTitle(v.title),
          artist: channel.replace(/\s*-\s*Topic/i, '').trim(),
          duration: v.seconds,
          channel: channel
        };
      }
    }
  }

  // If no strict topic found, try official Saregama / G-Series / label
  for (const q of queries) {
    let res;
    try { res = await ytSearch(q); } catch { continue; }
    for (const v of (res.videos || []).slice(0, 8)) {
      const channel = v.author?.name || "";
      const isLabel = /Saregama|G-Series|Soundtek|Laser Vision|SVF Music/i.test(channel);
      if (!isLabel) continue;
      if (BLACKLIST.test(v.title)) continue;
      if ((v.seconds || 0) < 100) continue;

      const ok = await checkEmbed(v.videoId);
      if (ok) {
        return {
          id: v.videoId,
          title: cleanTitle(v.title),
          artist: song.artist,
          duration: v.seconds,
          channel: channel
        };
      }
    }
  }

  return null;
}

async function main() {
  console.log("Searching strict ' - Topic' tracks for curated list...");
  const results = [];

  for (let i = 0; i < SONGS_SEED.length; i++) {
    const s = SONGS_SEED[i];
    process.stdout.write(`[${i+1}/${SONGS_SEED.length}] Searching ${s.title} (${s.artist})... `);
    const found = await findStrictTopicTrack(s);
    if (found) {
      console.log(`✅ ${found.title} — ${found.artist} [${found.channel}] (${found.id})`);
      results.push({
        id: found.id,
        youtubeId: found.id,
        title: found.title,
        artist: found.artist,
        thumbnail: `https://i.ytimg.com/vi/${found.id}/hqdefault.jpg`,
        duration: found.duration
      });
    } else {
      console.log(`❌ None found`);
    }
  }

  console.log(`\nFound ${results.length} strictly verified tracks.`);
  
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
    title: "${t.title.replace(/"/g, '\\"')}",
    artist: "${t.artist.replace(/"/g, '\\"')}",
    thumbnail: "${t.thumbnail}",
    duration: ${t.duration || 0}
  }`).join(',\n')}
];
`;

  fs.writeFileSync('./src/lib/music.ts', tsContent, 'utf-8');
  console.log("Updated src/lib/music.ts!");
}

main().catch(console.error);
