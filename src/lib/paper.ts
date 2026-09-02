import { PaperStyleId, StampId, FontId } from "./types";

export interface FontDefinition {
  id: FontId;
  name: string;
  nameBn: string;
  fontVar: string;
  sample: string;
  sampleEn: string;
}

export const FONTS: Record<FontId, FontDefinition> = {
  handwriting1: {
    id: "handwriting1",
    name: "Cursive",
    nameBn: "চারুলিপি",
    fontVar: "var(--font-bn-hand-1), var(--font-calligraphy), cursive",
    sample: "আমার চিঠি",
    sampleEn: "Dear Secret",
  },
  handwriting2: {
    id: "handwriting2",
    name: "Diary Note",
    nameBn: "স্মৃতিকথা",
    fontVar: "var(--font-bn-hand-2), var(--font-hand), cursive",
    sample: "মনের কথা",
    sampleEn: "Heartfelt",
  },
  handwriting3: {
    id: "handwriting3",
    name: "Scribble",
    nameBn: "কথকতা",
    fontVar: "var(--font-bn-hand-3), var(--font-pencil), cursive",
    sample: "ভালোবাসা",
    sampleEn: "Untold Tale",
  },
  typewriter: {
    id: "typewriter",
    name: "Typewriter",
    nameBn: "টাইপরাইটার",
    fontVar: "var(--font-typewriter), var(--font-mono-paper), monospace",
    sample: "চিঠি ০৭/২৪",
    sampleEn: "Letter 07",
  },
  serif: {
    id: "serif",
    name: "Classic Serif",
    nameBn: "চিরায়ত",
    fontVar: "var(--font-bn-paper), var(--font-display), serif",
    sample: "চিরন্তন",
    sampleEn: "Evergreen",
  },
  // Backward compatibility aliases
  calligraphy: {
    id: "calligraphy",
    name: "Cursive",
    nameBn: "চারুলিপি",
    fontVar: "var(--font-bn-hand-1), var(--font-calligraphy), cursive",
    sample: "আমার চিঠি",
    sampleEn: "Dear Secret",
  },
  casual: {
    id: "casual",
    name: "Diary Note",
    nameBn: "স্মৃতিকথা",
    fontVar: "var(--font-bn-hand-2), var(--font-hand), cursive",
    sample: "মনের কথা",
    sampleEn: "Heartfelt",
  },
  pencil: {
    id: "pencil",
    name: "Scribble",
    nameBn: "কথকতা",
    fontVar: "var(--font-bn-hand-3), var(--font-pencil), cursive",
    sample: "ভালোবাসা",
    sampleEn: "Untold Tale",
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
  wax: { id: "wax", labelKey: "stamps.wax" },
  topSecret: { id: "topSecret", labelKey: "stamps.topSecret" },
  memory: { id: "memory", labelKey: "stamps.memory" },
  heartbreak: { id: "heartbreak", labelKey: "stamps.heartbreak" },
};

export const AVAILABLE_STAMPS: StampId[] = [
  "wax",
  "topSecret",
  "memory",
  "heartbreak",
];

export const AVAILABLE_PAPERS: PaperStyleId[] = [
  "parchment",
  "midnight",
  "rose",
  "typewriter",
  "rainy",
];

export function getDeterministicRotation(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash) % 1000;
  return (normalized / 1000) * 1.6 - 0.8;
}
