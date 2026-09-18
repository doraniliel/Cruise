import { getStore } from '@netlify/blobs';
import { roleOf } from '../lib/dealer.mjs';

/* One picture per game night.
   Photos live under their own blob key rather than inside the state document,
   so the copy every device pushes on every rebuy stays small. The index is
   tiny and can be fetched freely; the picture itself is only fetched when
   somebody actually opens that night. */
const INDEX = 'photoindex';
const keyFor = id => 'photo:' + id;
const MAX_BYTES = 2_500_000;   // a compressed phone photo lands far below this

const readIndex = async store => {
  const raw = await store.get(INDEX);
  return raw ? JSON.parse(raw) : {};
};

export default async (req) => {
  const store = getStore('pokernight');
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    if (!id) {
      return Response.json(await readIndex(store), { headers: { 'cache-control': 'no-store' } });
    }
    const raw = await store.get(keyFor(id));
    if (!raw) return Response.json({}, { headers: { 'cache-control': 'no-store' } });
    // a picture never changes once written, so it may be cached hard
    return new Response(raw, {
      headers: { 'content-type': 'application/json', 'cache-control': 'private, max-age=86400' },
    });
  }

  // whoever is running the night may attach the photo; only the admin removes one
  if (req.method === 'POST') {
    const role = roleOf(req);
    if (!role) return new Response('unauthorized', { status: 401 });
    const body = await req.json();
    const id = String(body.gameId || '').slice(0, 64);
    if (!id) return new Response('bad request', { status: 400 });
    const index = await readIndex(store);

    if (body.action === 'delete') {
      if (role !== 'admin') return new Response('forbidden', { status: 403 });
      await store.delete(keyFor(id));
      delete index[id];
      await store.set(INDEX, JSON.stringify(index));
      return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
    }

    const photo = String(body.photo || '');
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo)) {
      return new Response('bad request', { status: 400 });
    }
    if (photo.length > MAX_BYTES) return new Response('payload too large', { status: 413 });

    const by = String(body.by || '').slice(0, 40);
    const rec = { id, photo, ts: Date.now(), by };
    await store.set(keyFor(id), JSON.stringify(rec));
    index[id] = { ts: rec.ts, by };
    await store.set(INDEX, JSON.stringify(index));
    return Response.json({ ok: true, ts: rec.ts }, { headers: { 'cache-control': 'no-store' } });
  }

  return new Response('method not allowed', { status: 405 });
};

export const config = { path: '/api/photos' };
