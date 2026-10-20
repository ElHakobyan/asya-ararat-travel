// Branch-zone guard: a branch named header/..., footer/... or content/...
// may only change the files of that part of the site.
// Usage: node tests/zones.mjs [branch] [base]   (CI passes them automatically)
import { execFileSync } from 'node:child_process';

const branch = process.argv[2] || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME ||
  execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
const base = process.argv[3] || 'origin/main';

const shared = [/^index\.html$/, /^src\/css\//, /^src\/js\/01-i18n\.js$/, /^tests\//, /^README\.md$/];
const zones = {
  header: [/^src\/partials\/header\.html$/, /^src\/js\/0[34]-/, /^logo/, /^favicon/, /^apple-touch/],
  footer: [/^src\/partials\/(footer|whatsapp-float)\.html$/],
  content: [/^src\/partials\/(hero|perks|tours|about|gallery|reviews|contact|lightbox|review-dialog)\.html$/,
            /^src\/js\/0[256]-/, /^[\w-]+\.(jpg|png)$/, /^(admin\.html|config\.js|supabase-setup\.sql)$/],
};

const zone = branch.split('/')[0];
if (!(zone in zones)) { console.log(`Branch "${branch}": no zone rule, nothing to check.`); process.exit(0); }

let files;
try { files = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`]).toString().split('\n').filter(Boolean); }
catch { console.log(`Cannot compare with ${base}; skipping zone check.`); process.exit(0); }

const allowed = [...shared, ...zones[zone]];
const outside = files.filter((f) => !allowed.some((re) => re.test(f)));
if (outside.length) {
  console.error(`Branch "${branch}" is a ${zone.toUpperCase()} branch but changes files outside that zone:\n- ${outside.join('\n- ')}\n` +
    'Move those changes to their own branch, or rename this branch.');
  process.exit(1);
}
console.log(`Zone check OK: ${files.length} changed file(s), all inside "${zone}".`);
