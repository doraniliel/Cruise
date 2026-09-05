import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'node:crypto';

const KEY = 'comments';
const MAX_PER_PLAYER = 200;

function adminOk(req) {
  const given = req.headers.get('x-admin-key') || '';
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async (req) => {
  const store = getStore('pokernight');

  if (req.method === 'GET') {
    const raw = await store.get(KEY);
    return Response.json(raw ? JSON.parse(raw) : {}, { headers: { 'cache-control': 'no-store' } });
  }

  // Anyone signed in may post a wall comment; only the admin may delete one.
  if (req.method === 'POST') {
    const body = await req.json();
    const raw = await store.get(KEY);
    const all = raw ? JSON.parse(raw) : {};
    const pid = String(body.playerId || '').slice(0, 64);
    if (!pid) return new Response('bad request', { status: 400 });

    if (body.action === 'delete') {
      if (!adminOk(req)) return new Response('unauthorized', { status: 401 });
      all[pid] = (all[pid] || []).filter(c => c.id !== body.id);
    } else {
      const author = String(body.author || '').trim().slice(0, 40);
      const text = String(body.text || '').trim().slice(0, 300);
      if (!author || !text) return new Response('bad request', { status: 400 });
      const list = all[pid] || (all[pid] = []);
      list.push({ id: crypto.randomUUID(), author, text, ts: Date.now() });
      if (list.length > MAX_PER_PLAYER) list.splice(0, list.length - MAX_PER_PLAYER);
    }

    for (const k of Object.keys(all)) if (!all[k] || !all[k].length) delete all[k]; // drop empty walls
    await store.set(KEY, JSON.stringify(all));
    return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  }

  return new Response('method not allowed', { status: 405 });
};

export const config = { path: '/api/comments' };
