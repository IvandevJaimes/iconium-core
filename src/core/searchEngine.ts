import levenshtein from "fast-levenshtein";
import { ICON_INDEX } from "../data/icons";
import { getSvgContent } from "../data/icons/index";
import iconManifest from "../data/icons/manifest.json";
import type { SearchOptions, SearchResult } from "../types";

interface IconData {
  title: string;
  slug: string;
  hex: string;
  filename: string;
}

const ICON_MANIFEST = iconManifest as IconData[];

const normalize = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim();
const cleanQuery = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

const similarity = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein.get(a, b) / maxLen;
};

// Special queries that need exact match
const specialExact: Record<string, string> = {
  "c++": "cplusplus",
  "c#": "csharp",
};

const getIconData = (
  index: number,
): { title: string; slug: string; hex: string } => {
  const icon = ICON_MANIFEST[index];
  if (!icon) return { title: "", slug: "", hex: "" };
  return { title: icon.title, slug: icon.slug, hex: icon.hex };
};

const extractPathFromSvg = (svgString: string): string => {
  const match = svgString.match(/d="([^"]+)"/);
  return match ? match[1] : "";
};

export const searchIcon = (
  query: string,
  options: SearchOptions = {},
): { results: SearchResult[]; total: number; page: number; limit: number } => {
  const { limit = 10, page = 0 } = options;

  if (!query?.trim()) return { results: [], total: 0, page, limit };

  // Special exact matches first
  if (specialExact[query]) {
    const targetSlug = specialExact[query];
    const icon = ICON_MANIFEST.find((i) => i.slug === targetSlug);
    if (icon) {
      return {
        results: [
          { name: icon.title, slug: icon.slug, hex: icon.hex, score: 1.0 },
        ],
        total: 1,
        page: 0,
        limit: 1,
      };
    }
  }

  const normalizedQuery = normalize(query);
  const cleanQ = cleanQuery(query);

  // Short queries (1-2 chars) - use prefix/abbreviation matching
  if (cleanQ.length <= 2) {
    const abbrevs: Record<string, string> = {
      go: "go",
      rs: "rust",
      cpp: "cplusplus",
    };

    if (abbrevs[cleanQ]) {
      const icon = ICON_MANIFEST.find((i) => i.slug === abbrevs[cleanQ]);
      if (icon) {
        return {
          results: [
            { name: icon.title, slug: icon.slug, hex: icon.hex, score: 1.0 },
          ],
          total: 1,
          page: 0,
          limit: 1,
        };
      }
    }

    // Fallback: prefix match
    const results = ICON_MANIFEST.map((icon) => ({ icon }))
      .filter(({ icon }) => icon.title.toLowerCase().startsWith(cleanQ))
      .sort((a, b) => a.icon.title.length - b.icon.title.length)
      .slice(0, limit)
      .map(({ icon }) => ({
        name: icon.title,
        slug: icon.slug,
        hex: icon.hex,
        score: 1.0 - (icon.title.length - cleanQ.length) * 0.05,
      }));

    return { results, total: results.length, page, limit };
  }

  // Normal queries - use Levenshtein for scoring
  const scored = ICON_INDEX.map((iconData, index) => {
    const name = iconData.N;
    const nameClean = name.replace(/\s/g, "");

    // Check if starts with query (highest priority)
    if (name.startsWith(normalizedQuery) || nameClean.startsWith(cleanQ)) {
      return { index, score: 0.95 };
    }

    // Check if contains query
    if (name.includes(normalizedQuery) || nameClean.includes(cleanQ)) {
      return { index, score: 0.85 };
    }

    // Check if has all characters in sequence (for typos like jvscrpt → javascript)
    let hasAllChars = true;
    let firstCharMatch = false;
    let lastMatchIdx = -1;

    for (let i = 0; i < cleanQ.length; i++) {
      const c = cleanQ[i];
      const idx = nameClean.indexOf(c, lastMatchIdx + 1);
      if (idx === -1) {
        hasAllChars = false;
        break;
      }
      if (i === 0 && idx === 0) firstCharMatch = true;
      lastMatchIdx = idx;
    }

    if (hasAllChars) {
      // Higher score if first char matches at start
      const score = firstCharMatch ? 0.88 : 0.75;
      return { index, score };
    }

    // Levenshtein similarity
    const sim = similarity(cleanQ, nameClean);
    return { index, score: sim };
  });

  // Sort and paginate
  scored.sort((a, b) => b.score - a.score);
  const total = scored.length;
  const paged = scored.slice(page * limit, page * limit + limit);

  const results = paged.map(({ index, score }) => {
    const iconData = getIconData(index);
    return {
      name: iconData.title,
      slug: iconData.slug,
      hex: iconData.hex,
      score: Math.round(score * 100) / 100,
    };
  });

  return { results, total, page, limit };
};

export const getIconBySlug = (slug: string) => {
  const icon = ICON_MANIFEST.find((i) => i.slug === slug);
  if (!icon) return null;
  const svgContent = getSvgContent(icon.filename);
  return {
    title: icon.title,
    slug: icon.slug,
    hex: icon.hex,
    svg: svgContent || "",
    path: extractPathFromSvg(svgContent || ""),
  };
};
