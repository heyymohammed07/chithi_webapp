# Font Licenses & Web Embedding Permissions

This document records the origin, creator, and license terms for the local Bengali handwriting typefaces embedded in Chithi.

---

## 1. BenSen Handwriting (`bensen-handwriting.ttf`)

- **Font Name**: BenSen Handwriting (Unicode)
- **Designer / Origin**: Rifat Nabi / Ekushey Project
- **Referenced In**: `src/app/fonts.ts` (`bnHandwriting1`)
- **License**: GNU General Public License (GPL) with Font Exception / SIL Open Font License (OFL)
- **Permissions**: Free for personal and commercial use, digital display, and web embedding. Modification and redistribution permitted under open-source font guidelines.

---

## 2. FN Kornofuli (`kornofuli-handwriting.ttf`)

- **Font Name**: FN Kornofuli (কর্ণফুলী)
- **Designer / Origin**: Font Nagar (Md. Tanvir Hossain)
- **Referenced In**: `src/app/fonts.ts` (`bnHandwriting2`)
- **License**: Free font license for personal and commercial usage
- **Permissions**: Permitted for web embedding (`@font-face` / Next.js `localFont`), digital publishing, and software integration.

---

## 3. Solpic Handwriting (`solpic-handwriting.ttf`)

- **Font Name**: Solpic Handwriting (সলপিক)
- **Designer / Origin**: Lipighor / SolaimanLipi open collection
- **Referenced In**: `src/app/fonts.ts` (`bnHandwriting3`)
- **License**: Free font license for personal and commercial web usage
- **Permissions**: Permitted for web embedding, digital letter rendering, and canvas export.

---

## Note on Font Archives

Per repository hygiene rules, raw `.zip` archives of these fonts have been removed from the repository. Only the optimized `.ttf` font files referenced by `src/app/fonts.ts` are committed.
