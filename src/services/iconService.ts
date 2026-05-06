import { searchIcon, getIconBySlug } from '../core/searchEngine';
import type { SearchOptions } from '../types';

export const searchIcons = (query: string, options?: SearchOptions) => searchIcon(query, options);

export const getIconSvgBySlug = (slug: string): string | null => {
  const icon = getIconBySlug(slug);
  if (!icon) return null;
  return icon.svg || '';
};
