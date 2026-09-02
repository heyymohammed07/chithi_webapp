const ytSearch = require('yt-search');
const fs = require('fs');

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

async function findCleanAudio(song) {
  const queries = [
    `${song.title} ${song.artist} Topic`,
    `${song.title} ${song.artist} Official Audio`,
    `${song.title} ${song.artist} Audio`,
    `${song.title} Topic`
  ];

  const blacklistRegex = /official music video|short film|natok|drama|telefilm|teaser|trailer|reaction|status|cover by|dance/i;

  for (const q of queries) {
    const r = await ytSearch(q);
    const videos = r.videos || [];

    for (const v of videos) {
      // Clean checks
      const title = v.title;
      const author = v.author?.name || '';
      
      if (blacklistRegex.test(title)) continue;
      
      // Is topic or official audio or pure audio
      const isTopic = author.includes('Topic') || title.toLowerCase().includes('topic');
      const isAudio = title.toLowerCase().includes('audio') || title.toLowerCase().includes('lyric') || title.toLowerCase().includes('soundtrack') || isTopic;

      const embeddable = await checkEmbed(v.videoId);
      if (!embeddable) continue;

      return {
        videoId: v.videoId,
        title: v.title,
        author: author,
        duration: v.seconds,
        audioType: isTopic ? 'Topic' : (isAudio ? 'Official Audio' : 'Clean Studio Audio')
      };
    }
  }

  // Fallback: search general
  const fallback = await ytSearch(`${song.title} ${song.artist}`);
  for (const v of (fallback.videos || [])) {
    if (await checkEmbed(v.videoId)) {
      return {
        videoId: v.videoId,
        title: v.title,
        author: v.author?.name || '',
        duration: v.seconds,
        audioType: 'Clean Audio'
      };
    }
  }

  return null;
}

async function main() {
  console.log(`Auditing and finding clean studio audio / topic tracks for ${SONGS.length} songs...`);
  const results = [];

  for (let i = 0; i < SONGS.length; i++) {
    const s = SONGS[i];
    console.log(`[${i+1}/${SONGS.length}] Searching: ${s.title} - ${s.artist}`);
    const match = await findCleanAudio(s);
    if (match) {
      console.log(`  -> Found: ${match.videoId} | ${match.audioType} | ${match.title} (${match.author})`);
      results.push({
        id: match.videoId,
        youtubeId: match.videoId,
        title: s.title,
        artist: s.artist,
        thumbnail: `https://i.ytimg.com/vi/${match.videoId}/hq720.jpg`,
        duration: match.duration,
        audioType: match.audioType,
        channel: match.author
      });
    } else {
      console.warn(`  ❌ No match found for ${s.title}`);
    }
  }

  fs.writeFileSync('./scratch/clean_songs_result.json', JSON.stringify(results, null, 2));
  console.log('Finished! Results saved to scratch/clean_songs_result.json');
}

main().catch(console.error);
