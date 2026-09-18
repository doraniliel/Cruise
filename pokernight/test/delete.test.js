// Deleting a game must stick — through a refresh, through sync, and on every
// other device. Run with: node test/delete.test.js  (from the pokernight folder)
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp3':'audio/mpeg' };
const PASS = 'RaiseKing!59';

// one shared cloud, mirroring netlify/functions/state.mjs
let cloud = { version: 0, updatedAt: null, data: null };
function mkServer() {
  return http.createServer((q, r) => {
    const p = q.url.split('?')[0];
    if (p === '/api/state') {
      if (q.method === 'GET') { r.setHeader('Content-Type','application/json'); r.end(JSON.stringify(cloud)); return; }
      if ((q.headers['x-admin-key'] || '') !== PASS) { r.statusCode = 401; r.end(); return; }
      let body = ''; q.on('data', c => body += c);
      q.on('end', () => {
        const j = JSON.parse(body);
        if (j.verify) { r.setHeader('Content-Type','application/json'); r.end('{"ok":true}'); return; }
        if (typeof j.baseVersion !== 'number' && cloud.version > 0) { r.statusCode = 426; r.end('{}'); return; }
        if (typeof j.baseVersion === 'number' && j.baseVersion !== cloud.version) {
          r.statusCode = 409; r.setHeader('Content-Type','application/json');
          r.end(JSON.stringify({ conflict:true, version:cloud.version, data:cloud.data })); return;
        }
        cloud = { version: cloud.version + 1, updatedAt: Date.now(), data: j.data };
        r.setHeader('Content-Type','application/json'); r.end(JSON.stringify({ version: cloud.version }));
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
const cloudGames = () => (cloud.data && cloud.data.games) || [];
const liveInCloud = () => cloudGames().filter(g => !g.deleted).length;

const adminLogin = async (p, port) => {
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(250);
  await p.locator('.chip', { hasText: 'מנהל' }).click();
  await p.fill('#lg-user', 'pitboss'); await p.fill('#lg-pass', PASS);
  await p.locator('button', { hasText: 'כניסת מנהל' }).click(); await p.waitForTimeout(500);
};

(async () => {
  const s1 = mkServer(), s2 = mkServer(); s1.listen(8180); s2.listen(8181);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const phone = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; phone.on('pageerror', e => errs.push('phone: ' + e.message));

  await adminLogin(phone, 8180);
  // two finished tournaments
  await phone.evaluate(() => {
    S.players = ['רון','ליאל','סתיו'].map((name,i)=>({id:'p'+i,name,nickname:null,avatar:null,active:true,createdAt:Date.now(),updatedAt:Date.now()}));
    const cfg = { entryPrice:30, houseFee:10, savingsFee:20, splitFirst:65, splitSecond:25, splitHouse:10,
                  maxRebuys:12, levelMinutes:15, breakAfter:0, breakMinutes:10, ladder:LADDER.map(l=>l.slice()), chipsPerEntry:1500 };
    const mk = (id, date) => ({ id, date, type:'tournament', startAt:Date.now()-3600e3, endAt:Date.now(), status:'done', isManual:false,
      config: cfg, playerIds:['p0','p1','p2'],
      entries:['p0','p1','p2'].map(pid=>({id:'e'+id+pid,pid,delta:1,ts:Date.now()})),
      results:{first:'p0',second:'p1',bubble:'p2'}, updatedAt:Date.now(), timer:null });
    S.games = [mk('keep','2026-08-01'), mk('gone','2026-08-08')];
    save();
  });
  await phone.waitForTimeout(1800);
  ok('both games uploaded', liveInCloud() === 2);

  // a second person opens the site and syncs
  const other = await b.newPage({ viewport: { width: 820, height: 1180 } });
  other.on('pageerror', e => errs.push('other: ' + e.message));
  await other.goto('http://localhost:8181/'); await other.waitForTimeout(250);
  await other.fill('#lg-name', 'אורח');
  await other.locator('button', { hasText: 'כניסה' }).last().click();
  await other.waitForTimeout(1500);
  ok('the other person sees both games', await other.evaluate(() => liveGames().length === 2));
  const staleCopy = await other.evaluate(() => JSON.stringify({ s: S, v: SYNC.version }));

  // ---- delete one ----
  await phone.evaluate(() => go('summary', 'gone'));
  await phone.waitForTimeout(300);
  await phone.locator('button', { hasText: 'מחיקת המשחק' }).click(); await phone.waitForTimeout(250);
  await phone.locator('#cd-yes').click(); await phone.waitForTimeout(1800);

  ok('history now lists one game', await phone.evaluate(() => liveGames().filter(g=>g.status==='done').length === 1));
  ok('the deletion reached the cloud', liveInCloud() === 1);
  ok('the cloud keeps a tombstone, not a hole', cloudGames().length === 2 && cloudGames().some(g => g.id==='gone' && g.deleted));

  // ---- THE REPORTED BUG: refresh and see if it comes back ----
  await phone.reload(); await phone.waitForTimeout(2500);
  ok('after a refresh the game is still gone', await phone.evaluate(() => !liveGames().some(g => g.id === 'gone')));
  ok('history lists exactly one openable game', await phone.evaluate(() => {
    go('history');
    // cards in the main list open a summary; the recovery bin has restore buttons instead
    const cards = document.querySelectorAll('#app [onclick^="go(\'summary\'"]');
    return cards.length === 1 && cards[0].getAttribute('onclick').includes('keep');
  }));
  await phone.waitForTimeout(4000);
  ok('still gone after another sync round', liveInCloud() === 1 &&
     await phone.evaluate(() => !liveGames().some(g => g.id === 'gone')));

  // ---- it must disappear for everyone else too ----
  await other.waitForTimeout(5000);
  ok('the other person no longer sees it', await other.evaluate(() => !liveGames().some(g => g.id === 'gone')));
  ok('the other person is left with one game', await other.evaluate(() => liveGames().length === 1));

  // ---- a device that missed the delete must not resurrect it ----
  await other.evaluate((snap) => {
    const o = JSON.parse(snap);
    S = o.s; SYNC.version = o.v; SYNC.dirty = true;
    localStorage.setItem('pokernight_v1', JSON.stringify(S));
    pullState();
  }, staleCopy);
  await other.waitForTimeout(6000);
  ok('a stale copy cannot bring the game back', liveInCloud() === 1);
  ok('the stale device ends up agreeing it is deleted', await other.evaluate(() => !liveGames().some(g => g.id === 'gone')));

  // ---- deleted games are out of the numbers ----
  const numbers = await phone.evaluate(() => ({
    stats: Object.values(allStats())[0].games,
    savings: savingsBalance(),
    mvpGames: Object.keys(mvpByMonth()).length,
    profile: playerGames('p0').length,
  }));
  ok('the all-time table counts one game', numbers.stats === 1);
  ok('the savings pot counts one game (₪60)', numbers.savings === 60);
  ok('the profile history shows one game', numbers.profile === 1);

  // ---- recovery is admin-only ----
  await phone.evaluate(() => go('history'));
  await phone.waitForTimeout(400);
  ok('admin sees the recovery bin', (await phone.locator('#app').innerText()).includes('משחקים שנמחקו'));
  ok('a player never sees the bin', await other.evaluate(() => {
    go('history');                                   // players are bounced off this screen anyway
    return !document.getElementById('app').innerText.includes('משחקים שנמחקו');
  }));
  ok('a player cannot restore a deleted game', await other.evaluate(() => {
    restoreGame('gone');
    return !liveGames().some(g => g.id === 'gone');
  }));

  // ---- restore ----
  await phone.locator('button', { hasText: 'שחזור' }).first().click();
  await phone.waitForTimeout(2000);
  ok('restoring brings it back', await phone.evaluate(() => liveGames().some(g => g.id === 'gone')));
  ok('the restore reached the cloud', liveInCloud() === 2);
  await other.waitForTimeout(5000);
  ok('the other person sees it again', await other.evaluate(() => liveGames().some(g => g.id === 'gone')));

  // ---- permanent purge ----
  await phone.evaluate(() => { deleteGame('gone'); });
  await phone.waitForTimeout(200);
  await phone.locator('#cd-yes').click(); await phone.waitForTimeout(1500);
  await phone.evaluate(() => { go('history'); });
  await phone.waitForTimeout(400);
  await phone.locator('button', { hasText: 'מחיקה לצמיתות' }).first().click(); await phone.waitForTimeout(250);
  await phone.locator('#cd-yes').click(); await phone.waitForTimeout(1800);
  ok('a purged game leaves only a marker', cloudGames().some(g => g.id==='gone' && g.purged && g.entries.length===0));
  ok('a purged game is not offered for recovery', !(await phone.locator('#app').innerText()).includes('שחזור'));
  ok('a purged game stays gone everywhere', liveInCloud() === 1);

  console.log(errs.length ? 'JS ERRORS: ' + errs.join('; ') : 'No JS errors.');
  await b.close(); s1.close(); s2.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
