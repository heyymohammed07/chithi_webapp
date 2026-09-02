const ytSearch = require('yt-search');

const targets = [
  { title: "Jhoom", artist: "Minar Rahman" },
  { title: "Bhalo Achi Bhalo Theko", artist: "Subir Nandi" },
  { title: "Onno Groher Chand", artist: "Shironamhin" },
  { title: "Khola Janala", artist: "Feedback" },
  { title: "Dube Dube", artist: "Habib Wahid" },
  { title: "Ga Chuye Bolo", artist: "Habib Wahid" },
  { title: "Pori", artist: "Bappa Mazumder" },
  { title: "Prem Tumi", artist: "Tahsan" },
  { title: "Shudhu Tomake", artist: "Warfaze" },
  { title: "Purnota", artist: "Warfaze" }
];

async function checkEmbed(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    return res.status === 200;
  } catch {
    return false;
  }
}

async function refine() {
  for (const t of targets) {
    console.log(`\nRefining: ${t.title} by ${t.artist}`);
    const queries = [
      `"${t.title}" "${t.artist}"`,
      `${t.title} ${t.artist} Topic`,
      `${t.title} ${t.artist} Audio`,
      `${t.title} ${t.artist}`
    ];
    for (const q of queries) {
      const r = await ytSearch(q);
      for (const v of (r.videos || []).slice(0, 5)) {
        const title = v.title.toLowerCase();
        const author = (v.author?.name || '').toLowerCase();
        const isMV = title.includes('official music video') || title.includes('official video') || title.includes('short film') || title.includes('drama');
        const isRemix = title.includes('remix') || title.includes('lofi') || title.includes('slowed');
        const embeddable = await checkEmbed(v.videoId);
        console.log(`  [${embeddable ? 'OK' : 'ERR'}] ${v.videoId} | ${v.title} | ${v.author?.name} | Duration: ${v.seconds}s | MV: ${isMV} | Remix: ${isRemix}`);
      }
    }
  }
}

refine().catch(console.error);
