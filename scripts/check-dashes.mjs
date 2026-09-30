// Fails when an em dash (U+2014) appears in source, tests, docs or config.
// House style: no em dashes anywhere. Usage: node scripts/check-dashes.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOTS = ['app', 'components', 'lib', 'data', 'tests', 'docs', 'scripts', '.claude', '.github', 'README.md', 'CLAUDE.md', 'public/manifest.webmanifest'];
const TEXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.css', '.md', '.html', '.json', '.yml', '.yaml', '.txt', '.webmanifest', '.svg']);
const SKIP = new Set(['node_modules', '.next', '.git']);
const DASH = String.fromCharCode(0x2014);

function* files(path) {
  let st;
  try {
    st = statSync(path);
  } catch {
    return; // a root that does not exist yet
  }
  if (st.isFile()) {
    if (TEXT.has(extname(path)) || !extname(path)) yield path;
    return;
  }
  for (const name of readdirSync(path)) if (!SKIP.has(name)) yield* files(join(path, name));
}

let hits = 0;
for (const root of ROOTS) {
  for (const file of files(root)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes(DASH)) {
        hits++;
        console.log(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }
}
if (hits) {
  console.error(`\n${hits} em dash${hits === 1 ? '' : 'es'} found. Use a comma, a colon, parentheses or two sentences instead.`);
  process.exit(1);
}
console.log('No em dashes.');
