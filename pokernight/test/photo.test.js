// Photo of the night: it reaches everyone, it is NOT carried inside the state
// document, and only the people running the night can attach one.
// Run with: node test/photo.test.js  (from the pokernight folder)
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp3':'audio/mpeg' };
const PASS = 'RaiseKing!59';
const PIC = path.join(ROOT, 'icon-192.png');   // any real image will do

let failures = 0;
const ok = (n, c) => { if (!c) failures++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + n); };

(async () => {
  const { applyDealerWrite, dealerCode } = await import('../netlify/lib/dealer.mjs');
  const CODE = dealerCode(PASS);
  const roleOf = k => k === PASS ? 'admin' : (k || '').toLowerCase() === CODE ? 'dealer' : null;

  let cloud = { version: 0, updatedAt: null, build: 0, data: null };
  let photos = {};          // gameId -> { id, photo, ts, by }
  const MAX_BYTES = 2500000;

  function mkServer() {
    return http.createServer((q, r) => {
      const u = new URL(q.url, 'http://x');
      const p = u.pathname;

      if (p === '/api/photos') {
        if (q.method === 'GET') {
          const id = u.searchParams.get('id');
          r.setHeader('Content-Type', 'application/json');
          if (!id) {
            const idx = {};
            for (const [k, v] of Object.entries(photos)) idx[k] = { ts: v.ts, by: v.by };
            r.end(JSON.stringify(idx)); return;
          }
          r.end(JSON.stringify(photos[id] || {})); return;
        }
        const role = roleOf(q.headers['x-admin-key'] || '');
        if (!role) { r.statusCode = 401; r.end(); return; }
        let body = ''; q.on('data', c => body += c);
        q.on('end', () => {
          const j = JSON.parse(body);
          const id = String(j.gameId || '');
          if (!id) { r.statusCode = 400; r.end(); return; }
          if (j.action === 'delete') {
            if (role !== 'admin') { r.statusCode = 403; r.end(); return; }
            delete photos[id];
            r.setHeader('Content-Type', 'application/json'); r.end('{"ok":true}'); return;
          }
          const photo = String(j.photo || '');
          if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo)) { r.statusCode = 400; r.end(); return; }
          if (photo.length > MAX_BYTES) { r.statusCode = 413; r.end(); return; }
          photos[id] = { id, photo, ts: Date.now(), by: String(j.by || '') };
          r.setHeader('Content-Type', 'application/json'); r.end('{"ok":true}'); return;
        });
        return;
      }

      if (p === '/api/state') {
        if (q.method === 'GET') { r.setHeader('Content-Type','application/json'); r.end(JSON.stringify(cloud)); return; }
        const role = roleOf(q.headers['x-admin-key'] || '');
        if (!role) { r.statusCode = 401; r.end(); return; }
        let body = ''; q.on('data', c => body += c);
        q.on('end', () => {
          const j = JSON.parse(body);
          r.setHeader('Content-Type','application/json');
          if (j.verify) { r.end(JSON.stringify({ ok: true, role })); return; }
          if (typeof j.baseVersion === 'number' && j.baseVersion !== cloud.version) {
            r.statusCode = 409;
            r.end(JSON.stringify({ conflict:true, version:cloud.version, data:cloud.data })); return;
          }
          const data = role === 'dealer' && cloud.data
            ? applyDealerWrite(cloud.data, j.data)
            : { players: j.data.players, games: j.data.games,
                seasons: j.data.seasons || [], settings: j.data.settings || {} };
          cloud = { version: cloud.version + 1, updatedAt: Date.now(),
                    build: Math.max(cloud.build || 0, Number(j.build) || 0), data };
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

  const s1 = mkServer(), s2 = mkServer(), s3 = mkServer();
  s1.listen(8200); s2.listen(8201); s3.listen(8202);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const admin = await b.newPage({ viewport: { width: 390, height: 844 } });
  const mate  = await b.newPage({ viewport: { width: 390, height: 844 } });
  const deal  = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  for (const [nm, pg] of [['admin', admin], ['mate', mate], ['dealer', deal]]) pg.on('pageerror', e => errs.push(nm + ': ' + e.message));

  const attach = async (page, clicker) => {
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), clicker()]);
    await chooser.setFiles(PIC);
    await page.waitForTimeout(1500);
  };

  /* ---- admin sets up a finished night ---- */
  await admin.goto('http://localhost:8200/'); await admin.waitForTimeout(250);
  await admin.locator('.chip', { hasText: 'מנהל' }).click();
  await admin.fill('#lg-user', 'pitboss'); await admin.fill('#lg-pass', PASS);
  await admin.locator('button', { hasText: 'כניסת מנהל' }).click(); await admin.waitForTimeout(500);
  await admin.evaluate(() => {
    S.players = [{ id:'a', name:'רון', active:true, updatedAt:1 },
                 { id:'b', name:'ליאל', active:true, updatedAt:1 },
                 { id:'c', name:'דור', active:true, updatedAt:1 }];
    S.games = [{
      id:'night1', date:'2026-08-28', status:'done', type:'tournament', isManual:true,
      startAt:null, endAt:null, updatedAt:1, deleted:false,
      config:{ entryPrice:30, houseFee:10, savingsFee:20, splitFirst:65, splitSecond:25,
               splitHouse:10, maxRebuys:12, levelMinutes:15, breakAfter:0, breakMinutes:10 },
      playerIds:['a','b','c'],
      entries:[{id:'e1',pid:'a',delta:1,ts:1},{id:'e2',pid:'b',delta:1,ts:1},{id:'e3',pid:'c',delta:1,ts:1}],
      results:{ first:'a', second:'b', bubble:'c', chop:false },
    }];
    save();
  });
  await admin.waitForTimeout(500);

  /* ---- attaching ---- */
  await admin.evaluate(() => go('summary', 'night1')); await admin.waitForTimeout(400);
  ok('a night with no photo invites one',
     await admin.locator('button', { hasText: 'הוספת תמונה מהערב' }).count() === 1);
  await attach(admin, () => admin.locator('button', { hasText: 'הוספת תמונה מהערב' }).click());
  ok('the photo reached the server', !!photos.night1);
  ok('the photo was stored as a JPEG', /^data:image\/jpeg;base64,/.test(photos.night1.photo));
  ok('the photo was compressed under 400KB', photos.night1.photo.length < 400000);
  ok('the upload records who added it', photos.night1.by === 'מנהל');

  /* ---- the point of the whole design ---- */
  const stateSize = JSON.stringify(cloud.data).length;
  ok('the photo is NOT inside the synced state document',
     !JSON.stringify(cloud.data).includes('data:image/jpeg'));
  ok('the state document stayed small', stateSize < 20000);
  ok('the game record carries no photo field',
     cloud.data.games[0].photo === undefined);

  /* ---- it shows up ---- */
  await admin.waitForTimeout(400);
  ok('the summary shows the picture',
     await admin.locator('.night-photo').count() === 1);
  ok('the picture actually loaded',
     await admin.evaluate(() => { const i = document.querySelector('.night-photo'); return !!i && i.src.startsWith('data:image'); }));
  ok('the admin can replace it', await admin.locator('.night-photo-wrap button', { hasText: 'החלפה' }).count() === 1);
  ok('the admin can remove it', await admin.locator('.night-photo-wrap button', { hasText: 'מחיקה' }).count() === 1);

  await admin.evaluate(() => go('history')); await admin.waitForTimeout(700);
  ok('history shows a thumbnail', await admin.locator('.photo-thumb').count() === 1);
  await admin.evaluate(() => go('home')); await admin.waitForTimeout(700);
  ok('the last-game card shows the picture', await admin.locator('.photo-banner').count() === 1);

  /* ---- everyone else sees it, and cannot change it ---- */
  await mate.goto('http://localhost:8201/'); await mate.waitForTimeout(250);
  await mate.fill('#lg-name', 'אורח'); await mate.locator('button', { hasText: 'כניסה' }).click();
  await mate.waitForTimeout(4000);
  ok('a player’s home screen shows the night’s picture', await mate.locator('.photo-banner').count() === 1);
  await mate.evaluate(() => go('summary', 'night1')); await mate.waitForTimeout(700);
  ok('a player sees the picture on the summary', await mate.locator('.night-photo').count() === 1);
  ok('a player is not offered the camera',
     await mate.locator('button', { hasText: 'הוספת תמונה מהערב' }).count() === 0);
  ok('a player gets no replace or remove buttons',
     await mate.locator('.night-photo-wrap .tools button').count() === 0);

  /* ---- a dealer may attach, but not remove ---- */
  await deal.goto('http://localhost:8202/'); await deal.waitForTimeout(250);
  await deal.locator('.chip', { hasText: 'דילר' }).click();
  await deal.fill('#lg-dname', 'עידו');
  await deal.fill('#lg-code', (CODE.toUpperCase().match(/.{1,4}/g) || []).join('-'));
  await deal.locator('#lg-dbtn').click(); await deal.waitForTimeout(1200);
  await deal.evaluate(() => go('summary', 'night1')); await deal.waitForTimeout(800);
  ok('a dealer may replace the picture',
     await deal.locator('.night-photo-wrap button', { hasText: 'החלפה' }).count() === 1);
  ok('a dealer is not offered removal',
     await deal.locator('.night-photo-wrap button', { hasText: 'מחיקה' }).count() === 0);
  const delAsDealer = await deal.evaluate(async () => {
    const r = await fetch('/api/photos', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-key': SESSION.key },
      body: JSON.stringify({ gameId: 'night1', action: 'delete' }),
    });
    return r.status;
  });
  ok('the server refuses a delete from a dealer', delAsDealer === 403 && !!photos.night1);

  /* ---- what the endpoint will not accept ---- */
  const bad = await admin.evaluate(async () => {
    const post = body => fetch('/api/photos', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-key': SESSION.key },
      body: JSON.stringify(body),
    }).then(r => r.status);
    return {
      notAnImage: await post({ gameId: 'night1', photo: 'javascript:alert(1)' }),
      html: await post({ gameId: 'night1', photo: 'data:text/html;base64,PHNjcmlwdD4=' }),
      huge: await post({ gameId: 'night1', photo: 'data:image/jpeg;base64,' + 'A'.repeat(2600000) }),
      noGame: await post({ photo: 'data:image/jpeg;base64,AAAA' }),
    };
  });
  ok('a non-image is rejected', bad.notAnImage === 400);
  ok('an HTML payload dressed as a photo is rejected', bad.html === 400);
  ok('an oversized photo is rejected', bad.huge === 413);
  ok('a photo with no game is rejected', bad.noGame === 400);
  const anon = await mate.evaluate(async () => (await fetch('/api/photos', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ gameId: 'night1', photo: 'data:image/jpeg;base64,AAAA' }),
  })).status);
  ok('a signed-out visitor cannot attach a photo', anon === 401);
  ok('the real photo survived every rejected attempt',
     /^data:image\/jpeg;base64,/.test(photos.night1.photo));

  /* ---- removing ---- */
  await admin.evaluate(() => go('summary', 'night1')); await admin.waitForTimeout(700);
  await admin.locator('.night-photo-wrap button', { hasText: 'מחיקה' }).click();
  await admin.waitForTimeout(200);
  await admin.locator('#cd-yes').click(); await admin.waitForTimeout(1200);
  ok('the photo is gone from the server', !photos.night1);
  ok('the summary offers the camera again',
     await admin.locator('button', { hasText: 'הוספת תמונה מהערב' }).count() === 1);
  await mate.evaluate(() => { pullPhotoIndex(true); }); await mate.waitForTimeout(1200);
  await mate.evaluate(() => go('home')); await mate.waitForTimeout(600);
  ok('the picture disappears for everyone else too', await mate.locator('.photo-banner').count() === 0);

  console.log(errs.length ? 'JS errors:\n' + errs.join('\n') : 'No JS errors.');
  if (errs.length) failures += errs.length;
  await b.close(); s1.close(); s2.close(); s3.close();
  process.exit(failures ? 1 : 0);
})();
