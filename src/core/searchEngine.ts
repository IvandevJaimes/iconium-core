import { ICON_INDEX, INVERTED_INDEX, ICON_COUNT } from '../data/icons';
import { getSvgContent } from '../data/icons/index';
import iconManifest from '../data/icons/manifest.json';
import type { SearchOptions, SearchResult } from '../types';

const ICON_MANIFEST = iconManifest as Array<{ title: string; slug: string; hex: string; filename: string }>;
const invertedIndex = INVERTED_INDEX as unknown as Record<string, number[]>;

const normalize = (str: string): string => str.toLowerCase().replace(/[^a-z0-9]/g, ' ');
const splitCamelCase = (str: string): string => str.replace(/([a-z])([A-Z])/g, '$1 $2');

const tokenize = (str: string): string[] => {
  const normalized = normalize(str);
  return splitCamelCase(normalized).split(/\s+/).filter(Boolean);
};

const generateBigrams = (str: string): string[] => {
  if (str.length < 3) return [];
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) bigrams.push(str.slice(i, i + 2));
  return bigrams;
};

const calculateCharSequenceScore = (query: string, name: string): number => {
  let qi = 0, matchCount = 0;
  for (let i = 0; i < name.length && qi < query.length; i++) {
    if (name[i] === query[qi]) { qi++; matchCount++; }
  }
  if (qi !== query.length) return 0;
  return matchCount / name.length;
};

const levenshtein = (a: string, b: string): number => {
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
};

const stringSimilarity = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(a, b) / maxLen;
};

const getIconData = (index: number) => {
  const icon = ICON_MANIFEST[index];
  if (!icon) return { title: '', slug: '', hex: '' };
  return { title: icon.title, slug: icon.slug, hex: icon.hex };
};

const extractPathFromSvg = (svgString: string): string => {
  const match = svgString.match(/d="([^"]+)"/);
  return match ? match[1] : '';
};

export const searchIcon = (
  query: string,
  options: SearchOptions = {}
): { results: SearchResult[]; total: number; page: number; limit: number } => {
  const { limit = 10, page = 0 } = options;

  if (!query?.trim()) return { results: [], total: 0, page, limit };

  const normalizedQuery = normalize(query);
  const tokens = tokenize(query);
  const queryBigrams = tokens.flatMap(generateBigrams);

  if (!queryBigrams.length) return { results: [], total: 0, page, limit };

  const candidateScores = new Map<number, number>();
  queryBigrams.forEach(bigram => {
    const indices = invertedIndex[bigram];
    if (indices) indices.forEach(id => candidateScores.set(id, (candidateScores.get(id) || 0) + 1));
  });

  if (candidateScores.size < 5) {
    candidateScores.clear();
    ICON_INDEX.forEach((iconData, index) => {
      const sim = stringSimilarity(normalizedQuery, iconData.N);
      if (sim > 0.3) candidateScores.set(index, sim * 100);
    });
  }

  if (candidateScores.size < 2) return { results: [], total: 0, page, limit };

  const indicesToScore = candidateScores.size < 5
    ? [...Array(ICON_COUNT).keys()]
    : candidateScores.keys();

  const scoredResults: Array<{ index: number; score: number }> = [];

  for (const index of indicesToScore) {
    const iconData = ICON_INDEX[index];
    if (!iconData) continue;

    const normalizedName = iconData.N;
    let score = 0;

    if (normalizedName === normalizedQuery) score = 1.0;
    else if (normalizedName.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedName)) score = 0.95;
    else if (normalizedName.includes(' ' + normalizedQuery) || normalizedName.includes(normalizedQuery + ' ')) score = 0.9;
    else if (normalizedName.includes(normalizedQuery)) score = 0.85;
    else {
      const queryChars = normalizedQuery.replace(/\s/g, '');
      const nameChars = normalizedName.replace(/\s/g, '');
      if (nameChars.startsWith(queryChars[0])) {
        const charScore = calculateCharSequenceScore(queryChars, nameChars);
        if (charScore >= 0.8) score = charScore + 0.1;
      }
      if (score < 0.3) {
        const sim = stringSimilarity(normalizedQuery, normalizedName);
        score = Math.abs(normalizedQuery.length - normalizedName.length) <= 2 ? sim + 0.1 : sim;
      }
    }

    scoredResults.push({ index, score: Math.max(0, score) });
  }

  scoredResults.sort((a, b) => b.score - a.score);

  const total = scoredResults.length;
  const start = page * limit;
  const paged = scoredResults.slice(start, start + limit);

  const results = paged.map(({ index, score }) => {
    const iconData = getIconData(index);
    return { name: iconData.title, slug: iconData.slug, hex: iconData.hex, score: Math.round(score * 100) / 100 };
  });

  return { results, total, page, limit };
};

export const getIconBySlug = (slug: string) => {
  const icon = ICON_MANIFEST.find(i => i.slug === slug);
  if (!icon) return null;
  const svgContent = getSvgContent(icon.filename);
  return { title: icon.title, slug: icon.slug, hex: icon.hex, svg: svgContent || '', path: extractPathFromSvg(svgContent || '') };
};