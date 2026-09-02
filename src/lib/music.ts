export interface AttachedSong {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  thumbnail: string;
  duration?: number;
}

export const DYNAMIC_DISCOVERY_POOLS = [
  // 90s & 2000s Golden Era Nostalgia
  "Tahsan topic audio",
  "Habib Wahid topic audio",
  "Hridoy Khan topic audio",
  "Bappa Mazumder topic audio",
  "Arnob topic audio",
  "Minar Rahman topic audio",
  "Tanjib Sarowar topic audio",
  "Fuad Almuqtadir topic audio",

  // Iconic Bands & Soft Rock Legends
  "Warfaze topic audio",
  "Shironamhin topic audio",
  "Artcell topic audio",
  "Miles bangla band topic audio",
  "LRB bangla band topic audio",
  "Feedback bangla band topic audio",
  "Aurthohin topic audio",
  "Nemesis bangla topic audio",
  "Fossils bangla band topic audio",
  "Cactus bangla band topic audio",
  "Chandrabindoo band topic audio",
  "Lakkhichhara topic audio",

  // Modern Melodic, Indie & Folk Fusion
  "Coke Studio Bangla topic audio",
  "Anupam Roy bangla topic audio",
  "Lagnajita Chakraborty topic audio",
  "Somlata Acharyya topic audio",
  "Sahana Bajpaie topic audio",
  "Anjan Dutt topic audio",
  "Nachiketa Chakraborty topic audio",
  "Kabir Suman topic audio",
  "Meghdol topic audio",
  "Shunno band topic audio",

  // Broad Thematic Pools
  "bangla 90s 2000s pop nostalgia topic audio",
  "bangla acoustic hits topic audio",
  "bangla band classics topic audio",
  "bangla indie melodic classic topic",
  "bangla modern unplugged acoustic topic"
];

export const QUERY_SALTS = [
  "audio",
  "unplugged",
  "remastered",
  "acoustic",
  "album version",
  "original master",
  "studio session",
  "melody",
  "track",
];

// Initial bootstrap track for cold load before dynamic radio queue is primed
export const DEFAULT_RADIO_SONG: AttachedSong = {
  id: "iPe2K-RRcT8",
  youtubeId: "iPe2K-RRcT8",
  title: "Jao Pakhi Bolo Tare",
  artist: "Krishnokoli Islam",
  thumbnail: "https://i.ytimg.com/vi/iPe2K-RRcT8/hqdefault.jpg",
  duration: 209,
};
