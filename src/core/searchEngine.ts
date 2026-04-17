import { ICON_INDEX, INVERTED_INDEX, ICON_COUNT } from '../data/icons';
import { getSvgContent } from '../data/icons/index';
import iconManifest from '../data/icons/manifest.json';
import type { SearchOptions, SearchResult } from '../types';

const ICON_MANIFEST = iconManifest as Array<{ title: string; slug: string; hex: string; filename: string }>;
const invertedIndex = INVERTED_INDEX as unknown as Record<string, number[]>;

const normalize = (str: string): string => str.toLowerCase().replace(/[^a-z0-9#+]/g, ' ').trim();
const splitCamelCase = (str: string): string => str.replace(/([a-z])([A-Z])/g, '$1 $2');

const tokenize = (str: string): string[] => splitCamelCase(normalize(str)).split(/\s+/).filter(Boolean);

const generateBigrams = (str: string): string[] => {
  if (str.length < 2) return [];
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    const bigram = str.slice(i, i + 2);
    // Only include if both chars are alphanumeric or +/#
    if (/^[a-z0-9+#]{2}$/i.test(bigram)) {
      bigrams.push(bigram);
    }
  }
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

// Check if all query chars are in name (regardless of order)
const hasAllChars = (query: string, name: string): boolean => {
  const queryChars = query.replace(/\s/g, '');
  const nameChars = name.replace(/\s/g, '');
  for (const c of queryChars) {
    if (!nameChars.includes(c)) return false;
  }
  return true;
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

  // Handle special queries BEFORE normalization
  const specialExact: Record<string, string> = {
    'c++': 'cplusplus',
    'c#': 'csharp',
  };
  if (specialExact[query]) {
    const targetSlug = specialExact[query];
    const icon = ICON_MANIFEST.find(i => i.slug === targetSlug);
    if (icon) {
      return { results: [{ name: icon.title, slug: icon.slug, hex: icon.hex, score: 1.0 }], total: 1, page: 0, limit: 1 };
    }
  }

  const normalizedQuery = normalize(query);
  const cleanQuery = normalizedQuery.replace(/\s/g, '');
  const tokens = tokenize(query);
  const queryBigrams = tokens.flatMap(generateBigrams);

  // Handle short queries (1-2 chars) - use prefix matching
  if (cleanQuery.length <= 2) {
    const results: Array<{ index: number; score: number }> = [];
    
    // Special handling for common abbreviations (use slugs)
    const abbrevs: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cplusplus',
      'c++': 'cplusplus',
      'c#': 'csharp', // exists in dataset
    };
    
    // Check abbreviations first - use manifest slugs (exact match = highest priority)
    if (abbrevs[cleanQuery]) {
      const targetSlug = abbrevs[cleanQuery];
      const iconIndex = ICON_MANIFEST.findIndex(i => i.slug === targetSlug);
      if (iconIndex !== -1) {
        const iconData = getIconData(iconIndex);
        // Exact abbreviation always wins
        return { results: [{ name: iconData.title, slug: iconData.slug, hex: iconData.hex, score: 1.0 }], total: 1, page: 0, limit: 1 };
      }
    }
    
    // Special case for c# - use prefix search
    if (cleanQuery === 'c#' || cleanQuery === 'cs') {
      const results: Array<{ index: number; score: number }> = [];
      ICON_INDEX.forEach((iconData, index) => {
        const name = iconData.N;
        if (name.startsWith('c') && name.length <= 2) {
          results.push({ index, score: 1.0 - (name.length - 1) * 0.1 });
        }
      });
      if (results.length > 0) {
        results.sort((a, b) => b.score - a.score);
        const total = results.length;
        const paged = results.slice(0, limit);
        const finalResults = paged.map(({ index, score }) => {
          const iconData = getIconData(index);
          return { name: iconData.title, slug: iconData.slug, hex: iconData.hex, score: Math.round(score * 100) / 100 };
        });
        return { results: finalResults, total, page, limit };
      }
    }
    
    // Fallback to prefix matching
    ICON_INDEX.forEach((iconData, index) => {
      const name = iconData.N.replace(/\s/g, '');
      if (name.startsWith(cleanQuery)) {
        results.push({ index, score: 1.0 - (name.length - cleanQuery.length) * 0.05 });
      } else if (name.includes(cleanQuery)) {
        results.push({ index, score: 0.8 });
      } else if (name.startsWith(cleanQuery[0])) {
        results.push({ index, score: 0.6 });
      }
    });
    results.sort((a, b) => b.score - a.score);
    const total = results.length;
    const paged = results.slice(page * limit, page * limit + limit);
    const finalResults = paged.map(({ index, score }) => {
      const iconData = getIconData(index);
      return { name: iconData.title, slug: iconData.slug, hex: iconData.hex, score: Math.round(score * 100) / 100 };
    });
    return { results: finalResults, total, page, limit };
  }

  // Normal search for longer queries
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
    const nameChars = normalizedName.replace(/\s/g, '');
    let score = 0;

    // Priority 1: Exact match
    if (normalizedName === normalizedQuery) score = 1.0;
    // Priority 2: Prefix match
    else if (normalizedName.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedName)) score = 0.95;
    // Priority 3: Word boundary
    else if (normalizedName.includes(' ' + normalizedQuery) || normalizedName.includes(normalizedQuery + ' ')) score = 0.9;
    // Priority 4: Contains
    else if (normalizedName.includes(normalizedQuery)) score = 0.85;
    // Priority 5: First char match + subsequence
    else if (nameChars.startsWith(cleanQuery[0])) {
      const charScore = calculateCharSequenceScore(cleanQuery, nameChars);
      if (charScore >= 0.8) score = charScore + 0.1;
      else {
        // Priority 6: Has all chars (jvscrpt → javascript)
        if (hasAllChars(cleanQuery, nameChars)) {
          score = 0.88; // Higher than regular Levenshtein
        } else {
          const sim = stringSimilarity(normalizedQuery, normalizedName);
          score = Math.abs(cleanQuery.length - nameChars.length) <= 2 ? sim + 0.1 : sim;
        }
      }
    }
    // Priority 7: Has all chars even without first char match
    else if (hasAllChars(cleanQuery, nameChars)) {
      score = 0.85;
    }
    // Priority 8: Levenshtein fallback
    else {
      const sim = stringSimilarity(normalizedQuery, normalizedName);
      score = Math.abs(cleanQuery.length - nameChars.length) <= 2 ? sim + 0.1 : sim;
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