// Blind-structure checks. Run with: node test/ladder.test.js  (from the pokernight folder)
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
               '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2', '.mp3':'audio/mpeg' };
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

const EXPECTED = [
  [10,20],[20,40],[30,60],[40,80],[50,100],[75,150],[100,200],[150,300],[200,400],
  [300,600],[400,800],[500,1000],[750,1500],[1000,2000],
  [1500,3000],[2000,4000],[3000,6000],[4000,8000],[5000,10000],
];

(async () => {
  await new Promise(r => server.listen(8170, r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));

  await p.goto('http://localhost:8170/'); await p.waitForTimeout(300);
  await p.locator('.chip', { hasText: 'מנהל' }).click();
  await p.fill('#lg-user', 'pitboss'); await p.fill('#lg-pass', PASS);
  await p.locator('button', { hasText: 'כניסת מנהל' }).click(); await p.waitForTimeout(400);

  const ladder = await p.evaluate(() => LADDER);
  ok(`ladder has ${EXPECTED.length} levels`, ladder.length === EXPECTED.length);
  ok('every level matches the intended structure',
     JSON.stringify(ladder) === JSON.stringify(EXPECTED));
  ok('blinds never more than double between levels',
     ladder.every((l, i) => i === 0 || l[1] <= ladder[i-1][1] * 2));
  ok('big blind is always twice the small blind', ladder.every(l => l[1] === l[0] * 2));
  ok('blinds always increase', ladder.every((l, i) => i === 0 || l[1] > ladder[i-1][1]));

  // start a game and confirm the clock walks the whole structure
  await p.evaluate(() => {
    S.players = ['א','ב','ג'].map((name,i)=>({id:'p'+i,name,nickname:null,avatar:null,active:true,createdAt:Date.now(),updatedAt:Date.now()}));
    save();
  });
  await p.locator('nav button', { hasText: 'בית' }).click();
  await p.locator('button', { hasText: 'משחק חדש' }).click(); await p.waitForTimeout(200);
  for (const n of ['א','ב','ג']) await p.locator('#ng-chips .chip', { hasText: n }).click();
  await p.locator('button', { hasText: 'התחלת' }).click(); await p.waitForTimeout(300);

  ok('a new game pins the full ladder',
     await p.evaluate(n => activeGame().config.ladder.length === n, EXPECTED.length));
  const last = EXPECTED[EXPECTED.length - 1];
  ok(`final level is ${last[0]}/${last[1]}`, await p.evaluate(l => {
    const tl = buildTimeline(activeGame().config);
    return tl[tl.length-1].sb === l[0] && tl[tl.length-1].bb === l[1];
  }, last));
  ok('the clock renders the final level without falling over', await p.evaluate(l => {
    const g = activeGame();
    g.timer.idx = buildTimeline(g.config).length - 1;
    go('clock');
    return document.getElementById('ck-blinds').textContent.includes(l[0] + ' / ' + l[1]);
  }, last));
  ok('the clock holds on the last level instead of running past it', await p.evaluate(() => {
    const g = activeGame();
    g.timer.endAt = Date.now() - 1000;          // pretend the level just expired
    timerCatchUp(g, true);
    return g.timer.idx === buildTimeline(g.config).length - 1;
  }));

  // a game saved under a shorter ladder must still open
  ok('a game stored on a level that no longer exists is pulled back', await p.evaluate(() => {
    const g = activeGame();
    delete g.config.ladder; g.timer.idx = 99;
    clampTimers(S);
    go('home');
    return g.timer.idx === buildTimeline(g.config).length - 1
        && document.getElementById('app').innerHTML.length > 300;
  }));

  console.log(errs.length ? 'JS ERRORS: ' + errs.join('; ') : 'No JS errors.');
  await b.close(); server.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
