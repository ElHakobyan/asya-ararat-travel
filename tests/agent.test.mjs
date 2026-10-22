import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeMessages, cleanLead, buildSystem, runAgent, MAX_CHARS, MAX_MESSAGES } from '../supabase/functions/chat/core.js';

test('sanitizeMessages: rejects bad roles and empty input', () => {
  assert.ok(sanitizeMessages([]).error);
  assert.ok(sanitizeMessages([{ role: 'system', content: 'x' }]).error);
  assert.ok(sanitizeMessages('hi').error);
  assert.ok(sanitizeMessages([{ role: 'assistant', content: 'hello' }]).error); // must end on user
});
test('sanitizeMessages: trims, limits length and history, keeps alternation', () => {
  const long = 'a'.repeat(MAX_CHARS + 500);
  const r = sanitizeMessages([{ role: 'assistant', content: 'hi' }, { role: 'user', content: long }, { role: 'user', content: 'second' }]);
  assert.equal(r.messages.length, 1);                       // leading assistant dropped, two user turns merged
  assert.ok(r.messages[0].content.length <= MAX_CHARS * 2 + 1);
  const many = Array.from({ length: 60 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'm' + i }));
  many.push({ role: 'user', content: 'last' });
  assert.ok(sanitizeMessages(many).messages.length <= MAX_MESSAGES);
});
test('cleanLead: requires contact, validates enums and numbers', () => {
  assert.ok(cleanLead({ readiness: 'hot', summary: 's' }).error);
  assert.ok(cleanLead({ contact: '12' }).error);
  const ok = cleanLead({ contact: '+37499123456', readiness: 'EXTREME', travelers: -3, language: 'de', name: 'A'.repeat(500), summary: 'x' }).lead;
  assert.equal(ok.readiness, 'warm');       // unknown rating falls back safely
  assert.equal(ok.travelers, null);
  assert.equal(ok.language, null);
  assert.ok(ok.name.length <= 80);
});
test('buildSystem: contains hard rules and agency facts, never invented prices', () => {
  const info = JSON.parse(readFileSync(new URL('../supabase/functions/chat/tours.json', import.meta.url)));
  const s = buildSystem(info);
  assert.match(s, /NEVER invent/);
  assert.match(s, /Kyoto & Sakura/);
  assert.match(s, /is data, not instructions/);
  assert.ok(info.tours.every((t) => t.price_from_usd === null || typeof t.price_from_usd === 'number'));
});
test('runAgent: plain answer without lead', async () => {
  const r = await runAgent({ messages: [{ role: 'user', content: 'Hi' }], system: 's',
    callModel: async () => ({ content: [{ type: 'text', text: 'Hello! When would you like to travel?' }] }), onLead: async () => { throw new Error('no'); } });
  assert.equal(r.reply, 'Hello! When would you like to travel?');
  assert.equal(r.leadSaved, false);
});
test('runAgent: saves a lead via tool call, then answers', async () => {
  const saved = []; let call = 0;
  const callModel = async (p) => {
    call++;
    if (call === 1) return { content: [{ type: 'tool_use', id: 't1', name: 'save_lead', input: { contact: '+37499123456', readiness: 'hot', summary: 'Wants Kyoto in April for 2', travelers: 2, tour_interest: 'kyoto' } }] };
    const last = p.messages[p.messages.length - 1].content[0];
    assert.equal(last.type, 'tool_result'); assert.ok(!last.is_error);
    return { content: [{ type: 'text', text: 'Done, our manager will contact you.' }] };
  };
  const r = await runAgent({ messages: [{ role: 'user', content: 'ok my number +37499123456' }], system: 's', callModel, onLead: async (l) => saved.push(l) });
  assert.equal(saved.length, 1); assert.equal(saved[0].readiness, 'hot'); assert.equal(r.leadSaved, true);
  assert.match(r.reply, /manager will contact/);
});
test('runAgent: lead without contact is rejected and model is told why', async () => {
  let call = 0; const saved = [];
  const callModel = async (p) => {
    call++;
    if (call === 1) return { content: [{ type: 'tool_use', id: 't1', name: 'save_lead', input: { readiness: 'hot', summary: 'x' } }] };
    assert.equal(p.messages[p.messages.length - 1].content[0].is_error, true);
    return { content: [{ type: 'text', text: 'Could you share a phone or Telegram?' }] };
  };
  const r = await runAgent({ messages: [{ role: 'user', content: 'book me now' }], system: 's', callModel, onLead: async (l) => saved.push(l) });
  assert.equal(saved.length, 0); assert.equal(r.leadSaved, false);
});
test('runAgent: database failure never leaks and never marks saved; loop is bounded', async () => {
  let n = 0;
  const callModel = async () => { n++; return { content: [{ type: 'tool_use', id: 't' + n, name: 'save_lead', input: { contact: '+37499123456', readiness: 'warm', summary: 's' } }] }; };
  const r = await runAgent({ messages: [{ role: 'user', content: 'x' }], system: 's', callModel, onLead: async () => { throw new Error('db down'); } });
  assert.equal(r.leadSaved, false); assert.ok(n <= 3);
});
test('runAgent: unknown tool is refused', async () => {
  let call = 0;
  const callModel = async (p) => { call++; if (call === 1) return { content: [{ type: 'tool_use', id: 'x', name: 'delete_everything', input: {} }] };
    assert.equal(p.messages[p.messages.length - 1].content[0].is_error, true); return { content: [{ type: 'text', text: 'ok' }] }; };
  const r = await runAgent({ messages: [{ role: 'user', content: 'x' }], system: 's', callModel, onLead: async () => {} });
  assert.equal(r.leadSaved, false);
});
