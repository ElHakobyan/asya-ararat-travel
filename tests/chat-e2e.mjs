// End-to-end check of the chat widget: real front-end + real agent core, with a scripted model instead of Claude.
// Needs Playwright (already installed in the dev environment). Run: node tests/chat-e2e.mjs [screenshot-dir]
import http from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeMessages, buildSystem, runAgent } from '../supabase/functions/chat/core.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = process.argv[2]; if (shots) mkdirSync(shots, { recursive: true });
const info = JSON.parse(readFileSync(join(root, 'supabase/functions/chat/tours.json'), 'utf8'));
const leads = [];

const scripted = async ({ messages }) => {
  const last = messages[messages.length - 1];
  if (Array.isArray(last.content)) return { content: [{ type: 'text', text: 'Thank you, Anna! Our manager will message you on WhatsApp shortly. You can also write to +374 93 10 83 03.' }] };
  const t = String(last.content);
  if (/\+?\d[\d\s-]{7,}/.test(t)) return { content: [{ type: 'tool_use', id: 'tu1', name: 'save_lead', input: { name: 'Anna', contact: t.match(/\+?\d[\d\s-]{7,}/)[0].trim(), tour_interest: 'kyoto', travelers: 2, dates: 'April', readiness: 'hot', summary: 'Wants Kyoto & Sakura in April for 2 people, asked how to book.', language: 'en' } }] };
  if (/cost|price/i.test(t)) return { content: [{ type: 'text', text: 'Prices depend on the dates and group size, and our manager confirms the exact offer. Which tour interests you most, and how many people are travelling?' }] };
  return { content: [{ type: 'text', text: 'Great choice! Kyoto in April is the cherry blossom season. For how many people and which dates? If you leave a WhatsApp number I can pass it to our manager.' }] };
};

const server = http.createServer(async (req, res) => {
  const h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') { res.writeHead(204, h); return res.end(); }
  if (req.url.startsWith('/rest/')) { res.writeHead(200, h); return res.end('{"total":0,"average":0,"counts":{}}'); }
  let body = ''; for await (const c of req) body += c;
  const s = sanitizeMessages(JSON.parse(body).messages);
  if (s.error) { res.writeHead(400, h); return res.end(JSON.stringify({ error: s.error })); }
  const out = await runAgent({ messages: s.messages, system: buildSystem(info), callModel: scripted, onLead: async (l) => { leads.push(l); } });
  res.writeHead(200, h); res.end(JSON.stringify({ reply: out.reply, leadSaved: out.leadSaved }));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
let pw; for (const m of ['playwright', '/opt/node-tools/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { pw = req(m); break; } catch {} }
if (!pw) { console.error('Playwright is not installed: npm i -D playwright'); process.exit(2); }
const { chromium } = pw;
const browser = await chromium.launch();
let failed = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };
try {
  // 1) without Supabase the chat must stay hidden (site works as before)
  let pg = await browser.newPage();
  await pg.goto('file://' + join(root, 'index.html')); await pg.waitForTimeout(300);
  ok(await pg.locator('#chat').isHidden(), 'chat hidden while Supabase is not configured');
  await pg.close();

  // 2) with the config the whole flow works
  for (const [name, vp] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 780 }]]) {
    pg = await browser.newPage({ viewport: vp });
    const errors = []; pg.on('pageerror', (e) => errors.push(String(e)));
    await pg.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: `window.SUPABASE_CONFIG={url:"${base}",anonKey:"eyJtest"}` }));
    await pg.goto('file://' + join(root, 'index.html')); await pg.waitForTimeout(400);
    ok(await pg.locator('#chatFab').isVisible(), `[${name}] chat button visible`);
    await pg.click('#chatFab');
    ok(await pg.locator('#chatPanel').isVisible(), `[${name}] panel opens`);
    ok((await pg.locator('.msg.bot').first().textContent()).includes('Asya Ararat'), `[${name}] greeting shown`);
    await pg.click('#chatChips button >> nth=0');
    await pg.waitForSelector('.msg.bot:not(.typing) >> nth=1'); 
    ok((await pg.locator('.msg.bot').nth(1).textContent()).includes('manager confirms'), `[${name}] answer to a price question never invents a price`);
    await pg.fill('#chatInput', 'Kyoto in April for 2. My WhatsApp +374 99 123456'); await pg.press('#chatInput', 'Enter');
    await pg.waitForFunction(() => document.querySelectorAll('.msg.bot').length >= 3 && !document.querySelector('.msg.typing'));
    ok(leads.length >= 1 && leads[leads.length - 1].readiness === 'hot', `[${name}] hot lead saved with contact`);
    ok((await pg.locator('.msg.bot').last().textContent()).includes('manager will message'), `[${name}] client told what happens next`);
    if (shots) await pg.screenshot({ path: join(shots, `chat-${name}.png`) });
    // 3) language switch relabels the widget
    await pg.evaluate(() => { const s = document.getElementById('lang'); s.value = 'ru'; s.dispatchEvent(new Event('change')); });
    ok((await pg.getAttribute('#chatInput', 'placeholder')) === 'Напишите вопрос…', `[${name}] placeholder follows language`);
    if (shots && name === 'desktop') await pg.screenshot({ path: join(shots, 'chat-desktop-ru.png') });
    // 4) Escape closes
    await pg.keyboard.press('Escape'); ok(await pg.locator('#chatPanel').isHidden(), `[${name}] Escape closes the panel`);
    ok(errors.length === 0, `[${name}] no page errors ${errors.join('|')}`);
    await pg.close();
  }
  // 4) server down: friendly error with WhatsApp link, no crash
  pg = await browser.newPage();
  await pg.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.SUPABASE_CONFIG={url:"http://127.0.0.1:9",anonKey:"eyJtest"}' }));
  await pg.goto('file://' + join(root, 'index.html')); await pg.click('#chatFab'); await pg.fill('#chatInput', 'hello'); await pg.press('#chatInput', 'Enter');
  await pg.waitForSelector('.msg.bot a'); ok((await pg.getAttribute('.msg.bot a', 'href')).includes('wa.me/37493108303'), 'offline: error message links to WhatsApp');
  await pg.close();
} finally { await browser.close(); server.close(); }
if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nChat widget: all checks passed');
