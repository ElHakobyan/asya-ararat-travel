#!/usr/bin/env node
// Builds index.html from the pieces in src/.
//   node build.mjs          write index.html
//   node build.mjs --check  fail if index.html is out of date (used by CI)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = (p) => join(root, 'src', p);
const read = (p) => readFileSync(src(p), 'utf8').replace(/\n$/, ''); // drop the single newline each file ends with
const joinDir = (dir, ext) =>
  readdirSync(src(dir)).filter((f) => f.endsWith(ext)).sort().map((f) => read(join(dir, f))).join('\n');

export function build() {
  let html = readFileSync(src('index.template.html'), 'utf8');
  html = html
    .replace(/<!-- @include ([\w./-]+) -->/g, (_, p) => read(p))
    .replace('<!-- @css -->', () => joinDir('css', '.css'))
    .replace('<!-- @js -->', () => joinDir('js', '.js'));
  return html.replace(/\n$/, '');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = build();
  const target = join(root, 'index.html');
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== out) {
      console.error('index.html is out of date. Run: node build.mjs');
      process.exit(1);
    }
    console.log('index.html is up to date.');
  } else {
    writeFileSync(target, out);
    console.log('Built index.html (' + out.length + ' chars).');
  }
}
