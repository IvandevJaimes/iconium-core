// Helper to read SVG files
import * as fs from 'fs';
import * as path from 'path';

export const getSvgContent = (filename: string): string | null => {
  const svgPath = path.join(__dirname, filename);
  try {
    return fs.readFileSync(svgPath, 'utf-8');
  } catch {
    return null;
  }
};