// Browser check of the admin panel "Заявки клиентов" tab against a tiny fake Supabase. node tests/admin-e2e.mjs [screenshot-dir]
import http from 'node:http';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.argv[2]; if (shots) mkdirSync(shots, { recursive: true });
const req = createRequire(import.meta.url);
let pw; for (const m of ['playwright', '/opt/node-tools/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { pw = req(m); break; } catch {} }
if (!pw) { console.error('Playwright is not installed'); process.exit(2); }

const now = Date.now();
const leads = [
  { id: 'l1', created_at: new Date(now - 3600e3).toISOString(), name: 'Anna', contact: '+374 99 123456', tour_interest: 'kyoto', travelers: 2, dates: 'April', budget: '3000 USD', readiness: 'warm', status: 'new', summary: 'Wants Kyoto in April.', transcript: [{ role: 'user', content: 'Hi' }, { role: 'assistant', content: 'Hello!' }] },
  { id: 'l2', created_at: new Date(now - 7200e3).toISOString(), name: '<img src=x onerror=alert(1)>', contact: 'anna@example.com', tour_interest: 'tokyo', travelers: 4, dates: 'May', budget: null, readiness: 'hot', status: 'new', summary: '<b>xss?</b> Ready to pay deposit.', transcript: null },
  { id: 'l3', created_at: new Date(now - 9000e3).toISOString(), name: 'Old', contact: '@olduser', readiness: 'cold', status: 'lost', summary: 's', transcript: null },
];
const patched = [];
const server = http.createServer(async (rq, rs) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Content-Type': 'application/json' };
  if (rq.method === 'OPTIONS') { rs.writeHead(204, h); return rs.end(); }
  let body = ''; for await (const c of rq) body += c;
  const u = rq.url;
  if (u.startsWith('/auth/v1/token')) { rs.writeHead(200, h); return rs.end('{"access_token":"t","refresh_token":"r"}'); }
  if (u.startsWith('/rest/v1/admins')) { rs.writeHead(200, h); return rs.end('[{"user_id":"u"}]'); }
  if (u.startsWith('/rest/v1/reviews')) { rs.writeHead(200, h); return rs.end('[]'); }
  if (u.startsWith('/rest/v1/leads')) {
    if (rq.method === 'PATCH') { const id = new URL('http://x' + u).searchParams.get('id').slice(3); patched.push([id, JSON.parse(body)]); leads.find((l) => l.id === id).status = JSON.parse(body).status; rs.writeHead(204, h); return rs.end(); }
    rs.writeHead(200, h); return rs.end(JSON.stringify(leads));
  }
  rs.writeHead(404, h); rs.end('{}');
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch(); let failed = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };
try {
  const pg = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const dialogs = []; pg.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });
  await pg.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `window.SUPABASE_CONFIG={url:"${base}",anonKey:"eyJtest"}` }));
  await pg.goto('file://' + join(root, 'admin.html'));
  await pg.fill('#email', 'a@b.co'); await pg.fill('#password', 'x'); await pg.click('#loginBtn');
  await pg.waitForSelector('#panel:not([hidden])');
  ok((await pg.textContent('#n-leads')) === '2', 'new-leads counter shows 2');
  await pg.click('.mode[data-mode=leads]');
  const titles = await pg.locator('#leadList article h3').allTextContents();
  ok(titles.length === 2 && titles[0].includes('<img'), 'hot lead is listed first and HTML is shown as text, not executed');
  ok(!(await pg.locator('#leadList img').count()) && !dialogs.length, 'no injected elements or dialogs (XSS-safe)');
  ok((await pg.getAttribute('#leadList a[href^="https://wa.me/"]', 'href')) === 'https://wa.me/37499123456', 'phone becomes a WhatsApp link');
  ok((await pg.getAttribute('#leadList a[href^="mailto:"]', 'href')) === 'mailto:anna@example.com', 'email becomes a mailto link');
  await pg.click('#leadList details summary'); ok(await pg.locator('#leadList .talk .m').count() === 2, 'transcript expands');
  if (shots) await pg.screenshot({ path: join(shots, 'admin-leads.png') });
  await pg.click('#leadList article >> nth=1 >> text=В работе');
  await pg.waitForFunction(() => document.getElementById('ln-contacted').textContent === '1');
  ok(patched.length === 1 && patched[0][1].status === 'contacted', 'status change is sent to the database');
  await pg.click('[data-lstatus=lost]'); ok((await pg.locator('#leadList article h3').count()) === 1, 'lost tab lists the lost lead');
  await pg.click('.mode[data-mode=reviews]'); ok(await pg.locator('#reviewsView').isVisible(), 'reviews view still works');
} finally { await browser.close(); server.close(); }
if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nAdmin leads tab: all checks passed');
