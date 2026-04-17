import * as simpleIcons from 'simple-icons';
import * as fs from 'fs';
import * as path from 'path';

// Get all icons
const getAllIcons = () => {
  const entries = Object.entries(simpleIcons).filter(([key]) => key.startsWith('si'));
  return entries.map(([, icon]) => ({
    title: icon.title,
    slug: icon.slug,
    hex: icon.hex,
    svg: icon.svg,
    path: icon.path
  }));
};

const main = () => {
  console.log('Downloading SVGs...');
  
  const icons = getAllIcons();
  const outputDir = path.join(process.cwd(), 'src/data/icons');
  
  // Create directory if not exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let downloaded = 0;
  let skipped = 0;
  
  icons.forEach(icon => {
    // Clean slug for filename (some slugs have special chars)
    const filename = icon.slug.replace(/[^a-z0-9]/gi, '_') + '.svg';
    const filepath = path.join(outputDir, filename);
    
    // Only write if doesn't exist (allows manual additions)
    if (!fs.existsSync(filepath)) {
      // Write clean SVG with viewBox preserved
      const svgContent = icon.svg;
      fs.writeFileSync(filepath, svgContent);
      downloaded++;
    } else {
      skipped++;
    }
  });
  
  console.log(`Downloaded ${downloaded} SVGs, skipped ${skipped} existing`);
  
  // Generate a manifest file with all icon metadata
  const manifest = icons.map(icon => ({
    title: icon.title,
    slug: icon.slug,
    hex: icon.hex,
    filename: icon.slug.replace(/[^a-z0-9]/gi, '_') + '.svg'
  }));
  
  const manifestPath = path.join(process.cwd(), 'src/data/icons/manifest.ts');
  const manifestContent = `// Auto-generated - DO NOT EDIT
// Run: npx ts-node scripts/download-svgs.ts

export interface IconManifest {
  title: string;
  slug: string;
  hex: string;
  filename: string;
}

export const ICON_MANIFEST: IconManifest[] = ${JSON.stringify(manifest, null, 2)};
`;
  
  fs.writeFileSync(manifestPath, manifestContent);
  console.log(`Manifest written to ${manifestPath}`);
};

main();