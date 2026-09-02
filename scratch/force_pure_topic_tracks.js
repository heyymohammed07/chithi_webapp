const fs = require('fs');
const ytSearch = require('yt-search');

const SONGS = [
  { title: "Jao Pakhi Bolo Tare", artist: "Krishnokoli Chandrabindoo" },
  { title: "Hoyto Tomari Jonno", artist: "Manna Dey" },
  { title: "Chiro Odhora", artist: "Miftah Zaman" },
  { title: "Ei Meghla Dine Ekla", artist: "Hemanta Mukherjee" },
  { title: "Tumi Ashbe Bole", artist: "Nachiketa Chakraborty" },
  { title: "Ki Name Deke Bolbo Tomake", artist: "Shyamal Mitra" },
  { title: "Pori", artist: "Bappa Mazumder" },
  { title: "Prem Tumi", artist: "Tahsan" },
  { title: "Chuye Dile Mon", artist: "Tahsan & Kona" },
  { title: "Meghomilon", artist: "Tanjib Sarowar | Rafa" },
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
  { title: "Jodi Abar", artist: "Angel Noor" },
  { title: "Bhalobasha Tarpor", artist: "Arnob" },
  { title: "Onno Groher Chand", artist: "Shironamhin" },
  { title: "Khola Janala", artist: "Feedback" },
  { title: "Shudhu Tomake", artist: "Warfaze" },
  { title: "Karone Okarone", artist: "Minar Rahman" },
  { title: "Purnota", artist: "Warfaze" },
  { title: "Long Distance Love", artist: "Coke Studio Bangla | Ankan X Afrin" },
  { title: "Deyale Deyale", artist: "Minar Rahman" },
  { title: "Nitol Paye", artist: "Fuad ft. Rajib" },
  { title: "Hoyto Tomari Jonno", artist: "Miftah Zaman" },
  { title: "Shudhu Tomake", artist: "FRANKLIN" }
];

async function checkEmbed(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    return res.status === 200;
  } catch {
    return false;
  }
}

const BLACKLIST = /natok|movie|dialogue|scene|music video|drama|telefilm|short film|reaction|status|preview/i;

async function getPureTopicTrack(song) {
  const queries = [
    `${song.title} ${song.artist} Topic`,
    `${song.title} Topic`,
    `${song.title} ${song.artist}`
  ];

  // 1. Priority 1: Channel name ending with "Topic" or containing "Topic"
  for (const q of queries) {
    const res = await ytSearch(q);
    const videos = res.videos || [];
    for (const v of videos) {
      const channel = (v.author?.name || '').toLowerCase();
      const title = v.title.toLowerCase();

      if (channel.includes('topic') || title.includes('topic')) {
        if (BLACKLIST.test(title)) continue;
        const ok = await checkEmbed(v.videoId);
        if (ok) {
          return {
            id: v.videoId,
            youtubeId: v.videoId,
            title: song.title,
            artist: song.artist,
            thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hq720.jpg`,
            duration: v.seconds,
            sourceType: "YouTube Music Auto-Generated Topic Track",
            channel: v.author?.name || "Topic"
          };
        }
      }
    }
  }

  // 2. Priority 2: Clean Studio Audio without speech/dialogue/MV tags
  for (const q of queries) {
    const res = await ytSearch(q);
    const videos = res.videos || [];
    for (const v of videos.slice(0, 10)) {
      const title = v.title;
      if (BLACKLIST.test(title)) continue;
      const ok = await checkEmbed(v.videoId);
      if (ok) {
        return {
          id: v.videoId,
          youtubeId: v.videoId,
          title: song.title,
          artist: song.artist,
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/hq720.jpg`,
          duration: v.seconds,
          sourceType: "Clean Studio Master (Non-Topic Fallback)",
          channel: v.author?.name || ""
        };
      }
    }
  }

  return null;
}

async function main() {
  console.log(`Auditing and forcing Topic tracks for ${SONGS.length} songs...`);
  const finalTracks = [];

  for (let i = 0; i < SONGS.length; i++) {
    const s = SONGS[i];
    console.log(`[${i + 1}/${SONGS.length}] Querying pure Topic: ${s.title} - ${s.artist}`);
    const track = await getPureTopicTrack(s);
    if (!track) {
      throw new Error(`Failed to find embeddable pure audio track for: ${s.title}`);
    }
    console.log(`  -> Selected: ${track.youtubeId} | ${track.sourceType} | Channel: ${track.channel}`);
    finalTracks.push(track);
  }

  // Generate src/lib/music.ts
  const tsContent = `export interface AttachedSong {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  thumbnail: string;
  duration?: number;
}

export const CURATED_SONGS: AttachedSong[] = ${JSON.stringify(
    finalTracks.map(({ sourceType, channel, ...rest }) => rest),
    null,
    2
  )};
`;

  fs.writeFileSync('./src/lib/music.ts', tsContent, 'utf-8');
  fs.writeFileSync('./scratch/topic_tracks_result.json', JSON.stringify(finalTracks, null, 2), 'utf-8');
  console.log('\n✅ Successfully refreshed src/lib/music.ts with pure Topic tracks!');

  console.table(finalTracks.map((t, idx) => ({
    '#': idx + 1,
    Title: t.title,
    Artist: t.artist,
    YouTubeID: t.youtubeId,
    Duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`,
    Channel: t.channel,
    Type: t.sourceType.includes('Topic') ? 'Topic Track' : 'Clean Studio Master'
  })));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
