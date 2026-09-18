// A dealer runs the table and nothing else — in the UI and, more importantly,
// on the server. Run with: node test/dealer.test.js  (from the pokernight folder)
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp3':'audio/mpeg' };
const PASS = 'RaiseKing!59';

let failures = 0;
const ok = (n, c) => { if (!c) failures++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + n); };

(async () => {
  // the real server rules, not a paraphrase of them
  const { applyDealerWrite, dealerCode } = await import('../netlify/lib/dealer.mjs');
  const CODE = dealerCode(PASS);

  let cloud = { version: 0, updatedAt: null, build: 0, data: null };
  const roleOf = k => k === PASS ? 'admin' : (k || '').toLowerCase() === CODE ? 'dealer' : null;

  function mkServer() {
    return http.createServer((q, r) => {
      const p = q.url.split('?')[0];
      if (p === '/api/state') {
        if (q.method === 'GET') { r.setHeader('Content-Type','application/json'); r.end(JSON.stringify(cloud)); return; }
        const role = roleOf(q.headers['x-admin-key'] || '');
        if (!role) { r.statusCode = 401; r.end(); return; }
        let body = ''; q.on('data', c => body += c);
        q.on('end', () => {
          const j = JSON.parse(body);
          r.setHeader('Content-Type','application/json');
          if (j.verify) { r.end(JSON.stringify({ ok: true, role })); return; }
          if (typeof j.baseVersion !== 'number' && cloud.version > 0) { r.statusCode = 426; r.end('{}'); return; }
          if (typeof j.baseVersion === 'number' && j.baseVersion !== cloud.version) {
            r.statusCode = 409;
            r.end(JSON.stringify({ conflict:true, version:cloud.version, data:cloud.data })); return;
          }
          let data;
          if (role === 'dealer') {
            if (!cloud.data) { r.statusCode = 403; r.end('{}'); return; }
            data = applyDealerWrite(cloud.data, j.data);
          } else {
            data = { players: j.data.players, games: j.data.games,
                     seasons: j.data.seasons || [], settings: j.data.settings || {} };
          }
          cloud = { version: cloud.version + 1, updatedAt: Date.now(),
                    build: Math.max(cloud.build || 0, Number(j.build) || 0), data };
          r.end(JSON.stringify({ version: cloud.version, role }));
        });
        return;
      }
      if (p === '/api/comments') { r.setHeader('Content-Type','application/json'); r.end('{}'); return; }
      const f = path.join(ROOT, p === '/' ? '/index.html' : p);
      if (fs.existsSync(f)) { r.setHeader('Content-Type', MIME[path.extname(f)] || 'text/plain'); r.end(fs.readFileSync(f)); }
      else { r.statusCode = 404; r.end(); }
    });
  }

  /* ---------- part 1: the server rules on their own ---------- */
  const live = {
    players: [{ id:'p1', name:'רון' }, { id:'p2', name:'ליאל' }],
    games: [{ id:'g1', status:'active', type:'tournament', date:'2026-01-01', deleted:false,
              playerIds:['p1','p2'], entries:[{id:'e1',pid:'p1',delta:1,ts:1}],
              config:{ entryPrice:30 }, results:null, timer:{ idx:0, running:true } }],
    seasons: [], settings: { entryPrice: 30 },
  };
  let out = applyDealerWrite(live, JSON.parse(JSON.stringify({
    ...live,
    games: [{ ...live.games[0], entries: live.games[0].entries.concat([{id:'e2',pid:'p2',delta:1,ts:2}]) }],
  })));
  ok('dealer may add an entry to the live game', out.games[0].entries.length === 2);

  out = applyDealerWrite(live, { players: live.players, games: [
    { ...live.games[0], status:'done', results:{ first:'p1', second:'p2' } }] });
  ok('dealer cannot finish a game', out.games[0].status === 'active' && out.games[0].results === null);

  out = applyDealerWrite(live, { players: live.players, games: [
    { ...live.games[0], deleted: true, deletedAt: Date.now() }] });
  ok('dealer cannot delete a game', out.games[0].deleted === false);

  out = applyDealerWrite(live, { players: live.players, games: [
    { ...live.games[0], config: { entryPrice: 5 } }] });
  ok('dealer cannot change the buy-in', out.games[0].config.entryPrice === 30);

  out = applyDealerWrite(live, { players: live.players, games: live.games,
    settings: { entryPrice: 1, splitHouse: 90 } });
  ok('dealer cannot change settings', out.settings.entryPrice === 30);

  const finished = { ...live, games: [{ ...live.games[0], status:'done',
    results:{ first:'p1', second:'p2' }, entries:[{id:'e1',pid:'p1',delta:1,ts:1}] }] };
  out = applyDealerWrite(finished, { players: finished.players, games: [
    { ...finished.games[0], entries: [{id:'e1',pid:'p1',delta:1,ts:1},{id:'e9',pid:'p1',delta:5,ts:9}] }] });
  ok('dealer cannot rewrite a finished game', out.games[0].entries.length === 1);

  out = applyDealerWrite(live, { players: live.players.concat([{ id:'p3', name:'אורח' }]),
    games: [{ ...live.games[0], playerIds:['p1','p2','p3'],
              entries: live.games[0].entries.concat([{id:'e3',pid:'p3',delta:1,ts:3}]) }] });
  ok('dealer may seat a brand-new player', out.players.length === 3 && out.games[0].playerIds.length === 3);

  out = applyDealerWrite(live, { players: live.players, games: [
    { ...live.games[0], playerIds:['p1','p2','ghost'],
      entries: live.games[0].entries.concat([{id:'e4',pid:'ghost',delta:9,ts:4}]) }] });
  ok('entries for a player who does not exist are dropped',
     !out.games[0].playerIds.includes('ghost') && !out.games[0].entries.some(e => e.pid === 'ghost'));

  out = applyDealerWrite(live, { players: [{ id:'p1', name:'שונה' }], games: live.games });
  ok('dealer cannot rename an existing player', out.players.find(p => p.id === 'p1').name === 'רון');

  ok('the dealer code is 12 hex characters', /^[0-9a-f]{12}$/.test(CODE));
  ok('the dealer code is not the password', CODE !== PASS && !CODE.includes(PASS));

  /* ---------- part 2: the app ---------- */
  const s1 = mkServer(), s2 = mkServer(); s1.listen(8190); s2.listen(8191);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const admin = await b.newPage({ viewport: { width: 390, height: 844 } });
  const dealer = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  admin.on('pageerror', e => errs.push('admin: ' + e.message));
  dealer.on('pageerror', e => errs.push('dealer: ' + e.message));

  await admin.goto('http://localhost:8190/'); await admin.waitForTimeout(250);
  await admin.locator('.chip', { hasText: 'מנהל' }).click();
  await admin.fill('#lg-user', 'pitboss'); await admin.fill('#lg-pass', PASS);
  await admin.locator('button', { hasText: 'כניסת מנהל' }).click(); await admin.waitForTimeout(500);

  await admin.evaluate(() => {
    S.players = [
      { id:'a', name:'רון', active:true, updatedAt:1 },
      { id:'b', name:'ליאל', active:true, updatedAt:1 },
      { id:'c', name:'דור', active:true, updatedAt:1 },
    ];
    save();
  });
  await admin.waitForTimeout(400);

  // the code the admin sees must be the code the server accepts
  await admin.evaluate(() => go('settings'));
  await admin.waitForTimeout(400);
  const shown = (await admin.textContent('#dealer-code')).replace(/-/g, '').toLowerCase();
  ok('the admin screen shows the code the server derives', shown === CODE);

  await admin.evaluate(() => go('newgame')); await admin.waitForTimeout(200);
  for (const n of ['רון', 'ליאל', 'דור']) await admin.locator('#ng-chips .chip', { hasText: n }).first().click();
  await admin.locator('button', { hasText: 'התחלת טורניר' }).click();
  await admin.waitForTimeout(700);
  ok('the admin started a tournament', await admin.evaluate(() => !!activeGame()));

  // a wrong code is refused
  await dealer.goto('http://localhost:8191/'); await dealer.waitForTimeout(250);
  await dealer.locator('.chip', { hasText: 'דילר' }).click();
  await dealer.fill('#lg-dname', 'עידו');
  await dealer.fill('#lg-code', 'AAAA-BBBB-CCCC');
  await dealer.locator('#lg-dbtn').click(); await dealer.waitForTimeout(600);
  ok('a wrong dealer code does not sign anyone in',
     await dealer.evaluate(() => !SESSION));

  // the real one is accepted
  const pretty = (CODE.toUpperCase().match(/.{1,4}/g) || []).join('-');
  await dealer.fill('#lg-code', pretty);
  await dealer.locator('#lg-dbtn').click(); await dealer.waitForTimeout(900);
  ok('the real dealer code signs the dealer in',
     await dealer.evaluate(() => !!SESSION && SESSION.role === 'dealer'));
  ok('the dealer lands on the live game',
     await dealer.evaluate(() => !!activeGame()));

  await dealer.evaluate(() => { go('game'); }); await dealer.waitForTimeout(400);
  ok('the dealer gets the + buttons', await dealer.locator('.btn-plus').count() === 3);
  ok('the dealer has no finish button',
     await dealer.locator('button', { hasText: 'סיום משחק' }).count() === 0);
  ok('the dealer has no settings tab in the nav',
     await dealer.locator('nav button', { hasText: 'הגדרות' }).count() === 0);
  ok('the dealer has no history tab in the nav',
     await dealer.locator('nav button', { hasText: 'היסטוריה' }).count() === 0);

  // a rebuy typed by the dealer reaches the admin's device
  const before = await admin.evaluate(() => totalEntries(activeGame()));
  await dealer.locator('.btn-plus').first().click();
  await dealer.waitForTimeout(1400);
  ok('the dealer’s rebuy reached the cloud',
     ((cloud.data.games[0].entries || []).reduce((s, e) => s + e.delta, 0)) === before + 1);
  await admin.waitForTimeout(3600);
  ok('the rebuy shows up on the admin device',
     await admin.evaluate(() => totalEntries(activeGame())) === before + 1);

  // and it can be taken straight back
  await dealer.locator('#toast .undo').click();
  await dealer.waitForTimeout(1400);
  ok('the undo button removes the entry again',
     await dealer.evaluate(() => totalEntries(activeGame())) === before);

  // a dealer who tries to finish the game anyway gets nowhere
  await dealer.evaluate(() => { beginEndGame(); });
  await dealer.waitForTimeout(300);
  ok('beginEndGame does nothing for a dealer',
     await dealer.locator('.overlay').count() === 0);

  await dealer.evaluate(() => {
    const g = activeGame();
    g.status = 'done'; g.results = { first: g.playerIds[0], second: g.playerIds[1] };
    touchGame(g); saveLocal(); pushState();
  });
  await dealer.waitForTimeout(1400);
  ok('the server refuses a hand-made finish from a dealer',
     cloud.data.games[0].status === 'active' && !cloud.data.games[0].results);

  // the admin can still finish it properly
  await admin.evaluate(() => { go('game'); }); await admin.waitForTimeout(400);
  await admin.locator('button', { hasText: 'סיום משחק' }).click(); await admin.waitForTimeout(300);
  await admin.locator('#cd-yes').click(); await admin.waitForTimeout(300);
  await admin.locator('button', { hasText: 'מקום ראשון ושני' }).click(); await admin.waitForTimeout(300);
  await admin.locator('.winner-pick .prow').first().click(); await admin.waitForTimeout(300);
  await admin.locator('.winner-pick .prow').first().click(); await admin.waitForTimeout(300);
  await admin.locator('button', { hasText: 'אישור וסיום המשחק' }).click(); await admin.waitForTimeout(1200);
  ok('the admin can finish the game', cloud.data.games[0].status === 'done');

  await dealer.waitForTimeout(3600);
  ok('the dealer device sees the finished game',
     await dealer.evaluate(() => !activeGame()));

  console.log(errs.length ? 'JS errors:\n' + errs.join('\n') : 'No JS errors.');
  if (errs.length) failures += errs.length;
  await b.close(); s1.close(); s2.close();
  process.exit(failures ? 1 : 0);
})();
