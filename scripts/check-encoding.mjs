#!/usr/bin/env node
import { globby } from 'globby';
import fs from 'node:fs/promises';

const PATTERNS = [
  'src/**/*.{ts,tsx,js,jsx,json,md,css}',
  'app/**/*.{ts,tsx,js,jsx,json,md,css}',
  'components/**/*.{ts,tsx,js,jsx,json,md,css}',
];

const BAD_SUBSTRINGS = ['�', 'Ã', 'â€”', 'â€“', 'â€™', 'â€œ', 'â€'];

const files = await globby(PATTERNS, { absolute: true });
const offenders = [];

for (const file of files) {
  const content = await fs.readFile(file, 'utf8');
  const hit = BAD_SUBSTRINGS.find((bad) => content.includes(bad));
  if (hit) {
    offenders.push({ file, bad: hit });
  }
}

if (offenders.length > 0) {
  console.error('Encoding check failed:');
  for (const { file, bad } of offenders) {
    console.error(` - ${file} contains "${bad}"`);
  }
  process.exit(1);
}
