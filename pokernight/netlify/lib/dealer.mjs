// Shared between the state function and its tests, so what the tests prove is
// the same code the server runs.
import { createHash, timingSafeEqual } from 'node:crypto';

export const DEALER_CODE_LEN = 12;

// A dealer code is derived from the admin password, so the admin's own device
// can hand one out without ever revealing the password itself.
export const dealerCode = pass =>
  createHash('sha256').update('pn-dealer|' + pass).digest('hex').slice(0, DEALER_CODE_LEN);

// constant-time compare that tolerates different lengths
export function eq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function roleOfKey(given) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return null;
  if (eq(given, expected)) return 'admin';
  if (eq(String(given || '').toLowerCase(), dealerCode(expected))) return 'dealer';
  return null;
}
export const roleOf = req => roleOfKey(req.headers.get('x-admin-key') || '');

/* ---- what a dealer is allowed to change ----
   Running the table: entries, who is sitting, and the clock — on a game that
   is already live. Everything else is taken from the copy the server already
   holds, so a dealer cannot finish, edit, delete or reprice a game even by
   sending a doctored payload. ---- */
const DEALER_GAME_FIELDS = ['entries', 'playerIds', 'timer', 'updatedAt', 'updatedBy'];

export function applyDealerWrite(cur, incoming) {
  const base = cur || { players: [], games: [], seasons: [], settings: {} };
  const curGames = base.games || [];
  const inGames = new Map((incoming.games || []).map(g => [g.id, g]));

  // new faces added at the table are kept; existing player records are untouched
  const known = new Set((base.players || []).map(p => p.id));
  const added = (incoming.players || []).filter(p => p && p.id && !known.has(p.id));
  const seatable = new Set([...known, ...added.map(p => p.id)]);

  const games = curGames.map(g => {
    const nx = inGames.get(g.id);
    // only a live, undeleted game is open to a dealer
    if (!nx || g.status !== 'active' || g.deleted) return g;
    const out = Object.assign({}, g);
    for (const f of DEALER_GAME_FIELDS) if (nx[f] !== undefined) out[f] = nx[f];
    // only real players may be seated, and entries must belong to someone seated
    out.playerIds = (Array.isArray(out.playerIds) ? out.playerIds : g.playerIds || [])
      .filter(id => seatable.has(id));
    out.entries = (Array.isArray(out.entries) ? out.entries : g.entries || [])
      .filter(e => e && out.playerIds.includes(e.pid));
    // the parts a dealer may never touch come back from the stored copy
    out.status = g.status;
    out.results = g.results;
    out.config = g.config;
    out.type = g.type;
    out.date = g.date;
    out.deleted = g.deleted;
    return out;
  });

  return {
    players: (base.players || []).concat(added),
    games,
    seasons: base.seasons || [],
    settings: base.settings || {},
  };
}
