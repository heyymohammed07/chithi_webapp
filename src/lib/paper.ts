import { PaperStyleId, StampId, FontId } from "./types";

export interface FontDefinition {
  id: FontId;
  name: string;
  nameBn: string;
  fontVar: string;
  sample: string;
}

export const FONTS: Record<FontId, FontDefinition> = {
  handwriting1: {
    id: "handwriting1",
    name: "Cursive Calligraphy",
    nameBn: "হাতের লেখা ১ (চারুলিপি)",
    fontVar: "var(--font-bn-hand-1), var(--font-calligraphy), cursive",
    sample: "আমার গোপন চিঠি",
  },
  handwriting2: {
    id: "handwriting2",
    name: "Diary Nostalgia",
    nameBn: "হাতের লেখা ২ (স্মৃতিকথা)",
    fontVar: "var(--font-bn-hand-2), var(--font-hand), cursive",
    sample: "মনের না বলা কথা",
  },
  handwriting3: {
    id: "handwriting3",
    name: "Everyday Scribble",
    nameBn: "হাতের লেখা ৩ (কথকতা)",
    fontVar: "var(--font-bn-hand-3), var(--font-pencil), cursive",
    sample: "ভালোবাসার এক টুকরো চিঠি",
  },
  typewriter: {
    id: "typewriter",
    name: "Mechanical Typewriter",
    nameBn: "টাইপরাইটার (নস্টালজিয়া)",
    fontVar: "var(--font-mono-paper), monospace",
    sample: "চিঠি ০৭/২৪",
  },
  serif: {
    id: "serif",
    name: "Classic Print Serif",
    nameBn: "মুদ্রণ লিপি (চিরায়ত)",
    fontVar: "var(--font-bn-paper), var(--font-display), serif",
    sample: "চিরন্তন চিঠি",
  },
  // Backward compatibility aliases
  calligraphy: {
    id: "calligraphy",
    name: "Cursive Calligraphy",
    nameBn: "হাতের লেখা ১ (চারুলিপি)",
    fontVar: "var(--font-bn-hand-1), var(--font-calligraphy), cursive",
    sample: "আমার গোপন চিঠি",
  },
  casual: {
    id: "casual",
    name: "Diary Nostalgia",
    nameBn: "হাতের লেখা ২ (স্মৃতিকথা)",
    fontVar: "var(--font-bn-hand-2), var(--font-hand), cursive",
    sample: "মনের না বলা কথা",
  },
  pencil: {
    id: "pencil",
    name: "Everyday Scribble",
    nameBn: "হাতের লেখা ৩ (কথকতা)",
    fontVar: "var(--font-bn-hand-3), var(--font-pencil), cursive",
    sample: "ভালোবাসার এক টুকরো চিঠি",
  },
};

export const AVAILABLE_FONTS: FontId[] = [
  "handwriting1",
  "handwriting2",
  "handwriting3",
  "typewriter",
  "serif",
];

export interface PaperDefinition {
  id: PaperStyleId;
  labelKey: string;
  defaultFont: FontId;
  inkColor: string;
  baseColor: string;
  previewSwatch: string;
}

export const PAPERS: Record<PaperStyleId, PaperDefinition> = {
  parchment: {
    id: "parchment",
    labelKey: "papers.parchment",
    defaultFont: "handwriting2",
    inkColor: "#2D2522",
    baseColor: "#F5ECD8",
    previewSwatch: "bg-[#F5ECD8] border-[#EBE3D5]",
  },
  midnight: {
    id: "midnight",
    labelKey: "papers.midnight",
    defaultFont: "handwriting1",
    inkColor: "#E5BC8B",
    baseColor: "#1A1722",
    previewSwatch: "bg-[#1A1722] border-[#2D2522]",
  },
  rose: {
    id: "rose",
    labelKey: "papers.rose",
    defaultFont: "handwriting1",
    inkColor: "#4A2729",
    baseColor: "#F8EBEA",
    previewSwatch: "bg-[#F8EBEA] border-[#E8DEF8]",
  },
  typewriter: {
    id: "typewriter",
    labelKey: "papers.typewriter",
    defaultFont: "typewriter",
    inkColor: "#28241D",
    baseColor: "#F3EBD9",
    previewSwatch: "bg-[#F3EBD9] border-[#EBE3D5]",
  },
  rainy: {
    id: "rainy",
    labelKey: "papers.rainy",
    defaultFont: "handwriting3",
    inkColor: "#E2E8F0",
    baseColor: "#202730",
    previewSwatch: "bg-[#202730] border-[#E0F2FE]",
  },
};

export interface StampDefinition {
  id: StampId;
  labelKey: string;
}

export const STAMPS: Record<StampId, StampDefinition> = {
  wax: {
    id: "wax",
    labelKey: "stamps.wax",
  },
  topSecret: {
    id: "topSecret",
    labelKey: "stamps.topSecret",
  },
  memory: {
    id: "memory",
    labelKey: "stamps.memory",
  },
  heartbreak: {
    id: "heartbreak",
    labelKey: "stamps.heartbreak",
  },
};

/**
 * Deterministic pseudo-random rotation angle (-3.5deg to +3.5deg) based on letter ID or string.
 * Prevents jitter on component re-renders.
 */
export function getDeterministicRotation(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 70) / 10 - 3.5;
  return Number(normalized.toFixed(1));
}
