import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'node:crypto';

const KEY = 'state';

function keyOk(req) {
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
    const state = raw ? JSON.parse(raw) : { version: 0, updatedAt: null, data: null };
    return Response.json(state, { headers: { 'cache-control': 'no-store' } });
  }

  if (req.method === 'POST') {
    if (!keyOk(req)) return new Response('unauthorized', { status: 401 });
    const body = await req.json();
    if (body.verify) return Response.json({ ok: true });
    if (!body.data || !Array.isArray(body.data.players) || !Array.isArray(body.data.games)) {
      return new Response('bad request', { status: 400 });
    }

    const raw = await store.get(KEY);
    const cur = raw ? JSON.parse(raw) : { version: 0, updatedAt: null, data: null };

    // A client that does not declare which version it edited cannot be trusted
    // not to clobber newer work — that is how a finished game lost its results.
    // Old cached builds land here and are refused until they reload.
    if (typeof body.baseVersion !== 'number' && cur.version > 0) {
      return Response.json(
        { staleClient: true, message: 'refresh required', version: cur.version },
        { status: 426, headers: { 'cache-control': 'no-store' } }
      );
    }

    // Optimistic concurrency: a device that built its upload on an older
    // version must not overwrite newer work (that is how a finished game used
    // to come back to life). Hand it the current state so it can merge.
    if (typeof body.baseVersion === 'number' && body.baseVersion !== cur.version) {
      return Response.json(
        { conflict: true, version: cur.version, updatedAt: cur.updatedAt, data: cur.data },
        { status: 409, headers: { 'cache-control': 'no-store' } }
      );
    }

    const next = {
      version: (cur.version || 0) + 1,
      updatedAt: Date.now(),
      data: { players: body.data.players, games: body.data.games, settings: body.data.settings || {} },
    };
    await store.set(KEY, JSON.stringify(next));
    return Response.json({ version: next.version }, { headers: { 'cache-control': 'no-store' } });
  }

  return new Response('method not allowed', { status: 405 });
};

export const config = { path: '/api/state' };
