const fs = require('fs');

function cleanTitle(title) {
  return title
    .replace(/\|\s*Audio\s*\|.*/i, '')
    .replace(/\|\s*Lyrics\s*\|.*/i, '')
    .replace(/\|\s*Bangla\s*New.*/i, '')
    .replace(/\|\s*Coke\s*Studio.*/i, '')
    .replace(/\|\s*#\w+.*/i, '')
    .replace(/With\s*Lyrics\s*\|.*/i, '')
    .replace(/Lyrics\s*Video\s*\|.*/i, '')
    .replace(/Guitar\s*Cover\s*By.*/i, '')
    .replace(/@\w+\s*topic.*/i, '')
    .replace(/-\s*Topic/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const currentFile = fs.readFileSync('./src/lib/music.ts', 'utf-8');
const idMatches = [...currentFile.matchAll(/id:\s*"([^"]+)",\s*youtubeId:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*artist:\s*"([^"]+)",\s*thumbnail:\s*"([^"]+)"/g)];

const songs = idMatches.map(m => ({
  id: m[1],
  youtubeId: m[2],
  title: cleanTitle(m[3]),
  artist: m[4].replace(/- Topic/gi, '').trim(),
  thumbnail: m[5]
}));

const output = `export interface AttachedSong {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  thumbnail: string;
  duration?: number;
}

export const CURATED_SONGS: AttachedSong[] = [
${songs.map(s => `  {
    id: "${s.id}",
    youtubeId: "${s.youtubeId}",
    title: "${s.title.replace(/"/g, '\\"')}",
    artist: "${s.artist.replace(/"/g, '\\"')}",
    thumbnail: "${s.thumbnail}"
  }`).join(',\n')}
];
`;

fs.writeFileSync('./src/lib/music.ts', output, 'utf-8');
console.log('Cleaned up titles in src/lib/music.ts!');
