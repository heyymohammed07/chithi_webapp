const fs = require('fs');

const SONGS = [
  {
    id: "iPe2K-RRcT8",
    youtubeId: "iPe2K-RRcT8",
    title: "Jao Pakhi Bolo Tare",
    artist: "Krishnokoli Chandrabindoo",
    thumbnail: "https://i.ytimg.com/vi/iPe2K-RRcT8/hq720.jpg",
    duration: 209,
    audioType: "Topic (Krishnokoli Islam - Topic)"
  },
  {
    id: "YFmpvovELEA",
    youtubeId: "YFmpvovELEA",
    title: "Hoyto Tomari Jonno",
    artist: "Manna Dey",
    thumbnail: "https://i.ytimg.com/vi/YFmpvovELEA/hq720.jpg",
    duration: 210,
    audioType: "Topic (Manna Dey - Topic)"
  },
  {
    id: "TCSTrhYPsdM",
    youtubeId: "TCSTrhYPsdM",
    title: "Chiro Odhora",
    artist: "Miftah Zaman",
    thumbnail: "https://i.ytimg.com/vi/TCSTrhYPsdM/hq720.jpg",
    duration: 394,
    audioType: "Official Audio (G Series Music)"
  },
  {
    id: "aFEPYpcmkEM",
    youtubeId: "aFEPYpcmkEM",
    title: "Ei Meghla Dine Ekla",
    artist: "Hemanta Mukherjee",
    thumbnail: "https://i.ytimg.com/vi/aFEPYpcmkEM/hq720.jpg",
    duration: 200,
    audioType: "Official Audio (Saregama Bengali)"
  },
  {
    id: "Rh_rom_0_0w",
    youtubeId: "Rh_rom_0_0w",
    title: "Tumi Ashbe Bole",
    artist: "Nachiketa Chakraborty",
    thumbnail: "https://i.ytimg.com/vi/Rh_rom_0_0w/hq720.jpg",
    duration: 267,
    audioType: "Official Audio"
  },
  {
    id: "NjGlJe1g2KM",
    youtubeId: "NjGlJe1g2KM",
    title: "Ki Name Deke Bolbo Tomake",
    artist: "Shyamal Mitra",
    thumbnail: "https://i.ytimg.com/vi/NjGlJe1g2KM/hq720.jpg",
    duration: 197,
    audioType: "Official Audio (Saregama Bengali)"
  },
  {
    id: "fhRpdpNqC4Y",
    youtubeId: "fhRpdpNqC4Y",
    title: "Pori",
    artist: "Bappa Mazumder",
    thumbnail: "https://i.ytimg.com/vi/fhRpdpNqC4Y/hq720.jpg",
    duration: 329,
    audioType: "Official Studio Audio"
  },
  {
    id: "F9DstkJDyXw",
    youtubeId: "F9DstkJDyXw",
    title: "Prem Tumi",
    artist: "Tahsan",
    thumbnail: "https://i.ytimg.com/vi/F9DstkJDyXw/hq720.jpg",
    duration: 357,
    audioType: "Official Studio Audio"
  },
  {
    id: "qb1HTyRAVV4",
    youtubeId: "qb1HTyRAVV4",
    title: "Chuye Dile Mon",
    artist: "Tahsan & Kona",
    thumbnail: "https://i.ytimg.com/vi/qb1HTyRAVV4/hq720.jpg",
    duration: 245,
    audioType: "Official Studio Audio (The Orchard)"
  },
  {
    id: "t63E5gBDJXU",
    youtubeId: "t63E5gBDJXU",
    title: "Meghomilon",
    artist: "Tanjib Sarowar | Rafa",
    thumbnail: "https://i.ytimg.com/vi/t63E5gBDJXU/hq720.jpg",
    duration: 236,
    audioType: "Official Audio"
  },
  {
    id: "8A9Kle9evKY",
    youtubeId: "8A9Kle9evKY",
    title: "Dube Dube",
    artist: "Habib Wahid",
    thumbnail: "https://i.ytimg.com/vi/8A9Kle9evKY/hq720.jpg",
    duration: 311,
    audioType: "Official Studio Audio"
  },
  {
    id: "wxwm1K0UTZo",
    youtubeId: "wxwm1K0UTZo",
    title: "Ga Chuye Bolo",
    artist: "Habib Wahid",
    thumbnail: "https://i.ytimg.com/vi/wxwm1K0UTZo/hq720.jpg",
    duration: 220,
    audioType: "Official Studio Audio"
  },
  {
    id: "gZtHQtRF12I",
    youtubeId: "gZtHQtRF12I",
    title: "Bolna",
    artist: "Hridoy Khan",
    thumbnail: "https://i.ytimg.com/vi/gZtHQtRF12I/hq720.jpg",
    duration: 368,
    audioType: "Official Studio Audio"
  },
  {
    id: "IWAke2_ogeI",
    youtubeId: "IWAke2_ogeI",
    title: "Bhalobasbo Basbo Re",
    artist: "Habib Wahid",
    thumbnail: "https://i.ytimg.com/vi/IWAke2_ogeI/hq720.jpg",
    duration: 293,
    audioType: "Official Studio Audio (Habib Music)"
  },
  {
    id: "F0_jwKzCDC0",
    youtubeId: "F0_jwKzCDC0",
    title: "Srotoshini",
    artist: "Encore",
    thumbnail: "https://i.ytimg.com/vi/F0_jwKzCDC0/hq720.jpg",
    duration: 242,
    audioType: "Official Audio"
  },
  {
    id: "D8YEkMjNumE",
    youtubeId: "D8YEkMjNumE",
    title: "Alo",
    artist: "Tahsan",
    thumbnail: "https://i.ytimg.com/vi/D8YEkMjNumE/hq720.jpg",
    duration: 181,
    audioType: "Official Audio"
  },
  {
    id: "qw1CVt43VKw",
    youtubeId: "qw1CVt43VKw",
    title: "Aniket Prantor",
    artist: "Artcell",
    thumbnail: "https://i.ytimg.com/vi/qw1CVt43VKw/hq720.jpg",
    duration: 981,
    audioType: "Official Audio (G Series Music)"
  },
  {
    id: "8AIm7wxavAM",
    youtubeId: "8AIm7wxavAM",
    title: "Jhoom",
    artist: "Minar Rahman",
    thumbnail: "https://i.ytimg.com/vi/8AIm7wxavAM/hq720.jpg",
    duration: 275,
    audioType: "Official Studio Audio (Minar Rahman)"
  },
  {
    id: "AgfMv0e1Hy8",
    youtubeId: "AgfMv0e1Hy8",
    title: "Se Je Boshe Ache",
    artist: "Arnob",
    thumbnail: "https://i.ytimg.com/vi/AgfMv0e1Hy8/hq720.jpg",
    duration: 228,
    audioType: "Topic (Black - Topic)"
  },
  {
    id: "Y7Mh5KkGW5U",
    youtubeId: "Y7Mh5KkGW5U",
    title: "Bhalo Achi Bhalo Theko",
    artist: "Subir Nandi",
    thumbnail: "https://i.ytimg.com/vi/Y7Mh5KkGW5U/hq720.jpg",
    duration: 352,
    audioType: "Official Studio Soundtrack Audio"
  },
  {
    id: "Dj4LEjcSWT8",
    youtubeId: "Dj4LEjcSWT8",
    title: "Utshorgo",
    artist: "Shironamhin",
    thumbnail: "https://i.ytimg.com/vi/Dj4LEjcSWT8/hq720.jpg",
    duration: 286,
    audioType: "Topic (Tasnif Zaman - Topic)"
  },
  {
    id: "JJR_-oaUjWI",
    youtubeId: "JJR_-oaUjWI",
    title: "Jodi Abar",
    artist: "Angel Noor",
    thumbnail: "https://i.ytimg.com/vi/JJR_-oaUjWI/hq720.jpg",
    duration: 256,
    audioType: "Official Audio (Angel Noor)"
  },
  {
    id: "sjRZJByUGGg",
    youtubeId: "sjRZJByUGGg",
    title: "Bhalobasha Tarpor",
    artist: "Arnob",
    thumbnail: "https://i.ytimg.com/vi/sjRZJByUGGg/hq720.jpg",
    duration: 280,
    audioType: "Topic (ArnoB - Topic)"
  },
  {
    id: "VLRb85zw3Bs",
    youtubeId: "VLRb85zw3Bs",
    title: "Onno Groher Chand",
    artist: "Shironamhin",
    thumbnail: "https://i.ytimg.com/vi/VLRb85zw3Bs/hq720.jpg",
    duration: 181,
    audioType: "Official Studio Audio"
  },
  {
    id: "zI_e4m4j8vw",
    youtubeId: "zI_e4m4j8vw",
    title: "Khola Janala",
    artist: "Feedback",
    thumbnail: "https://i.ytimg.com/vi/zI_e4m4j8vw/hq720.jpg",
    duration: 339,
    audioType: "Topic (Feedback - Topic)"
  },
  {
    id: "Bx9shXiV-3g",
    youtubeId: "Bx9shXiV-3g",
    title: "Shudhu Tomake",
    artist: "Warfaze",
    thumbnail: "https://i.ytimg.com/vi/Bx9shXiV-3g/hq720.jpg",
    duration: 336,
    audioType: "Official Studio Audio (Warfaze)"
  },
  {
    id: "eNdiaONyLoE",
    youtubeId: "eNdiaONyLoE",
    title: "Karone Okarone",
    artist: "Minar Rahman",
    thumbnail: "https://i.ytimg.com/vi/eNdiaONyLoE/hq720.jpg",
    duration: 316,
    audioType: "Official Audio"
  },
  {
    id: "uB2rhjulY4Q",
    youtubeId: "uB2rhjulY4Q",
    title: "Purnota",
    artist: "Warfaze",
    thumbnail: "https://i.ytimg.com/vi/uB2rhjulY4Q/hq720.jpg",
    duration: 360,
    audioType: "Official Studio Audio (Warfaze)"
  },
  {
    id: "sqJ2QhjBQaw",
    youtubeId: "sqJ2QhjBQaw",
    title: "Long Distance Love",
    artist: "Coke Studio Bangla | Ankan X Afrin",
    thumbnail: "https://i.ytimg.com/vi/sqJ2QhjBQaw/hq720.jpg",
    duration: 286,
    audioType: "Official Studio Audio (Coke Studio Bangla)"
  },
  {
    id: "t-jgya0qcpA",
    youtubeId: "t-jgya0qcpA",
    title: "Deyale Deyale",
    artist: "Minar Rahman",
    thumbnail: "https://i.ytimg.com/vi/t-jgya0qcpA/hq720.jpg",
    duration: 304,
    audioType: "Official Studio Audio (Minar Rahman)"
  },
  {
    id: "IHLja3bLaF8",
    youtubeId: "IHLja3bLaF8",
    title: "Nitol Paye",
    artist: "Fuad ft. Rajib",
    thumbnail: "https://i.ytimg.com/vi/IHLja3bLaF8/hq720.jpg",
    duration: 277,
    audioType: "Topic (Fuad - Topic)"
  },
  {
    id: "ZQgcBpfXdDs",
    youtubeId: "ZQgcBpfXdDs",
    title: "Hoyto Tomari Jonno",
    artist: "Miftah Zaman",
    thumbnail: "https://i.ytimg.com/vi/ZQgcBpfXdDs/hq720.jpg",
    duration: 201,
    audioType: "Official Studio Audio (Saregama Open Stage)"
  },
  {
    id: "KAn1SIGQrME",
    youtubeId: "KAn1SIGQrME",
    title: "Shudhu Tomake",
    artist: "FRANKLIN",
    thumbnail: "https://i.ytimg.com/vi/KAn1SIGQrME/hq720.jpg",
    duration: 276,
    audioType: "Official Audio (FRANKLIN)"
  }
];

async function run() {
  console.log('Verifying all 33 tracks against YouTube oEmbed...');
  for (let i = 0; i < SONGS.length; i++) {
    const s = SONGS[i];
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${s.youtubeId}&format=json`);
    if (res.status !== 200) {
      throw new Error(`Track ${s.title} (${s.youtubeId}) failed oEmbed with status ${res.status}`);
    }
  }
  console.log('✅ ALL 33 TRACKS 100% EMBEDDABLE (Status 200 OK)!');

  // Format TypeScript
  const tsContent = `export interface AttachedSong {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  thumbnail: string;
  duration?: number;
}

export const CURATED_SONGS: AttachedSong[] = ${JSON.stringify(
    SONGS.map(({ audioType, ...rest }) => rest),
    null,
    2
  )};
`;

  fs.writeFileSync('./src/lib/music.ts', tsContent, 'utf-8');
  console.log('✅ Successfully updated src/lib/music.ts!');

  console.log('\nSUMMARY TABLE:');
  console.table(SONGS.map((s, idx) => ({
    '#': idx + 1,
    Title: s.title,
    Artist: s.artist,
    YouTubeID: s.youtubeId,
    Duration: `${Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(2, '0')}`,
    AudioType: s.audioType
  })));
}

run().catch(console.error);
