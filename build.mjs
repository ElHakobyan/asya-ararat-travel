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

const demoBar = '<div style="background:#102a48;color:#fff;font:600 13px Arial,sans-serif;text-align:center;padding:9px 12px">Демо / Demo: так работает AI-помощник. Ответы заготовлены, ничего не сохраняется. Чат: кнопка справа внизу.</div>';

/** demo.html = the same site, with a scripted chat and no database. Never indexed. */
export function buildDemo() {
  const html = build();
  const demoJs = readFileSync(src('demo/chat-demo.js'), 'utf8').replace(/\n$/, '');
  const a = '<script src="config.js"></script>\n<script>\n';
  if (!html.includes(a)) throw new Error('script marker not found');
  return html
    .replace(a, () => '<script>window.SUPABASE_CONFIG={demo:true};</script>\n<script>\n' + demoJs + '\n')
    .replace('<head>', () => '<head><meta name="robots" content="noindex,nofollow">')
    .replace(/<link rel="canonical"[^>]*>/, '')
    .replace('<body>', () => '<body>' + demoBar);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pages = [['index.html', build()], ['demo.html', buildDemo()]];
  if (process.argv.includes('--check')) {
    for (const [name, out] of pages) {
      if (readFileSync(join(root, name), 'utf8') !== out) {
        console.error(name + ' is out of date. Run: node build.mjs');
        process.exit(1);
      }
    }
    console.log('index.html and demo.html are up to date.');
  } else {
    for (const [name, out] of pages) {
      writeFileSync(join(root, name), out);
      console.log('Built ' + name + ' (' + out.length + ' chars).');
    }
  }
}
