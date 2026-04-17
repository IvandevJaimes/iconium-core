import { Request, Response, NextFunction } from 'express';
import { searchIcons, getBestIconSvg, getIconSvgBySlug, getIconBySlugService } from '../services/iconService';
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

export const getIcon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, color, size } = req.query;
    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }
    const result = getBestIconSvg(q, { color: color as string | undefined, size: size ? parseInt(size as string, 10) : undefined });
    if (!result) { res.status(404).json({ error: 'No icon found' }); return; }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(result.svg);
  } catch (error) {
    next(error);
  }
};

export const getIconBySlug = (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug;
    const { color, size } = req.query;
    if (!slug || typeof slug !== 'string') { res.status(400).json({ error: 'Invalid slug' }); return; }
    const icon = getIconBySlugService(slug);
    if (!icon) { res.status(404).json({ error: 'Icon not found' }); return; }
    const svg = getIconSvgBySlug(slug, { color: color as string | undefined, size: size ? parseInt(size as string, 10) : undefined });
    if (!svg) { res.status(404).json({ error: 'SVG not found' }); return; }
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (error) {
    next(error);
  }
};