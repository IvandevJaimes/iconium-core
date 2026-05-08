// Search result with score
export interface SearchResult {
  name: string;
  slug: string;
  hex: string;
  colors: string[];
  categories: string[];
  svg: string;
  score: number;
}

// API response types
export interface SearchResponse {
  page: number;
  limit: number;
  total: number;
  results: SearchResult[];
}

export interface IconResponse {
  name: string;
  slug: string;
  hex: string;
  colors: string[];
  categories: string[];
  svg: string;
  score: number;
}

// Search options
export interface SearchOptions {
  limit?: number;
  page?: number;
}