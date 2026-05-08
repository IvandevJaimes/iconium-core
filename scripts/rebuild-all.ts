#!/usr/bin/env node
/**
 * Rebuild-all script for theSVG data source.
 *
 * 1. Fetches registry.json from theSVG CDN (full dataset: 5881+ icons)
 * 2. Clears existing SVG files and regenerates everything from scratch
 * 3. Downloads each icon's default.svg in parallel batches
 * 4. Generates manifest.json + manifest.ts with metadata
 * 5. Builds search index (ICON_INDEX + INVERTED_INDEX) for fuzzy search
 *
 * Usage: npx ts-node scripts/rebuild-all.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURATION
// ============================================

const REGISTRY_URL = 'https://thesvg.org/api/registry.json';
const SVG_BASE_URL = 'https://thesvg.org/icons';
const ICONS_DIR = path.join(process.cwd(), 'src/data/icons');
const DOWNLOAD_CONCURRENCY = 30;
const MAX_RETRIES = 3;

// ============================================
// TYPES
// ============================================

interface RegistryIcon {
  slug: string;
  title: string;
  aliases: string[];
  categories: string[];
  hex: string;
  url: string;
  license: string;
  variants: string[];
}

interface RegistryData {
  total: number;
  icons: RegistryIcon[];
}

interface ManifestEntry {
  title: string;
  slug: string;
  hex: string;
  categories: string[];
  filename: string;
}

// ============================================
// SYMBOL MAP (must match src/core/textProcessor.ts)
// ============================================

const SYMBOL_MAP: Record<string, string> = {
  'c++': 'cplusplus',
  'cpp': 'cplusplus',
  'c#': 'csharp',
  'f#': 'fsharp',
  'd3': 'd3',
  'd3.js': 'd3',
  'd3js': 'd3',
  'd4': 'd4',
  'at&t': 'atandt',
  '1&1': '1and1',
  '1.1.1.1': '1dot1dot1dot1',
  'co-op': 'coop',
  'ko-fi': 'kofi',
  'p5.js': 'p5dotjs',
  'p5js': 'p5dotjs',
  'pr.co': 'prdotco',
  '2k': '2k',
  '3m': '3m',
  '4d': '4d',
  '42': '42',
  'bt': 'bt',
  'ea': 'ea',
  'ce': 'ce',
  'dm': 'dm',
  'e3': 'e3',
  'yr': 'yr',
  'uv': 'uv',
  'f5': 'f5',
  'g2': 'g2',
  '.net': 'dotnet',
  '.env': 'dotenv',
  '/e/': 'e',
  'vscode': 'visualstudiocode',
  'sqlserver': 'microsoftsqlserver',
};

const normalize = (str: string): string => {
  const lower = str.toLowerCase().trim();
  if (SYMBOL_MAP[lower]) return SYMBOL_MAP[lower];
  const noSpace = lower.replace(/\s+/g, '');
  if (SYMBOL_MAP[noSpace]) return SYMBOL_MAP[noSpace];
  return lower.replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
};

const splitCamelCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1 $2');

const tokenize = (str: string): string[] => {
  const normalized = normalize(str);
  const camelSplit = splitCamelCase(normalized);
  return camelSplit.split(/\s+/).filter(Boolean);
};

const generateBigrams = (str: string): string[] => {
  if (str.length < 3) return [];
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.slice(i, i + 2));
  }
  return bigrams;
};

// ============================================
// HTTP HELPERS
// ============================================

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES,
): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      console.log(`   ⚠️  Retry ${attempt + 1}/${retries} for ${url}`);
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

async function fetchRegistry(): Promise<RegistryData> {
  console.log(`\n📦 Fetching registry from ${REGISTRY_URL}...`);
  const json = await fetchWithRetry(REGISTRY_URL);
  const data = JSON.parse(json) as RegistryData;
  console.log(`   ✅ ${data.total} icons found in registry`);
  return data;
}

async function downloadSvg(slug: string): Promise<string | null> {
  const url = `${SVG_BASE_URL}/${slug}/default.svg`;
  try {
    const svg = await fetchWithRetry(url);
    return svg;
  } catch {
    return null;
  }
}

async function downloadAllSvgs(
  icons: RegistryIcon[],
  concurrency: number,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  let downloaded = 0;
  let failed = 0;

  console.log(
    `\n⬇️  Downloading ${icons.length} SVGs (concurrency: ${concurrency})...`,
  );

  // Split into batches
  for (let i = 0; i < icons.length; i += concurrency) {
    const batch = icons.slice(i, i + concurrency);

    const promises = batch.map(async (icon) => {
      const svg = await downloadSvg(icon.slug);
      if (svg) {
        results.set(icon.slug, svg);
        downloaded++;
      } else {
        failed++;
      }
    });

    await Promise.all(promises);

    const percent = (((downloaded + failed) / icons.length) * 100).toFixed(1);
    process.stdout.write(
      `\r   Progress: ${downloaded + failed}/${icons.length} (${percent}%) — ${failed} failed`,
    );
  }

  console.log(
    `\n   ✅ ${downloaded} SVGs downloaded, ${failed} failed`,
  );
  return results;
}

// ============================================
// FILESYSTEM HELPERS
// ============================================

function resetIconsDir(): void {
  if (fs.existsSync(ICONS_DIR)) {
    // Remove all .svg files and generated files
    const entries = fs.readdirSync(ICONS_DIR);
    for (const entry of entries) {
      if (
        entry.endsWith('.svg') ||
        entry === 'manifest.json' ||
        entry === 'manifest.ts'
      ) {
        fs.unlinkSync(path.join(ICONS_DIR, entry));
      }
    }
    console.log(`   🧹 Cleared existing SVG files from icons directory`);
  }

  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }
}

function writeManifestJson(manifest: ManifestEntry[]): void {
  const manifestPath = path.join(ICONS_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`   ✅ manifest.json`);
}

function writeManifestTs(manifest: ManifestEntry[]): void {
  const manifestPath = path.join(ICONS_DIR, 'manifest.ts');
  const content = `// Auto-generated - DO NOT EDIT
// Run: npx ts-node scripts/rebuild-all.ts

export interface IconManifest {
  title: string;
  slug: string;
  hex: string;
  categories: string[];
  filename: string;
}

export const ICON_MANIFEST: IconManifest[] = ${JSON.stringify(manifest, null, 2)};
`;
  fs.writeFileSync(manifestPath, content);
  console.log(`   ✅ manifest.ts`);
}

function writeSearchIndex(icons: RegistryIcon[]): void {
  console.log('\n🔍 Building search index...');

  const indexEntries = icons.map((icon) => {
    const tokens = tokenize(icon.title);
    const allBigrams: string[] = [];
    tokens.forEach((token) => {
      const tokenBigrams = generateBigrams(token);
      allBigrams.push(...tokenBigrams);
    });
    const uniqueBigrams = [...new Set(allBigrams)];
    const normalizedName = tokens.join(' ');
    return { N: normalizedName, G: uniqueBigrams };
  });

  const invertedIndex: Record<string, number[]> = {};
  indexEntries.forEach((entry, index) => {
    entry.G.forEach((bigram) => {
      if (!invertedIndex[bigram]) invertedIndex[bigram] = [];
      invertedIndex[bigram].push(index);
    });
  });

  const outputPath = path.join(process.cwd(), 'src/data/icons.ts');
  const output = `// Auto-generated - DO NOT EDIT
// Run: npx ts-node scripts/rebuild-all.ts

export const ICON_COUNT = ${icons.length} as const;

export const INVERTED_INDEX = ${JSON.stringify(invertedIndex)};

export const ICON_INDEX: Array<{ N: string; G: string[] }> = ${JSON.stringify(indexEntries)};
`;

  fs.writeFileSync(outputPath, output);
  console.log(
    `   ✅ icons.ts — ${icons.length} icons, ${Object.keys(invertedIndex).length} unique bigrams`,
  );
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('🔄 theSVG Rebuild All');
  console.log('══════════════════════');

  // 1. Fetch registry from CDN
  const registry = await fetchRegistry();
  const icons = registry.icons;

  // 2. Reset icons directory (clear old SVGs + generated files)
  console.log('\n🧹 Cleaning icons directory...');
  resetIconsDir();

  // 3. Download all SVGs in parallel batches
  const svgMap = await downloadAllSvgs(icons, DOWNLOAD_CONCURRENCY);

  // 4. Write SVGs to disk
  console.log('\n💾 Writing SVGs to disk...');
  for (const [slug, svg] of svgMap) {
    const filepath = path.join(ICONS_DIR, `${slug}.svg`);
    fs.writeFileSync(filepath, svg);
  }
  console.log(`   ✅ ${svgMap.size} SVGs written`);

  // 5. Build manifest (only for successfully downloaded icons)
  console.log('\n📝 Building manifest...');
  const manifest: ManifestEntry[] = icons
    .filter((icon) => svgMap.has(icon.slug))
    .map((icon) => ({
      title: icon.title,
      slug: icon.slug,
      hex: icon.hex,
      categories: icon.categories,
      filename: `${icon.slug}.svg`,
    }));

  writeManifestJson(manifest);
  writeManifestTs(manifest);

  // 6. Build search index
  writeSearchIndex(icons.filter((icon) => svgMap.has(icon.slug)));

  // 7. Summary
  const failedCount = icons.length - svgMap.size;
  console.log('\n══════════════════════');
  console.log('🎉 Done!');
  console.log(`   Total in registry: ${icons.length}`);
  console.log(`   Downloaded:        ${svgMap.size}`);
  console.log(`   Failed:            ${failedCount}`);
  console.log(`   Search index:      ${manifest.length} icons`);
  console.log('\n   Restart your server to apply changes.');
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
