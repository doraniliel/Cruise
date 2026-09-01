// Tournament checks. Run with: node test/tournament.test.js  (from the pokernight folder)
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
  await new Promise(r => server.listen(8172, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));

  await p.goto('http://localhost:8172/'); await p.waitForTimeout(300);
  ok('login screen appears first', await p.locator('#lg-name, #lg-user').count() > 0);
  await p.locator('.chip', { hasText: 'מנהל' }).click();
  await p.fill('#lg-user', 'pitboss'); await p.fill('#lg-pass', 'wrong');
  await p.locator('button', { hasText: 'כניסת מנהל' }).click(); await p.waitForTimeout(300);
  ok('a wrong password is refused', await p.locator('#lg-pass').count() > 0);
  await p.fill('#lg-pass', PASS);
  await p.locator('button', { hasText: 'כניסת מנהל' }).click(); await p.waitForTimeout(400);
  ok('admin reaches the home screen', await p.locator('text=משחק חדש').count() > 0);

  await p.evaluate(() => {
    S.players = ['דניאל','יוסי','טל'].map((name,i)=>({id:'p'+i,name,nickname:i===0?'דני':null,avatar:null,active:true,createdAt:Date.now(),updatedAt:Date.now()}));
    save();
  });

  // 3 players, 5 entries => pot ₪150
  await p.locator('nav button', { hasText: 'בית' }).click();
  await p.locator('button', { hasText: 'משחק חדש' }).click(); await p.waitForTimeout(200);
  for (const n of ['דניאל','יוסי','טל']) await p.locator('.chip', { hasText: n }).click();
  await p.locator('button', { hasText: 'התחלת טורניר' }).click(); await p.waitForTimeout(300);
  ok('game is recorded as a tournament', await p.evaluate(() => activeGame().type === 'tournament'));
  await p.locator('.prow', { hasText: 'דניאל' }).locator('.btn-plus').click();
  await p.locator('.prow', { hasText: 'יוסי' }).locator('.btn-plus').click();
  await p.waitForTimeout(300);
  ok('pot is ₪150 for 5 entries', await p.evaluate(() => poolOf(activeGame()) === 150));

  // the rebuy cap still applies to tournaments
  ok('tournament keeps its 12-rebuy cap', await p.evaluate(() => activeGame().config.maxRebuys === 12));

  // blinds still climb
  await p.locator('.strip').click(); await p.waitForTimeout(300);
  ok('clock starts at 10 / 20', (await p.locator('#ck-blinds').innerText()).includes('10 / 20'));
  ok('clock previews the next blinds', (await p.locator('#ck-next').innerText()).includes('20 / 40'));
  ok('a level rolls up to the next blinds', await p.evaluate(() => {
    const g = activeGame();
    g.timer.endAt = Date.now() - 10;
    timerCatchUp(g, true);
    const cur = buildTimeline(g.config)[g.timer.idx];
    return g.timer.idx === 1 && cur.sb === 20 && cur.bb === 40;
  }));
  await p.evaluate(() => { const g = activeGame(); g.timer.idx = 0; go('game'); });
  await p.waitForTimeout(300);

  // finish 1st / 2nd
  await p.locator('button', { hasText: 'סיום משחק' }).click(); await p.waitForTimeout(200);
  await p.locator('#cd-yes').click(); await p.waitForTimeout(250);
  await p.locator('button', { hasText: 'מקום ראשון ושני' }).click(); await p.waitForTimeout(250);
  await p.locator('.winner-pick .prow', { hasText: 'דניאל' }).click(); await p.waitForTimeout(150);
  await p.locator('.winner-pick .prow', { hasText: 'יוסי' }).click(); await p.waitForTimeout(250);
  const conf = await p.locator('.sheet-modal').innerText();
  ok('confirm shows house 10% ₪15, savings ₪60, fees ₪30',
     conf.includes('15') && conf.includes('60') && conf.includes('30'));
  await p.locator('button', { hasText: 'אישור וסיום' }).click(); await p.waitForTimeout(500);

  const r = await p.evaluate(() => {
    const g = S.games.find(x => x.status === 'done');
    const pay = payouts(g);
    const by = n => pay.nets[S.players.find(x => x.name === n).id];
    const st = allStats();
    return { pool: pay.pool, first: pay.first, second: pay.second, house10: pay.house10,
             savings: pay.savings, houseFees: pay.houseFees,
             dani: by('דניאל'), yosi: by('יוסי'), tal: by('טל'),
             firsts: st['p0'].firsts, seconds: st['p1'].seconds, bubbles: st['p2'].bubbles,
             wa: buildWhatsApp(g), sb: savingsBalance() };
  });
  ok('prize split: ₪97 / ₪38 of a ₪150 pot', r.first === 97 && r.second === 38);
  ok('house 10% is ₪15', r.house10 === 15);
  ok('savings ₪60, house fees ₪30', r.savings === 60 && r.houseFees === 30);
  ok('nets: +7 / −52 / −60', r.dani === 7 && r.yosi === -52 && r.tal === -60);
  ok('every shekel accounted for', r.dani + r.yosi + r.tal === -(r.house10 + r.savings + r.houseFees));
  ok('bubble boy auto-assigned to the last player', r.bubbles === 1);
  ok('stats counted the win and the runner-up', r.firsts === 1 && r.seconds === 1);
  ok('savings pot grew by ₪60', r.sb === 60);
  ok('WhatsApp shows all three money lines',
     r.wa.includes('🏠 הבית (10%)') && r.wa.includes('🧰 חיסכון') && r.wa.includes('🏠 דמי בית'));
  ok('WhatsApp shows medals and entry counts', r.wa.includes('🥇') && /דניאל \(2 כניסות\)/.test(r.wa));

  // a chop pays the two winners out of the pot minus the house cut
  ok('chop math: 60/40 of a ₪150 pot pays 81 / 54', await p.evaluate(() => {
    const g = S.games.find(x => x.status === 'done');
    const pay = payouts(Object.assign({}, g, { results: { first: 'p0', second: 'p1', chop: true, pctFirst: 60 } }));
    return pay.first === 81 && pay.second === 54 && pay.first + pay.second === pay.pool - pay.house10;
  }));

  console.log(errs.length ? 'JS ERRORS: ' + errs.join('; ') : 'No JS errors.');
  await b.close(); server.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
