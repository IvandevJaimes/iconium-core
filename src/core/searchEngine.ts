import { ICON_INDEX, INVERTED_INDEX, ICON_COUNT } from '../data/icons';
import iconManifest from '../data/icons/manifest.json';
import * as fs from 'fs';
import * as path from 'path';
import type { SearchOptions, SearchResult } from '../types';
import {
  normalize,
  splitCamelCase,
  tokenize,
  generateBigrams,
  stringSimilarity,
  calculateCharSequenceScore,
  SYMBOL_MAP,
} from './textProcessor';

// ============================================
// CONFIGURATION & CONSTANTS
// ============================================

const ICON_MANIFEST = iconManifest as Array<{ title: string; slug: string; hex: string; colors: string[]; categories: string[]; filename: string }>;
const invertedIndex = INVERTED_INDEX as unknown as Record<string, number[]>;

const SCORE_EXACT_MATCH = 1.0;
const SCORE_STARTS_WITH = 0.95;
const SCORE_CONTAINS_WORD = 0.9;
const SCORE_CONTAINS = 0.85;
const SCORE_CHAR_SEQUENCE_BONUS = 0.1;
const SCORE_SIMILARITY_BONUS = 0.1;
const SHORT_QUERY_THRESHOLD = 3;
const BIGRAM_MIN_LENGTH = 3;
const MIN_CANDIDATES_FOR_EXPANSION = 5;
const SIMILARITY_THRESHOLD = 0.3;

// ============================================
// ICON DATA ACCESS
// ============================================

const getIconData = (index: number) => {
  const icon = ICON_MANIFEST[index];
  if (!icon) return { title: '', slug: '', hex: '', colors: [], categories: [] };
  return { title: icon.title, slug: icon.slug, hex: icon.hex, colors: icon.colors || [], categories: icon.categories || [] };
};

// ============================================
// SCORING LOGIC
// ============================================

const calculateScore = (normalizedQuery: string, normalizedName: string): number => {
  let score = 0;

  if (normalizedName === normalizedQuery) score = SCORE_EXACT_MATCH;
  else if (normalizedName.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedName)) score = SCORE_STARTS_WITH;
  else if (normalizedName.includes(' ' + normalizedQuery) || normalizedName.includes(normalizedQuery + ' ')) score = SCORE_CONTAINS_WORD;
  else if (normalizedName.includes(normalizedQuery)) score = SCORE_CONTAINS;
  else {
    const queryChars = normalizedQuery.replace(/\s/g, '');
    const nameChars = normalizedName.replace(/\s/g, '');
    if (nameChars.startsWith(queryChars[0])) {
      const charScore = calculateCharSequenceScore(queryChars, nameChars);
      if (charScore >= 0.8) score = charScore + SCORE_CHAR_SEQUENCE_BONUS;
    }
    if (score < SIMILARITY_THRESHOLD) {
      const sim = stringSimilarity(normalizedQuery, normalizedName);
      score = Math.abs(normalizedQuery.length - normalizedName.length) <= 2 ? sim + SCORE_SIMILARITY_BONUS : sim;
    }
  }

  return Math.max(0, score);
};

const calculateShortQueryScore = (cleanQuery: string, normalizedQuery: string, normalizedName: string): number => {
  let score = 0;
  if (normalizedName === cleanQuery) score = SCORE_EXACT_MATCH;
  else if (normalizedName.startsWith(cleanQuery)) score = SCORE_STARTS_WITH;
  else if (normalizedName.includes(normalizedQuery)) score = SCORE_CONTAINS;
  else score = stringSimilarity(cleanQuery, normalizedName) * 0.5;
  return Math.max(0, score);
};

// ============================================
// MAIN SEARCH ENGINE
// ============================================

export const searchIcon = (
  query: string,
  options: SearchOptions = {}
): { results: SearchResult[]; total: number; page: number; limit: number } => {
  const { limit = 10, page = 0 } = options;

  if (!query?.trim()) return { results: [], total: 0, page, limit };

  const normalizedQuery = normalize(query);
  const cleanQuery = normalizedQuery.replace(/\s/g, '');

  // SHORT QUERIES: Skip bigrams, use direct string matching
  if (cleanQuery.length <= SHORT_QUERY_THRESHOLD) {
    return handleShortQuery(normalizedQuery, cleanQuery, limit, page);
  }

  // LONG QUERIES: Use bigram + inverted index
  return handleLongQuery(normalizedQuery, query, limit, page);
};

const handleShortQuery = (normalizedQuery: string, cleanQuery: string, limit: number, page: number) => {
  const scored = ICON_INDEX.map((iconData, index) => {
    const name = normalize(iconData.N); // Normalize icon name to match normalized query
    const nameClean = name.replace(/\s/g, '');
    const score = calculateShortQueryScore(cleanQuery, normalizedQuery, nameClean);
    return { index, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const total = scored.length;
  const paged = scored.slice(page * limit, (page + 1) * limit);

  const results = paged.map(({ index, score }) => {
    const iconData = getIconData(index);
    return { name: iconData.title, slug: iconData.slug, hex: iconData.hex, colors: iconData.colors, categories: iconData.categories, score: Math.round(score * 100) / 100 };
  });

  return { results, total, page, limit };
};

const handleLongQuery = (normalizedQuery: string, query: string, limit: number, page: number) => {
  const tokens = tokenize(query);
  const queryBigrams = tokens.flatMap(generateBigrams);

  if (!queryBigrams.length) return { results: [], total: 0, page, limit };

  const candidateScores = new Map<number, number>();
  queryBigrams.forEach(bigram => {
    const indices = invertedIndex[bigram];
    if (indices) indices.forEach(id => candidateScores.set(id, (candidateScores.get(id) || 0) + 1));
  });

  if (candidateScores.size < MIN_CANDIDATES_FOR_EXPANSION) {
    candidateScores.clear();
    ICON_INDEX.forEach((iconData, index) => {
      const sim = stringSimilarity(normalizedQuery, iconData.N);
      if (sim > SIMILARITY_THRESHOLD) candidateScores.set(index, sim * 100);
    });
  }

  if (candidateScores.size < 2) return { results: [], total: 0, page, limit };

  const indicesToScore = candidateScores.size < MIN_CANDIDATES_FOR_EXPANSION
    ? [...Array(ICON_COUNT).keys()]
    : candidateScores.keys();

  const scoredResults: Array<{ index: number; score: number }> = [];

  for (const index of indicesToScore) {
    const iconData = ICON_INDEX[index];
    if (!iconData) continue;

    const normalizedName = normalize(iconData.N); // Normalize icon name to match normalized query
    const score = calculateScore(normalizedQuery, normalizedName);
    scoredResults.push({ index, score: Math.max(0, score) });
  }

  scoredResults.sort((a, b) => b.score - a.score);

  const total = scoredResults.length;
  const start = page * limit;
  const paged = scoredResults.slice(start, start + limit);

  const results = paged.map(({ index, score }) => {
    const iconData = getIconData(index);
    return { name: iconData.title, slug: iconData.slug, hex: iconData.hex, colors: iconData.colors, categories: iconData.categories, score: Math.round(score * 100) / 100 };
  });

  return { results, total, page, limit };
};

// ============================================
// ICON RETRIEVAL (by slug)
// ============================================

// Normalize slug for lookup (handle special cases like .net → dotnet)
const normalizeSlug = (slug: string): string => {
  const lower = slug.toLowerCase().trim();
  if (SYMBOL_MAP[lower]) return SYMBOL_MAP[lower];
  return lower.replace(/[^a-z0-9]/g, '');
};

export const getIconBySlug = (slug: string) => {
  // Strategy 1: Try exact slug match (fast path)
  let icon = ICON_MANIFEST.find(i => i.slug === slug);  
  
  // Strategy 2: Try normalized slug match
  if (!icon) {
    const normalizedSlug = normalizeSlug(slug);
    icon = ICON_MANIFEST.find(i => i.slug === normalizedSlug);
  }
  
  // Strategy 3: Try matching with normalized manifest slugs
  if (!icon) {
    const normalizedSlug = normalizeSlug(slug);
    icon = ICON_MANIFEST.find(i => normalizeSlug(i.slug) === normalizedSlug);
  }
  
  // Strategy 4: Use search engine for fuzzy matching (handles vuejs → vuedotjs)
  if (!icon) {
    const searchResult = searchIcon(slug, { limit: 5 });
    for (const result of searchResult.results) {
      if (result.score > 0.3) {
        icon = ICON_MANIFEST.find(i => i.slug === result.slug);
        if (icon) break;
      }
    }
  }
  
  if (!icon) return null;
  
  const svgPath = path.join(__dirname, '../data/icons', icon.filename);
  
  // Check if file exists before reading
  if (!fs.existsSync(svgPath)) {
    return null;
  }
  
  const svgContent = fs.readFileSync(svgPath, 'utf-8');

  return {
    title: icon.title,
    slug: icon.slug,
    hex: icon.hex,
    colors: icon.colors || [],
    categories: icon.categories || [],
    svg: svgContent || '',
  };
};
