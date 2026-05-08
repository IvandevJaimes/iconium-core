import levenshtein from "fast-levenshtein";
export const SYMBOL_MAP: Record<string, string> = {
  "c++": "cplusplus",
  "cpp": "cplusplus",
  "c#": "csharp",
  "f#": "fsharp",
  "d3.js": "d3",
  "d3js": "d3",
  "d4": "d4",
  "at&t": "atandt",
  "1&1": "1and1",
  "1.1.1.1": "1dot1dot1dot1",
  "co-op": "coop",
  "ko-fi": "kofi",
  "p5.js": "p5dotjs",
  "p5js": "p5dotjs",
  "pr.co": "prdotco",
  ".net": "dotnet",
  ".env": "dotenv",
  "/e/": "e",
  "vscode": "visualstudiocode",
  "sqlserver":"microsoftsqlserver",
  "html":"html5",
};

export const normalize = (str: string): string => {
  const lower = str.toLowerCase().trim();
  if (SYMBOL_MAP[lower]) return SYMBOL_MAP[lower];
  // Try matching with spaces removed (handles ". net" → "dotnet", "c #" → "csharp")
  const noSpace = lower.replace(/\s+/g, '');
  if (SYMBOL_MAP[noSpace]) return SYMBOL_MAP[noSpace];
  return lower.replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
};

export const splitCamelCase = (str: string): string => str.replace(/([a-z])([A-Z])/g, "$1 $2");

export const tokenize = (str: string): string[] => {
  const normalized = normalize(str);
  const camelSplit = splitCamelCase(normalized);
  return camelSplit.split(/\s+/).filter(Boolean);
};

export const generateBigrams = (str: string): string[] => {
  if (str.length < 3) return [];
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) bigrams.push(str.slice(i, i + 2));
  return bigrams;
};

export const stringSimilarity = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein.get(a, b) / maxLen;
};

export const calculateCharSequenceScore = (query: string, name: string): number => {
  let qi = 0, matchCount = 0;
  for (let i = 0; i < name.length && qi < query.length; i++) {
    if (name[i] === query[qi]) { qi++; matchCount++; }
  }
  if (qi !== query.length) return 0;
  return matchCount / name.length;
};
