import type { SvgBuilderOptions } from '../types';

interface IconData {
  title: string;
  slug: string;
  hex: string;
  svg: string;
  path: string;
}

const extractPathFromSvg = (svgString: string): string => {
  const match = svgString.match(/d="([^"]+)"/);
  return match ? match[1] : '';
};

export const buildSvg = (icon: IconData, options: SvgBuilderOptions = {}): string => {
  const { color, size = 24 } = options;
  const path = icon.path || extractPathFromSvg(icon.svg);
  const iconColor = color || icon.hex;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <path fill="#${iconColor}" d="${path}"/>
</svg>`;
};