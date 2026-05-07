#!/usr/bin/env node
/**
 * Add a single icon manually.
 *
 * Copies the SVG to src/data/icons/ and appends an entry to manifest.json.
 * After adding, run `npm run update:icons` to rebuild the search index.
 *
 * Usage: npx ts-node scripts/add-icon.ts <svg-file> <slug> <hex-color> [title] [categories...]
 * Example: npx ts-node scripts/add-icon.ts ~/Downloads/my-icon.svg mylib FFA500 "My Library" Software
 */
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: npx ts-node scripts/add-icon.ts <svg-file> <slug> <hex-color> [title] [categories...]');
  console.error('Example: npx ts-node scripts/add-icon.ts ~/Downloads/my-icon.svg mylib FFA500 "My Library" Software');
  process.exit(1);
}

const [inputFile, slug, hex, ...rest] = args;
const title = rest.length > 0 ? rest[0] : slug;
const categories = rest.length > 1 ? rest.slice(1) : [];

if (!fs.existsSync(inputFile)) {
  console.error(`❌ File not found: ${inputFile}`);
  process.exit(1);
}

const iconsDir = path.join(process.cwd(), 'src/data/icons');
const filename = `${slug}.svg`;
const outputPath = path.join(iconsDir, filename);

if (fs.existsSync(outputPath)) {
  console.error(`❌ Icon already exists: ${filename}`);
  process.exit(1);
}

// Read and save SVG as-is (theSVG provides SVGs with proper colors)
const svgContent = fs.readFileSync(inputFile, 'utf-8');
fs.writeFileSync(outputPath, svgContent);
console.log(`✅ SVG saved: ${filename}`);

// Append to manifest.json
const manifestPath = path.join(iconsDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Array<Record<string, unknown>>;

const entry = {
  title,
  slug,
  hex,
  categories,
  filename,
};

manifest.push(entry);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`✅ manifest.json updated — ${manifest.length} icons total`);

console.log('\n⚠️  Search index is outdated. Run:');
console.log('   npm run update:icons');
console.log('\n   Then restart the server.');
console.log(`\n📌 Access at: GET /api/icon/${slug}`);
