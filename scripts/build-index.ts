import * as simpleIcons from 'simple-icons';
import * as fs from 'fs';
import * as path from 'path';
import type { IconIndexEntry, InvertedIndex, SimpleIconData } from '../src/types';

// Get all icons as array
const getAllIcons = (): SimpleIconData[] => {
  const entries = Object.entries(simpleIcons).filter(
    ([key]) => key.startsWith('si')
  );
  return entries.map(([, icon]) => ({
    title: icon.title,
    slug: icon.slug,
    hex: icon.hex,
    source: icon.source,
    svg: icon.svg,
    path: icon.path
  })) as SimpleIconData[];
};

// Normalize string: lowercase + replace non-alphanum with space
const normalize = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .trim();
};

// Split camelCase: insert space before uppercase
const splitCamelCase = (str: string): string => {
  return str.replace(/([a-z])([A-Z])/g, '$1 $2');
};

// Tokenize: normalize + split camelCase + split by spaces
const tokenize = (str: string): string[] => {
  const normalized = normalize(str);
  const camelSplit = splitCamelCase(normalized);
  return camelSplit.split(/\s+/).filter(Boolean);
};

// Generate bigrams from string (n=2)
const generateBigrams = (str: string): string[] => {
  if (str.length < 3) return [];
  
  const bigrams: string[] = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.slice(i, i + 2));
  }
  return bigrams;
};

// Process all icons and create index
const buildIndex = (): { icons: IconIndexEntry[]; invertedIndex: InvertedIndex } => {
  const rawIcons = getAllIcons();
  const icons: IconIndexEntry[] = [];
  const invertedIndex: InvertedIndex = {};
  
  rawIcons.forEach((icon, index) => {
    const tokens = tokenize(icon.title);
    const allBigrams: string[] = [];
    
    // Generate bigrams from each token
    tokens.forEach(token => {
      const tokenBigrams = generateBigrams(token);
      allBigrams.push(...tokenBigrams);
    });
    
    // Dedupe bigrams while preserving order
    const uniqueBigrams = [...new Set(allBigrams)];
    
    // Store normalized name (without dots, special chars)
    const normalizedName = tokens.join(' ');
    
    icons.push({
      N: normalizedName,
      G: uniqueBigrams
    });
    
    // Add to inverted index
    uniqueBigrams.forEach(bigram => {
      if (!invertedIndex[bigram]) {
        invertedIndex[bigram] = [];
      }
      invertedIndex[bigram].push(index);
    });
  });
  
  return { icons, invertedIndex };
};

// Main build process
const main = () => {
  console.log('Building search index...');
  
  const { icons, invertedIndex } = buildIndex();
  
  console.log(`Processed ${icons.length} icons`);
  console.log(`Inverted index has ${Object.keys(invertedIndex).length} unique bigrams`);
  
  // Save to file
  const outputPath = path.join(process.cwd(), 'src/data/icons.ts');
  
  const output = `// Auto-generated - DO NOT EDIT
// Run: npx ts-node scripts/build-index.ts

export const ICON_COUNT = ${icons.length} as const;

export const INVERTED_INDEX = ${JSON.stringify(invertedIndex)} as const;

export const ICON_INDEX: Array<{ N: string; G: string[] }> = ${JSON.stringify(icons)};
`;
  
  fs.writeFileSync(outputPath, output);
  console.log(`Written to ${outputPath}`);
};

main();