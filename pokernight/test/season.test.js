// Seasons, streaks, head-to-head and the CSV export. The numbers here are
// worked out by hand from the games the test seeds.
// Run with: node test/season.test.js  (from the pokernight folder)
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp3':'audio/mpeg' };
const PASS = 'RaiseKing!59';

let cloud = { version: 0, updatedAt: null, build: 0, data: null };
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

/* Four tournaments, three players, ₪30 a head, 65/25/10, no fees, one entry each.
   Pot = 3 x 30 = 90. House 10% = 9. Second 25% = 23 (rounded). First = 90-23-9 = 58.
   So per night: 1st +28, 2nd -7, 3rd -30.
     g1 (old season): רון 1st, ליאל 2nd, דור 3rd
     g2 (old season): רון 1st, דור  2nd, ליאל 3rd
     g3 (new season): ליאל 1st, רון 2nd, דור 3rd
     g4 (new season): ליאל 1st, דור 2nd, רון 3rd
   All time: רון 28+28-7-30 = 19 | ליאל -7-30+28+28 = 19 | דור -30-7-30-7 = -74
   From g3 on: רון -7-30 = -37 | ליאל 28+28 = 56 | דור -30-7 = -37             */
const mk = (id, date, first, second, third) => ({
  id, date, status: 'done', type: 'tournament', isManual: true,
  startAt: null, endAt: null, updatedAt: 1, deleted: false,
  config: { entryPrice: 30, houseFee: 0, savingsFee: 0,
            splitFirst: 65, splitSecond: 25, splitHouse: 10, maxRebuys: 12,
            levelMinutes: 15, breakAfter: 0, breakMinutes: 10 },
  playerIds: [first, second, third],
  entries: [first, second, third].map((pid, i) => ({ id: id + i, pid, delta: 1, ts: 1 })),
  results: { first, second, bubble: third, chop: false },
});

(async () => {
  const s = mkServer(); s.listen(8195);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));

  await p.goto('http://localhost:8195/'); await p.waitForTimeout(250);
  await p.locator('.chip', { hasText: 'מנהל' }).click();
  await p.fill('#lg-user', 'pitboss'); await p.fill('#lg-pass', PASS);
  await p.locator('button', { hasText: 'כניסת מנהל' }).click(); await p.waitForTimeout(500);

  await p.evaluate(mkSrc => {
    const mk = eval('(' + mkSrc + ')');
    S.players = [
      { id:'ron', name:'רון', active:true, updatedAt:1 },
      { id:'liel', name:'ליאל', active:true, updatedAt:1 },
      { id:'dor', name:'דור', active:true, updatedAt:1 },
    ];
    S.games = [
      mk('g1', '2025-01-10', 'ron', 'liel', 'dor'),
      mk('g2', '2025-02-14', 'ron', 'dor', 'liel'),
      mk('g3', '2025-06-06', 'liel', 'ron', 'dor'),
      mk('g4', '2025-07-04', 'liel', 'dor', 'ron'),
    ];
    S.seasons = [];
    save();
  }, mk.toString());
  await p.waitForTimeout(500);

  const nets = await p.evaluate(() => {
    const st = allStats();
    return { ron: st.ron.net, liel: st.liel.net, dor: st.dor.net, first: payouts(S.games[0]).first };
  });
  ok('the pot pays 58 to first', nets.first === 58);
  ok('all-time net — רון +19', nets.ron === 19);
  ok('all-time net — ליאל +19', nets.liel === 19);
  ok('all-time net — דור −74', nets.dor === -74);

  /* ---- seasons ---- */
  await p.evaluate(() => {
    S.settings.seasonStart = '2025-06-01';
    S.settings.seasonName = 'עונת קיץ';
    S.settings.updatedAt = Date.now();
    save();
  });
  const seasonNets = await p.evaluate(() => {
    const st = allStats(seasonGames());
    return { ron: st.ron.net, liel: st.liel.net, dor: st.dor.net, games: seasonGames().filter(g => g.status === 'done').length };
  });
  ok('the season holds only the games from its start date', seasonNets.games === 2);
  ok('season net — ליאל +56', seasonNets.liel === 56);
  ok('season net — רון −37', seasonNets.ron === -37);
  ok('season net — דור −37', seasonNets.dor === -37);
  ok('all-time is untouched by the season', (await p.evaluate(() => allStats().ron.net)) === 19);

  await p.evaluate(() => { statsMode = null; go('stats'); }); await p.waitForTimeout(400);
  ok('the table opens on the season when one is open',
     await p.locator('.tabs .tab.on', { hasText: 'עונת קיץ' }).count() === 1);
  ok('the season table is led by ליאל',
     (await p.textContent('.card .lb:first-child .who')).includes('ליאל'));
  await p.locator('.tabs .tab', { hasText: 'כל הזמנים' }).click(); await p.waitForTimeout(300);
  ok('all-time shows all four games', (await p.textContent('.topbar .sub')).includes('4'));

  // closing a season crowns its champion and starts the count again
  await p.evaluate(() => {
    const rec = closeSeason('עונת קיץ', 'עונת חורף');
    window.__rec = rec;
  });
  await p.waitForTimeout(300);
  const rec = await p.evaluate(() => window.__rec);
  ok('the closed season is crowned to ליאל', rec.championPid === 'liel' && rec.net === 56);
  ok('the closed season kept its two games', rec.games === 2);
  ok('a fresh season starts from today',
     (await p.evaluate(() => S.settings.seasonStart)) === new Date().toISOString().slice(0, 10));
  ok('the new season is named', (await p.evaluate(() => S.settings.seasonName)) === 'עונת חורף');
  ok('the new season is empty', (await p.evaluate(() => seasonGames().filter(g => g.status === 'done').length)) === 0);

  await p.evaluate(() => { statsMode = null; go('stats'); }); await p.waitForTimeout(400);
  ok('past champions are listed', (await p.textContent('#app')).includes('אלופי העונות'));
  ok('the champions list names ליאל',
     (await p.textContent('#app')).includes('עונת קיץ'));

  ok('seasons reached the cloud', ((cloud.data.seasons || []).length) === 1);

  /* ---- backdating, so nights already played can count ---- */
  await p.evaluate(() => {
    S.settings.seasonStart = null; S.settings.seasonName = ''; S.seasons = [];
    S.settings.updatedAt = Date.now(); save(); statsMode = null; go('settings');
  });
  await p.waitForTimeout(600);
  await p.locator('button', { hasText: 'פתיחת עונה חדשה' }).click(); await p.waitForTimeout(400);
  ok('the dialog asks for a start date', await p.locator('#se-date').count() === 1);
  ok('it suggests the first night already played', (await p.inputValue('#se-date')) === '2025-01-10');
  ok('the preview counts every night from that date', (await p.textContent('#se-preview')).includes('4'));
  await p.fill('#se-date', '2025-06-01'); await p.waitForTimeout(250);
  ok('moving the date updates the count live', (await p.textContent('#se-preview')).includes('2'));
  await p.fill('#se-new', 'עונת קיץ');
  await p.locator('.sheet-modal button', { hasText: 'פתיחת עונה' }).click(); await p.waitForTimeout(700);
  ok('the season starts on the date that was chosen',
     (await p.evaluate(() => S.settings.seasonStart)) === '2025-06-01');
  ok('a backdated season picks up the nights already played',
     (await p.evaluate(() => seasonGames().filter(g => g.status === 'done').length)) === 2);
  ok('the backdated season is led by ליאל with +56',
     (await p.evaluate(() => leaderboard(seasonGames())[0].net)) === 56);

  /* ---- and the next one can be backdated too ---- */
  await p.evaluate(() => go('settings')); await p.waitForTimeout(600);
  await p.locator('button', { hasText: 'סגירת העונה' }).click(); await p.waitForTimeout(400);
  await p.fill('#se-date', '2025-07-01');
  await p.fill('#se-new', 'עונת סתיו');
  await p.locator('.sheet-modal button', { hasText: 'סגירה ופתיחה' }).click(); await p.waitForTimeout(700);
  const closed = await p.evaluate(() => S.seasons[S.seasons.length - 1]);
  ok('the closed season ends the day before the next begins', closed.end === '2025-06-30');
  ok('the closed season kept its champion', closed.championPid === 'liel' && closed.net === 56);
  ok('the next season starts on its chosen date',
     (await p.evaluate(() => S.settings.seasonStart)) === '2025-07-01');
  ok('the next season holds only the night after that',
     (await p.evaluate(() => seasonGames().filter(g => g.status === 'done').length)) === 1);

  /* ---- a season cannot start before the one it replaces ---- */
  await p.evaluate(() => go('settings')); await p.waitForTimeout(600);
  await p.locator('button', { hasText: 'סגירת העונה' }).click(); await p.waitForTimeout(400);
  await p.fill('#se-date', '2025-01-01');
  await p.locator('.sheet-modal button', { hasText: 'סגירה ופתיחה' }).click(); await p.waitForTimeout(500);
  ok('a season starting before the previous one is refused',
     (await p.evaluate(() => S.settings.seasonStart)) === '2025-07-01');
  ok('and nothing was archived by the refused attempt',
     (await p.evaluate(() => S.seasons.length)) === 1);
  await p.evaluate(() => closeSheet());

  // put the season state back so the rest of the file reads the whole history
  await p.evaluate(() => {
    S.settings.seasonStart = '2025-06-01'; S.settings.seasonName = 'עונת קיץ';
    S.settings.updatedAt = Date.now(); save();
  });
  await p.waitForTimeout(300);

  /* ---- streaks ---- */
  const streaks = await p.evaluate(() => ({
    liel: streakOf('liel'), ron: streakOf('ron'), dor: streakOf('dor'),
  }));
  // newest night first: ליאל won g4 and g3, רון came third in g4, דור came second in g4
  ok('ליאל is on a 2-night in-the-money streak', streaks.liel.hot === true && streaks.liel.n === 2);
  ok('רון ended the last night out of the money', streaks.ron.hot === false && streaks.ron.n === 1);
  ok('דור cashed on the most recent night', streaks.dor.hot === true && streaks.dor.n === 1);
  ok('a hot streak is labelled with a flame', (await p.evaluate(() => streakTag('liel'))).includes('🔥'));
  ok('a single night earns no streak badge', (await p.evaluate(() => streakTag('ron'))) === '');

  /* ---- head to head ---- */
  const h = await p.evaluate(() => headToHead('ron', 'liel'));
  ok('רון and ליאל share four nights', h.games === 4);
  ok('each finished ahead twice', h.aWins === 2 && h.bWins === 2);
  ok('their head-to-head nets match the table', h.aNet === 19 && h.bNet === 19);
  // רון finished ahead of דור in g1, g2 and g3; דור was ahead in g4
  const hd = await p.evaluate(() => headToHead('ron', 'dor'));
  ok('רון leads דור 3–1', hd.aWins === 3 && hd.bWins === 1);
  ok('their head-to-head nets are the all-time nets', hd.aNet === 19 && hd.bNet === -74);

  await p.evaluate(() => openProfile('ron')); await p.waitForTimeout(300);
  ok('the profile draws a cumulative chart', await p.locator('.spark .line').count() === 1);
  ok('the profile shows the KPI row', await p.locator('.kpis').count() === 1);
  ok('the profile offers a head-to-head', await p.locator('button', { hasText: 'השוואה מול' }).count() === 1);
  await p.locator('button', { hasText: 'השוואה מול' }).click(); await p.waitForTimeout(300);
  await p.locator('.sheet-modal .chip', { hasText: 'ליאל' }).click(); await p.waitForTimeout(300);
  ok('the head-to-head sheet shows the 2 : 2 score',
     (await p.textContent('.sheet-modal')).replace(/\s+/g, ' ').includes('2 : 2'));
  await p.evaluate(() => closeSheet());

  /* ---- CSV ---- */
  const csv = await p.evaluate(() => {
    let captured = null;
    const orig = window.downloadFile;
    window.downloadFile = (n, t) => { captured = { n, t }; };
    exportCsv();
    window.downloadFile = orig;
    return captured;
  });
  ok('the CSV export names a .csv file', /\.csv$/.test(csv.n));
  ok('the CSV starts with a BOM so Excel reads Hebrew', csv.t.charCodeAt(0) === 0xFEFF);
  const lines = csv.t.replace(/^﻿/, '').trim().split('\n');
  ok('the CSV has a header plus one row per player per night', lines.length === 1 + 12);
  ok('the CSV header is in Hebrew', lines[0].includes('שחקן') && lines[0].includes('מאזן'));
  ok('a winning row carries the right net', lines.some(l => l.includes('"רון"') && l.includes('"28"') && l.includes('"1"')));
  ok('the bubble boy is marked', lines.some(l => l.includes('"באבל בוי"')));
  ok('rows are ordered oldest first', lines[1].includes('2025-01-10'));

  console.log(errs.length ? 'JS errors:\n' + errs.join('\n') : 'No JS errors.');
  if (errs.length) failures += errs.length;
  await b.close(); s.close();
  process.exit(failures ? 1 : 0);
})();
