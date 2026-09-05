// The wall screen (?tv=1) and the "your build is old" banner.
// Run with: node test/tv.test.js  (from the pokernight folder)
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp3':'audio/mpeg' };
const PASS = 'RaiseKing!59';

let cloud = { version: 0, updatedAt: null, build: 0, data: null };
let forceStale = false;   // flipped on to make the server refuse a write
function mkServer() {
  return http.createServer((q, r) => {
    const p = q.url.split('?')[0];
    if (p === '/api/state') {
      if (q.method === 'GET') { r.setHeader('Content-Type','application/json'); r.end(JSON.stringify(cloud)); return; }
      if ((q.headers['x-admin-key'] || '') !== PASS) { r.statusCode = 401; r.end(); return; }
      let body = ''; q.on('data', c => body += c);
      q.on('end', () => {
        const j = JSON.parse(body);
        r.setHeader('Content-Type','application/json');
        if (j.verify) { r.end('{"ok":true,"role":"admin"}'); return; }
        if (forceStale) { r.statusCode = 426; r.end('{"staleClient":true}'); return; }
        if (typeof j.baseVersion === 'number' && j.baseVersion !== cloud.version) {
          r.statusCode = 409;
          r.end(JSON.stringify({ conflict:true, version:cloud.version, data:cloud.data })); return;
        }
        cloud = { version: cloud.version + 1, updatedAt: Date.now(),
                  build: Math.max(cloud.build || 0, Number(j.build) || 0),
                  data: { players: j.data.players, games: j.data.games,
                          seasons: j.data.seasons || [], settings: j.data.settings || {} } };
        r.end(JSON.stringify({ version: cloud.version }));
      });
      return;
    }
    if (p === '/api/comments') { r.setHeader('Content-Type','application/json'); r.end('{}'); return; }
    const f = path.join(ROOT, p === '/' ? '/index.html' : p);
    if (fs.existsSync(f)) { r.setHeader('Content-Type', MIME[path.extname(f)] || 'text/plain'); r.end(fs.readFileSync(f)); }
    else { r.statusCode = 404; r.end(); }
  });
}

let failures = 0;
const ok = (n, c) => { if (!c) failures++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + n); };

(async () => {
  const s1 = mkServer(), s2 = mkServer(); s1.listen(8196); s2.listen(8197);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const admin = await b.newPage({ viewport: { width: 390, height: 844 } });
  const tv = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  admin.on('pageerror', e => errs.push('admin: ' + e.message));
  tv.on('pageerror', e => errs.push('tv: ' + e.message));

  /* ---- a wall screen with nothing to show yet ---- */
  await tv.goto('http://localhost:8197/?tv=1'); await tv.waitForTimeout(700);
  ok('the TV never shows a login screen', await tv.locator('#lg-name, #lg-user, #lg-code').count() === 0);
  ok('the TV signs itself in read-only', await tv.evaluate(() => !!SESSION && SESSION.role === 'user' && SESSION.tv === true));
  ok('the TV waits for a game instead of bouncing home',
     (await tv.textContent('#clock')).includes('אין משחק פעיל'));
  ok('the TV hides the bottom nav', await tv.evaluate(() => document.getElementById('nav').hidden));

  /* ---- the admin opens a game ---- */
  await admin.goto('http://localhost:8196/'); await admin.waitForTimeout(250);
  await admin.locator('.chip', { hasText: 'מנהל' }).click();
  await admin.fill('#lg-user', 'pitboss'); await admin.fill('#lg-pass', PASS);
  await admin.locator('button', { hasText: 'כניסת מנהל' }).click(); await admin.waitForTimeout(500);
  await admin.evaluate(() => {
    S.players = [
      { id:'a', name:'רון', active:true, updatedAt:1 },
      { id:'b', name:'ליאל', active:true, updatedAt:1 },
      { id:'c', name:'דור', active:true, updatedAt:1 },
      { id:'d', name:'עידו', active:true, updatedAt:1 },
    ];
    save();
  });
  await admin.waitForTimeout(300);
  await admin.evaluate(() => go('newgame')); await admin.waitForTimeout(200);
  for (const n of ['רון', 'ליאל', 'דור', 'עידו']) await admin.locator('#ng-chips .chip', { hasText: n }).first().click();
  await admin.locator('button', { hasText: 'התחלת טורניר' }).click();
  await admin.waitForTimeout(900);

  // the TV picks the game up on its own — nobody walks over to the screen
  await tv.waitForTimeout(4200);
  ok('the TV finds the new game by itself', await tv.evaluate(() => !!activeGame()));
  ok('the TV is showing the clock', await tv.evaluate(() => view === 'clock'));
  ok('the clock shows the opening blinds', (await tv.textContent('#ck-blinds')).trim() === '10 / 20');

  /* ---- the numbers a table actually wants ---- */
  const upnext = await tv.textContent('#ck-upnext');
  ok('the clock previews the next level', upnext.includes('20/40'));
  ok('the clock previews the level after that', upnext.includes('30/60'));
  // 4 players x 1 entry x 1500 chips = 6000 chips, 1500 average
  ok('the clock shows the average stack', (await tv.textContent('#ck-avg')).replace(/[^0-9]/g, '') === '1500');
  ok('the clock shows elapsed game time', /^\d+:\d\d$/.test((await tv.textContent('#ck-elapsed')).trim()));
  ok('the pot is on screen', (await tv.textContent('#ck-pool')).includes('120'));

  /* ---- the rotating panel ---- */
  const panels = await tv.evaluate(() => tvPanels(activeGame()));
  ok('there is more than one panel to rotate through', panels.length >= 2);
  ok('one panel is the prize split', panels.some(x => x.includes('🥇')));
  ok('the panel is showing something', (await tv.textContent('#ck-panel')).trim().length > 0);
  const firstPanel = await tv.textContent('#ck-panel');
  const rotated = await tv.evaluate(async () => {
    const real = Date.now;
    // jump the clock forward one rotation and let the panel catch up
    Date.now = () => real() + 12000;
    updateTvPanel(activeGame());
    await new Promise(r => setTimeout(r, 500));
    const txt = document.getElementById('ck-panel').textContent;
    Date.now = real;
    return txt;
  });
  ok('the panel moves on after twelve seconds', rotated !== firstPanel && rotated.trim().length > 0);

  /* ---- a wall screen is a spectator ---- */
  ok('the TV shows no timer controls', (await tv.evaluate(() => ckCtrlsHtml(activeGame()))) === '');
  ok('the TV hides the back button', !(await tv.locator('#clock .exit').first().isVisible()));
  await tv.evaluate(() => go('settings'));
  await tv.waitForTimeout(200);
  ok('the TV cannot be navigated away from the clock', await tv.evaluate(() => view === 'clock'));

  /* ---- the "your build is old" banner ---- */
  ok('no banner while everything is current', await admin.locator('#update-bar').count() === 0);
  cloud.build = 9999;
  await admin.evaluate(() => pullState(true));
  await admin.waitForTimeout(600);
  ok('a newer build in the cloud raises the banner', await admin.locator('#update-bar').count() === 1);
  ok('the banner says what to do', (await admin.textContent('#update-bar')).includes('רענון'));
  cloud.build = 0;

  // and a server that refuses the write outright says so too
  forceStale = true;
  await tv.evaluate(() => {
    SESSION = { role: 'admin', name: 'מנהל', key: 'RaiseKing!59', ts: Date.now() };
    SYNC.dirty = true;
    pushState();
  });
  await tv.waitForTimeout(700);
  ok('a 426 from the server raises the banner on that device', await tv.locator('#update-bar').count() === 1);
  ok('the sync status turns bad after a refusal', await tv.evaluate(() => syncDotClass()) === 'bad');
  forceStale = false;

  /* ---- the sync light ---- */
  await admin.evaluate(() => go('stats')); await admin.waitForTimeout(300);
  ok('the table screen carries a sync light', await admin.locator('.sync-pill .sync-dot').count() === 1);
  await admin.evaluate(() => go('players')); await admin.waitForTimeout(300);
  ok('the players screen carries a sync light', await admin.locator('.sync-pill .sync-dot').count() === 1);
  await admin.evaluate(() => go('history')); await admin.waitForTimeout(300);
  ok('the history screen carries a sync light', await admin.locator('.sync-pill .sync-dot').count() === 1);
  ok('a synced device shows green',
     await admin.evaluate(() => { SYNC.dirty = false; SYNC.status = 'ok'; updateSyncBadge();
       return document.querySelector('.sync-dot').className.includes('ok'); }));
  ok('a pending device shows amber',
     await admin.evaluate(() => { SYNC.dirty = true; updateSyncBadge();
       return document.querySelector('.sync-dot').className.includes('wait'); }));
  ok('an offline device shows red',
     await admin.evaluate(() => { SYNC.dirty = false; SYNC.status = 'offline'; updateSyncBadge();
       return document.querySelector('.sync-dot').className.includes('bad'); }));

  /* ---- who touched the game last ---- */
  await admin.evaluate(() => { SYNC.status = 'ok'; go('game'); }); await admin.waitForTimeout(400);
  ok('the game screen says when it was last updated',
     (await admin.textContent('#app .topbar')).includes('עודכן'));

  console.log(errs.length ? 'JS errors:\n' + errs.join('\n') : 'No JS errors.');
  if (errs.length) failures += errs.length;
  await b.close(); s1.close(); s2.close();
  process.exit(failures ? 1 : 0);
})();
