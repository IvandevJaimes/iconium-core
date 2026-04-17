import { searchIcon, getIconBySlug } from '../core/searchEngine';
import { buildSvg } from '../ui/svgBuilder';
import type { SearchOptions, IconResponse } from '../types';

export const searchIcons = (query: string, options?: SearchOptions) => searchIcon(query, options);

export const getIconBySlugService = (slug: string): IconResponse | null => {
  const icon = getIconBySlug(slug);
  if (!icon) return null;
  return { name: icon.title, slug: icon.slug, hex: icon.hex, svg: icon.svg, score: 1 };
};

export const getBestIconSvg = (query: string, options?: { color?: string; size?: number }): { svg: string; icon: IconResponse } | null => {
  const result = searchIcon(query, { limit: 1 });
  if (!result.results.length) return null;
  const best = result.results[0];
  const iconData = getIconBySlug(best.slug);
  if (!iconData) return null;
  const svg = buildSvg({ ...iconData, svg: iconData.svg || '' }, options);
  return { svg, icon: { name: best.name, slug: best.slug, hex: best.hex, svg: iconData.svg, score: best.score } };
};

export const getIconSvgBySlug = (slug: string, options?: { color?: string; size?: number }): string | null => {
  const icon = getIconBySlug(slug);
  if (!icon) return null;
  return buildSvg(icon, options);
};