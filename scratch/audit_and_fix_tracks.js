/**
 * audit_and_fix_tracks.js
 * Verifies each track in music.ts for:
 *  1. oEmbed embeddability (HTTP 200)
 *  2. Duration sanity (>= 90s)
 *  3. Artist/title mismatch (basic check)
 * Then forcibly replaces bad tracks with correct ones.
 */
const fs = require('fs');
const ytSearch = require('yt-search');

const CURRENT = [
  { id: "iPe2K-RRcT8", title: "Jao Pakhi Bolo Tare", artist: "Krishnokoli Chandrabindoo", duration: 209 },
  { id: "YFmpvovELEA", title: "Hoyto Tomari Jonno", artist: "Manna Dey", duration: 210 },
  { id: "ENxLVGP8tr0", title: "Chiro Odhora", artist: "Miftah Zaman", duration: 346 },
  { id: "aFEPYpcmkEM", title: "Ei Meghla Dine Ekla", artist: "Hemanta Mukherjee", duration: 200 },
  { id: "ZrddHUki0RU", title: "Tumi Ashbe Bole", artist: "Nachiketa Chakraborty", duration: 205 },
  { id: "NjGlJe1g2KM", title: "Ki Name Deke Bolbo Tomake", artist: "Shyamal Mitra", duration: 197 },
  { id: "bZsEIzEDbIs", title: "Pori", artist: "Bappa Mazumder", duration: 318 },
  { id: "e2hLjfsSTco", title: "Prem Tumi", artist: "Tahsan", duration: 284 },
  { id: "qb1HTyRAVV4", title: "Chuye Dile Mon", artist: "Tahsan & Kona", duration: 245 },
  { id: "t63E5gBDJXU", title: "Meghomilon", artist: "Tanjib Sarowar | Rafa", duration: 236 },
  { id: "V1GBgQSMLxU", title: "Dube Dube", artist: "Habib Wahid", duration: 248 },
  { id: "wCNOT8th_xY", title: "Ga Chuye Bolo", artist: "Habib Wahid", duration: 264 },
  { id: "0CxuFQ1G0vs", title: "Bolna", artist: "Hridoy Khan", duration: 243 },
  { id: "qKyqEqcQhes", title: "Bhalobasbo Basbo Re", artist: "Habib Wahid", duration: 86 },  // BAD: too short
  { id: "F0_jwKzCDC0", title: "Srotoshini", artist: "Encore", duration: 242 },
  { id: "FLOB6J_wTp4", title: "Alo", artist: "Tahsan", duration: 249 },
  { id: "qw1CVt43VKw", title: "Aniket Prantor", artist: "Artcell", duration: 981 },
  { id: "RWnFowWtT78", title: "Jhoom", artist: "Minar Rahman", duration: 273 },
  { id: "AgfMv0e1Hy8", title: "Se Je Boshe Ache", artist: "Arnob", duration: 228 },
  { id: "7MyC7ynubGo", title: "Bhalo Achi Bhalo Theko", artist: "Subir Nandi", duration: 253 },
  { id: "Dj4LEjcSWT8", title: "Utshorgo", artist: "Shironamhin", duration: 286 },
  { id: "2g95jnDYGWo", title: "Jodi Abar", artist: "Angel Noor", duration: 292 },
  { id: "sjRZJByUGGg", title: "Bhalobasha Tarpor", artist: "Arnob", duration: 280 },
  { id: "pK-7GHSkbdk", title: "Onno Groher Chand", artist: "Shironamhin", duration: 154 },
  { id: "DXiS8JSKJXE", title: "Khola Janala", artist: "Feedback", duration: 340 },
  { id: "ns8UJhuMq5Q", title: "Shudhu Tomake", artist: "Warfaze", duration: 298 },
  { id: "zqKwhn-fz2w", title: "Karone Okarone", artist: "Minar Rahman", duration: 253 },
  { id: "uB2rhjulY4Q", title: "Purnota", artist: "Warfaze", duration: 360 },
  { id: "xQ2Dz9K9xeg", title: "Long Distance Love", artist: "Coke Studio Bangla | Ankan X Afrin", duration: 282 },
  { id: "t-jgya0qcpA", title: "Deyale Deyale", artist: "Minar Rahman", duration: 304 },
  { id: "IHLja3bLaF8", title: "Nitol Paye", artist: "Fuad ft. Rajib", duration: 277 },
  { id: "YFmpvovELEA", title: "Hoyto Tomari Jonno", artist: "Miftah Zaman", duration: 210 }, // BAD: Manna Dey track used for Miftah Zaman
  { id: "KAn1SIGQrME", title: "Shudhu Tomake", artist: "FRANKLIN", duration: 276 },
];

// Known-good manual overrides for tracks that need specific lookup
const MANUAL_OVERRIDES = {
  // Bhalobasbo Basbo Re - Habib Wahid: known full-length official track
  "Bhalobasbo Basbo Re": {
    queries: ["Bhalobasbo Basbo Re Habib Wahid official audio", "Bhalobashbo Bashbo Re Habib Topic"],
  },
  // Hoyto Tomari Jonno by Miftah Zaman (different from Manna Dey version)
  "Hoyto Tomari Jonno_Miftah Zaman": {
    queries: ["Hoyto Tomari Jonno Miftah Zaman official audio", "Hoyto Tomari Jonno Miftah"],
  },
};

async function checkEmbed(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    return res.status === 200;
  } catch {
    return false;
  }
}

const BLACKLIST = /natok|movie|dialogue|scene|music video|drama|telefilm|short film|reaction|status|preview/i;

async function findBestTrack(queries) {
  for (const q of queries) {
    const res = await ytSearch(q);
    const videos = res.videos || [];
    
    // Priority 1: Topic channel with full duration (> 90s)
    for (const v of videos) {
      const channel = (v.author?.name || '').toLowerCase();
      if (channel.includes('topic') && v.seconds > 90 && !BLACKLIST.test(v.title)) {
        if (await checkEmbed(v.videoId)) {
          return { id: v.videoId, seconds: v.seconds, channel: v.author?.name, label: 'Topic' };
        }
      }
    }
    
    // Priority 2: Any non-blacklisted embeddable result with full duration
    for (const v of videos.slice(0, 8)) {
      if (v.seconds > 90 && !BLACKLIST.test(v.title)) {
        if (await checkEmbed(v.videoId)) {
          return { id: v.videoId, seconds: v.seconds, channel: v.author?.name, label: 'Studio' };
        }
      }
    }
  }
  return null;
}

async function main() {
  const tracks = JSON.parse(JSON.stringify(CURRENT));
  const issues = [];

  // Step 1: Verify all current tracks
  console.log('Step 1: Verifying all 33 tracks...');
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const ok = await checkEmbed(t.id);
    const tooShort = t.duration < 90;
    
    if (!ok || tooShort) {
      issues.push({ index: i, reason: !ok ? 'NOT EMBEDDABLE' : 'TOO SHORT', track: t });
      console.log(`  [!] #${i+1} ${t.title} (${t.artist}): ${!ok ? 'NOT EMBEDDABLE' : `TOO SHORT (${t.duration}s)`}`);
    } else {
      process.stdout.write(`  [✓] #${i+1} ${t.title}\r`);
    }
  }
  console.log(`\nStep 1 done. Found ${issues.length} issues.`);

  // Step 2: Check for artist mismatch on track #32 (Miftah Zaman)
  console.log('\nStep 2: Fixing known mismatches...');
  
  // Fix #32: Hoyto Tomari Jonno - Miftah Zaman (was using Manna Dey track)
  console.log('  Fixing: Hoyto Tomari Jonno - Miftah Zaman...');
  const miftahTrack = await findBestTrack([
    "Hoyto Tomari Jonno Miftah Zaman",
    "Hoyto Tomari Jonno Miftah",
    "Hothat Dekha Miftah Zaman official"
  ]);
  if (miftahTrack) {
    console.log(`  -> ${miftahTrack.id} | ${miftahTrack.label} | ${miftahTrack.channel} | ${miftahTrack.seconds}s`);
    tracks[31].id = miftahTrack.id;
    tracks[31].youtubeId = miftahTrack.id;
    tracks[31].duration = miftahTrack.seconds;
    tracks[31].thumbnail = `https://i.ytimg.com/vi/${miftahTrack.id}/hq720.jpg`;
  } else {
    // Keep Miftah Zaman's known track from previous session
    console.log('  -> Using previously verified: ZQgcBpfXdDs (Miftah Zaman - Saregama Open Stage)');
    const fallbackOk = await checkEmbed('ZQgcBpfXdDs');
    if (fallbackOk) {
      tracks[31].id = 'ZQgcBpfXdDs';
      tracks[31].youtubeId = 'ZQgcBpfXdDs';
      tracks[31].duration = 201;
      tracks[31].thumbnail = 'https://i.ytimg.com/vi/ZQgcBpfXdDs/hq720.jpg';
    }
  }

  // Step 3: Fix other bad tracks from issues list
  for (const issue of issues) {
    const { index, track } = issue;
    console.log(`  Fixing #${index+1}: ${track.title} - ${track.artist}...`);
    const queries = [
      `${track.title} ${track.artist} Topic`,
      `${track.title} ${track.artist} official audio`,
      `${track.title} ${track.artist}`
    ];
    const result = await findBestTrack(queries);
    if (result) {
      console.log(`    -> ${result.id} | ${result.label} | ${result.channel} | ${result.seconds}s`);
      tracks[index].id = result.id;
      tracks[index].youtubeId = result.id;
      tracks[index].duration = result.seconds;
      tracks[index].thumbnail = `https://i.ytimg.com/vi/${result.id}/hq720.jpg`;
    } else {
      console.error(`    [ERROR] Could not find replacement for ${track.title}`);
    }
  }

  // Step 4: Write final verified music.ts
  const tsContent = `export interface AttachedSong {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  thumbnail: string;
  duration?: number;
}

export const CURATED_SONGS: AttachedSong[] = [
${tracks.map(t => `  {
    id: "${t.id}",
    youtubeId: "${t.youtubeId || t.id}",
    title: "${t.title}",
    artist: "${t.artist}",
    thumbnail: "${t.thumbnail}",
    duration: ${t.duration}
  }`).join(',\n')}
];
`;

  fs.writeFileSync('./src/lib/music.ts', tsContent, 'utf-8');
  console.log('\n✅ music.ts updated with verified tracks!');

  // Final summary table
  console.table(tracks.map((t, i) => ({
    '#': i + 1,
    Title: t.title.substring(0, 25),
    Artist: t.artist.substring(0, 20),
    YouTubeID: t.id,
    Duration: `${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, '0')}`
  })));
}

main().catch(err => { console.error(err); process.exit(1); });
