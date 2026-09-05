import { getStore } from '@netlify/blobs';
import { applyDealerWrite, roleOf } from '../lib/dealer.mjs';

const KEY = 'state';

export default async (req) => {
  const store = getStore('pokernight');

  if (req.method === 'GET') {
    const raw = await store.get(KEY);
    const state = raw ? JSON.parse(raw) : { version: 0, updatedAt: null, build: 0, data: null };
    return Response.json(state, { headers: { 'cache-control': 'no-store' } });
  }

  if (req.method === 'POST') {
    const role = roleOf(req);
    if (!role) return new Response('unauthorized', { status: 401 });
    const body = await req.json();
    if (body.verify) return Response.json({ ok: true, role });
    if (!body.data || !Array.isArray(body.data.players) || !Array.isArray(body.data.games)) {
      return new Response('bad request', { status: 400 });
    }

    const raw = await store.get(KEY);
    const cur = raw ? JSON.parse(raw) : { version: 0, updatedAt: null, build: 0, data: null };

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

    let data;
    if (role === 'dealer') {
      // nothing to run the table on yet — a dealer cannot seed the cloud
      if (!cur.data) return new Response('forbidden', { status: 403 });
      data = applyDealerWrite(cur.data, body.data);
    } else {
      data = {
        players: body.data.players,
        games: body.data.games,
        seasons: Array.isArray(body.data.seasons) ? body.data.seasons : (cur.data && cur.data.seasons) || [],
        settings: body.data.settings || {},
      };
    }

    const next = {
      version: (cur.version || 0) + 1,
      updatedAt: Date.now(),
      // highest build seen, so a device on an older one knows to refresh
      build: Math.max(cur.build || 0, Number(body.build) || 0),
      data,
    };
    await store.set(KEY, JSON.stringify(next));
    return Response.json({ version: next.version, role }, { headers: { 'cache-control': 'no-store' } });
  }

  return new Response('method not allowed', { status: 405 });
};

export const config = { path: '/api/state' };
