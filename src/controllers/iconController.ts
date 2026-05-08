import { Request, Response, NextFunction } from 'express';
import { searchIcons, getIconSvgBySlug } from '../services/iconService';
import type { SearchResponse } from '../types';

const MIN_ICON_SCORE = 0.9;
const MAX_LIMIT = 50;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const toPositiveInt = (raw: unknown, fallback: number): number => {
  const n = typeof raw === 'string' ? parseInt(raw, 10) : fallback;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const search = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const limit = clamp(toPositiveInt(req.query.limit, 10), 1, MAX_LIMIT);
    const page = toPositiveInt(req.query.page, 0);
    const result = searchIcons(q, { limit, page });
    res.json(result as SearchResponse);
  } catch (error) {
    next(error);
  }
};

export const getIcon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const result = searchIcons(q, { limit: 1 });
    if (!result.results.length || result.results[0].score < MIN_ICON_SCORE) {
      res.status(404).json({ error: 'No icon found with sufficient confidence' });
      return;
    }
    const best = result.results[0];
    const svg = getIconSvgBySlug(best.slug);
    if (!svg) { res.status(404).json({ error: 'Icon not found' }); return; }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    next(error);
  }
};

export const getIconBySlug = (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug;
    if (!slug || typeof slug !== 'string') { res.status(400).json({ error: 'Invalid slug' }); return; }
    if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
      res.status(400).json({ error: 'Invalid slug' });
      return;
    }
    const svg = getIconSvgBySlug(slug);
    if (!svg) { res.status(404).json({ error: 'Icon not found' }); return; }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    next(error);
  }
};