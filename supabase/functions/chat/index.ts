// Supabase Edge Function "chat": the website's AI sales agent.
// Secrets it needs (set in Supabase, never in the repo):
//   ANTHROPIC_API_KEY        - from console.anthropic.com
//   TELEGRAM_BOT_TOKEN       - from @BotFather      (optional: manager notifications)
//   TELEGRAM_CHAT_ID         - your chat id          (optional)
//   IP_SALT                  - any random string     (hashes visitor IPs for rate limits)
//   DAILY_CAP                - max chat requests per day for the whole site (default 1500)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by Supabase.
import { MODEL, buildSystem, runAgent, sanitizeMessages } from './core.js';

const ALLOWED_ORIGINS = ['https://elhakobyan.github.io', 'http://localhost:8080', 'http://127.0.0.1:8080'];
const env = (k: string, d = '') => Deno.env.get(k) ?? d;

const SB_URL = env('SUPABASE_URL');
const SB_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

const info = JSON.parse(await Deno.readTextFile(new URL('./tours.json', import.meta.url)));
const SYSTEM = buildSystem(info);
const PHONE = info?.agency?.phone ?? '';

function cors(origin: string | null) {
  const ok = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin! : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
const json = (b: unknown, status: number, h: Record<string, string>) =>
  new Response(JSON.stringify(b), { status, headers: { ...h, 'Content-Type': 'application/json' } });

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env('IP_SALT', 'asya') + s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function countSince(filter: string): Promise<number> {
  const r = await fetch(`${SB_URL}/rest/v1/chat_events?select=id&${filter}`, {
    method: 'HEAD', headers: { ...sbHeaders, Prefer: 'count=exact' },
  });
  const range = r.headers.get('content-range') ?? '*/0';
  return Number(range.split('/')[1]) || 0;
}

async function logEvent(ipHash: string) {
  await fetch(`${SB_URL}/rest/v1/chat_events`, {
    method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify({ ip_hash: ipHash }),
  });
}

async function callModel(payload: { system: string; messages: unknown[]; tools: unknown[] }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system: [{ type: 'text', text: payload.system, cache_control: { type: 'ephemeral' } }],
      messages: payload.messages,
      tools: payload.tools,
    }),
  });
  if (!r.ok) throw new Error('model ' + r.status);
  return await r.json();
}

async function saveLead(lead: Record<string, unknown>, transcript: unknown, sessionId: string) {
  const r = await fetch(`${SB_URL}/rest/v1/leads`, {
    method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ ...lead, session_id: sessionId, transcript }),
  });
  if (!r.ok) throw new Error('db ' + r.status);
  await notify(lead);
}

async function notify(l: Record<string, unknown>) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat || l.readiness === 'cold') return;
  const icon = l.readiness === 'hot' ? '🔥 ГОРЯЧИЙ' : '🟡 Тёплый';
  const text = [
    `${icon} клиент с сайта`,
    `Имя: ${l.name ?? '—'}`, `Контакт: ${l.contact}`,
    `Тур: ${l.tour_interest ?? '—'}  ·  Людей: ${l.travelers ?? '—'}`,
    `Даты: ${l.dates ?? '—'}  ·  Бюджет: ${l.budget ?? '—'}`,
    '', String(l.summary),
  ].join('\n');
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }),
  }).catch(() => {});
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  if (req.method !== 'POST') return json({ error: 'method' }, 405, h);

  let body: { messages?: unknown; session?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
  const s = sanitizeMessages(body.messages);
  if (s.error) return json({ error: s.error }, 400, h);
  const sessionId = String(body.session ?? '').slice(0, 64) || crypto.randomUUID();

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = await sha256(ip);
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [perIp, perDay] = await Promise.all([
    countSince(`ip_hash=eq.${ipHash}&created_at=gte.${hourAgo}`),
    countSince(`created_at=gte.${dayAgo}`),
  ]);
  if (perIp >= 40 || perDay >= Number(env('DAILY_CAP', '1500'))) {
    return json({ reply: `Сейчас много обращений. Напишите нам напрямую: ${PHONE} (WhatsApp / Viber / Telegram).`, limited: true }, 429, h);
  }
  await logEvent(ipHash);

  try {
    const out = await runAgent({
      messages: s.messages!, system: SYSTEM, callModel,
      onLead: (lead: Record<string, unknown>) => saveLead(lead, s.messages, sessionId),
    });
    return json({ reply: out.reply || `Напишите нам: ${PHONE}`, leadSaved: out.leadSaved }, 200, h);
  } catch (_e) {
    return json({ reply: `Не получилось ответить. Напишите нам напрямую: ${PHONE}.`, error: true }, 200, h);
  }
});
