// Safety net: run before every push (CI runs it too).  node tests/check.mjs
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build, buildDemo } from '../build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (m) => errors.push(m);

// 1. index.html must be exactly what src/ builds to
const html = readFileSync(join(root, 'index.html'), 'utf8');
if (html !== build()) fail('index.html is out of date - run: node build.mjs');
if (readFileSync(join(root, 'demo.html'), 'utf8') !== buildDemo()) fail('demo.html is out of date - run: node build.mjs');

// 2. The inline script must parse
const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
const tmp = join(mkdtempSync(join(tmpdir(), 'chk-')), 'inline.js');
writeFileSync(tmp, script);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); }
catch (e) { fail('JavaScript syntax error:\n' + e.stderr.toString().split('\n').slice(0, 6).join('\n')); }

// 3. Every id the script looks up must exist in the page
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
for (const m of script.matchAll(/getElementById\('([^']+)'\)/g))
  if (!ids.has(m[1])) fail(`script uses #${m[1]} but no element has that id`);

// 4. Same-page links (#tours, ...) must point at real ids
for (const m of html.matchAll(/href="#([^"]+)"/g))
  if (!ids.has(m[1])) fail(`link to #${m[1]} has no matching section`);

// 5. Translations: every data-i key must exist in EN, HY and RU
const dictSrc = readFileSync(join(root, 'src/js/01-i18n.js'), 'utf8');
const dictCode = dictSrc.slice(dictSrc.indexOf('const dictionary'), dictSrc.indexOf('function setLanguage'));
const dictionary = new Function(dictCode + '; return dictionary;')();
const keys = new Set([...html.matchAll(/data-i="([^"]+)"/g)].map((m) => m[1]));
for (const lang of ['en', 'hy', 'ru'])
  for (const k of keys) if (!(k in (dictionary[lang] || {}))) fail(`translation "${k}" missing in ${lang.toUpperCase()}`);
for (const k of Object.keys(dictionary.en))
  for (const lang of ['hy', 'ru']) if (!(k in dictionary[lang])) fail(`"${k}" is in EN but missing in ${lang.toUpperCase()}`);

// 6. Local files referenced by the page must exist
for (const m of html.matchAll(/(?:src|href)="([^"#?:]+\.[a-z0-9]+)"/gi)) {
  if (/^(https?:|\/\/|viber:|mailto:|tel:)/.test(m[1])) continue;
  if (!existsSync(join(root, m[1]))) fail(`referenced file not found: ${m[1]}`);
}

// 7. Unclosed-block guard for the main layout pieces
for (const tag of ['header', 'main', 'footer', 'section', 'dialog']) {
  const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  if (open !== close) fail(`<${tag}> opened ${open} times but closed ${close} times`);
}

if (errors.length) { console.error('\nCHECK FAILED:\n- ' + errors.join('\n- ')); process.exit(1); }
console.log(`OK: build current, script parses, ${ids.size} ids, ${keys.size} translation keys x 3 languages, files present.`);
