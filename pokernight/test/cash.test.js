// Cash-game checks. Run with: node test/cash.test.js  (from the pokernight folder)
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp3':'audio/mpeg' };
const PASS = 'RaiseKing!59';

const server = http.createServer((q, r) => {
  const p = q.url.split('?')[0];
  if (p === '/api/comments') { r.setHeader('Content-Type','application/json'); r.end('{}'); return; }
  if (p === '/api/state') { r.setHeader('Content-Type','application/json'); r.end(JSON.stringify({version:0,updatedAt:null,data:null})); return; }
  const f = path.join(ROOT, p === '/' ? '/index.html' : p);
  if (fs.existsSync(f)) { r.setHeader('Content-Type', MIME[path.extname(f)] || 'text/plain'); r.end(fs.readFileSync(f)); }
  else { r.statusCode = 404; r.end(); }
});

let failures = 0;
const ok = (n, c) => { if (!c) failures++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + n); };

(async () => {
  await new Promise(r => server.listen(8171, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));

  await p.goto('http://localhost:8171/'); await p.waitForTimeout(300);
  await p.locator('.chip', { hasText: 'מנהל' }).click();
  await p.fill('#lg-user', 'pitboss'); await p.fill('#lg-pass', PASS);
  await p.locator('button', { hasText: 'כניסת מנהל' }).click(); await p.waitForTimeout(400);
  await p.evaluate(() => {
    S.players = ['רון','ליאל','סתיו'].map((name,i)=>({id:'p'+i,name,nickname:null,avatar:null,active:true,createdAt:Date.now(),updatedAt:Date.now()}));
    save();
  });

  // ---- start a cash night ----
  await p.locator('nav button', { hasText: 'בית' }).click();
  await p.locator('button', { hasText: 'משחק חדש' }).click(); await p.waitForTimeout(200);
  ok('new game offers both types', (await p.locator('#app').innerText()).includes('טורניר') && (await p.locator('#app').innerText()).includes('קאש'));
  await p.locator('.chip', { hasText: 'קאש' }).click(); await p.waitForTimeout(200);
  ok('cash blurb shows ₪20 and fixed blinds',
     (await p.locator('#app').innerText()).includes('בליינדים קבועים 10/20') && (await p.locator('#app').innerText()).includes('₪20'));
  for (const n of ['רון','ליאל','סתיו']) await p.locator('.chip', { hasText: n }).click();
  await p.locator('button', { hasText: 'התחלת קאש' }).click(); await p.waitForTimeout(400);

  const cfg = await p.evaluate(() => ({ type: activeGame().type, c: activeGame().config, round: activeGame().timer.round }));
  ok('game is recorded as cash', cfg.type === 'cash');
  ok('buy-in is ₪20, house fee ₪10, no savings', cfg.c.entryPrice === 20 && cfg.c.houseFee === 10 && cfg.c.savingsFee === 0);
  ok('no prize split configured', cfg.c.splitFirst === 0 && cfg.c.splitSecond === 0 && cfg.c.splitHouse === 0);
  ok('no rebuy cap on cash', cfg.c.maxRebuys === 0);
  ok('chips per buy-in is 1000', cfg.c.chipsPerEntry === 1000);
  ok('round counter starts at 1', cfg.round === 1);
  ok('on-table shows ₪60 for 3 buy-ins', (await p.locator('.pool-bar .pool').innerText()).includes('60'));
  ok('money bar shows the house fee, not a prize split',
     (await p.locator('.pool-bar .amounts').innerText()).includes('דמי בית'));

  // rebuys past the tournament cap are allowed
  for (let i = 0; i < 13; i++) await p.locator('.prow', { hasText: 'סתיו' }).locator('.btn-plus').click();
  await p.waitForTimeout(300);
  ok('cash allows rebuys past the 12 cap', await p.evaluate(() => entriesOf(activeGame(), 'p2') === 14));
  // back to 3 buy-ins for סתיו
  for (let i = 0; i < 11; i++) await p.locator('.prow', { hasText: 'סתיו' }).locator('.btn-minus').click();
  await p.locator('.prow', { hasText: 'רון' }).locator('.btn-plus').click();
  await p.waitForTimeout(300);
  // רון 2, ליאל 1, סתיו 3 = 6 buy-ins = ₪120
  ok('on-table is ₪120 after rebuys', await p.evaluate(() => poolOf(activeGame()) === 120));

  // ---- the clock: fixed blinds, repeating round ----
  await p.locator('.strip').click(); await p.waitForTimeout(300);
  ok('clock shows the fixed 10 / 20', (await p.locator('#ck-blinds').innerText()).includes('10 / 20'));
  ok('clock shows a round, not a level', (await p.locator('#ck-lvl').innerText()).includes('סבב'));
  ok('clock says blinds are fixed', (await p.locator('#ck-next').innerText()).includes('בליינדים קבועים'));
  ok('round rolls over instead of raising blinds', await p.evaluate(() => {
    const g = activeGame();
    const before = g.timer.round;
    g.timer.endAt = Date.now() - 10;
    timerCatchUp(g, true);
    const tl = buildTimeline(g.config);
    return g.timer.round === before + 1 && g.timer.idx === 0 && tl.length === 1
        && tl[0].sb === 10 && tl[0].bb === 20;
  }));
  await p.locator('#clock').click(); await p.waitForTimeout(200);
  await p.locator('button', { hasText: 'חזרה' }).first().click(); await p.waitForTimeout(300);

  // ---- cash out ----
  await p.locator('button', { hasText: 'סיום משחק' }).click(); await p.waitForTimeout(200);
  await p.locator('#cd-yes').click(); await p.waitForTimeout(300);
  const co = await p.locator('.sheet-modal').innerText();
  ok('cash-out screen opens, not the winner picker', co.includes('לקח מהשולחן') && !co.includes('מקום ראשון'));
  ok('cash-out screen shows the table total', co.includes('120'));
  // רון 100, ליאל 0, סתיו 20 => balances to 120
  await p.evaluate(() => { setCashout('p0', 100); });
  await p.waitForTimeout(150);
  ok('an unbalanced count is flagged', (await p.locator('.sheet-modal').innerText()).includes('חסר'));
  await p.evaluate(() => { setCashout('p1', 0); setCashout('p2', 20); });
  await p.waitForTimeout(200);
  ok('a balanced count is confirmed', (await p.locator('.sheet-modal').innerText()).includes('מאוזן'));
  await p.locator('button', { hasText: 'המשך' }).click(); await p.waitForTimeout(300);
  await p.locator('button', { hasText: 'אישור וסיום' }).click(); await p.waitForTimeout(500);

  const r = await p.evaluate(() => {
    const g = S.games.find(x => x.status === 'done');
    const pay = payouts(g);
    const by = n => pay.nets[S.players.find(x => x.name === n).id];
    return { onTable: pay.onTable, houseFees: pay.houseFees, savings: pay.savings, house10: pay.house10,
             diff: pay.diff, ron: by('רון'), liel: by('ליאל'), stav: by('סתיו'),
             wa: buildWhatsApp(g), sum: document.getElementById('app').innerText,
             stats: allStats(), mvp: currentMvp(), cash: cashStats('p0') };
  });
  ok('house took 3 × ₪10 = ₪30', r.houseFees === 30);
  ok('no savings and no 10% rake on cash', r.savings === 0 && r.house10 === 0);
  ok('the books balance', r.diff === 0);
  ok('רון: 100 − 40 − 10 = +₪50', r.ron === 50);
  ok('ליאל: 0 − 20 − 10 = −₪30', r.liel === -30);
  ok('סתיו: 20 − 60 − 10 = −₪50', r.stav === -50);
  ok('every shekel accounted for', r.ron + r.liel + r.stav === -r.houseFees);
  ok('summary is a cash summary', r.sum.includes('על השולחן') && !r.sum.includes('🥇'));
  ok('WhatsApp is a cash summary', r.wa.includes('💵 ערב קאש') && r.wa.includes('🏠 דמי בית') && !r.wa.includes('🥇'));
  ok('WhatsApp still lists entries per player', /רון \(2 כניסות\)/.test(r.wa));
  ok('cash stays out of the all-time table', Object.keys(r.stats).length === 0);
  ok('cash stays out of the MVP crown', r.mvp === null);
  ok('the profile counts cash separately', r.cash.games === 1 && r.cash.net === 50);

  // ---- editing a finished cash night ----
  await p.locator('button', { hasText: 'עריכת המשחק' }).click(); await p.waitForTimeout(400);
  ok('cash edit screen opens', (await p.locator('.sheet-modal').innerText()).includes('עריכת ערב קאש'));
  await p.evaluate(() => { cashEditStep('p1', 1); cashEditOut('p0', 120); });
  await p.waitForTimeout(250);
  await p.locator('button', { hasText: 'שמירת השינויים' }).click(); await p.waitForTimeout(500);
  const after = await p.evaluate(() => {
    const g = S.games.find(x => x.status === 'done');
    const pay = payouts(g);
    return { entries: totalEntries(g), onTable: pay.onTable, diff: pay.diff, rev: g.entriesRev,
             ron: pay.nets['p0'], liel: pay.nets['p1'], games: S.games.length };
  });
  ok('edit applied: 7 buy-ins, ₪140 on the table', after.entries === 7 && after.onTable === 140);
  ok('edit kept it a single game', after.games === 1);
  ok('edited entry list is marked as rewritten', after.rev === 1);
  ok('edited nets recalculated: רון +₪70', after.ron === 70);
  ok('edited nets recalculated: ליאל −₪50', after.liel === -50);

  console.log(errs.length ? 'JS ERRORS: ' + errs.join('; ') : 'No JS errors.');
  await b.close(); server.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
