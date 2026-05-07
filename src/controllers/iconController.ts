import { Request, Response, NextFunction } from 'express';
import { searchIcons, getIconSvgBySlug } from '../services/iconService';
import type { SearchResponse } from '../types';

export const search = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, limit, page } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const result = searchIcons(q, { limit: limit ? parseInt(limit as string, 10) : 10, page: page ? parseInt(page as string, 10) : 0 });
    res.json(result as SearchResponse);
  } catch (error) {
    next(error);
  }
};

const MIN_ICON_SCORE = 0.9;

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
    const svg = getIconSvgBySlug(slug);
    if (!svg) { res.status(404).json({ error: 'Icon not found' }); return; }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    next(error);
  }
};