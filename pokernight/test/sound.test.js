// The blinds-up alert: loud enough, and the announcement does not talk over
// the chime. Run with: node test/sound.test.js  (from the pokernight folder)
const { chromium } = require('playwright-core');
const { launch: launchBrowser } = require('./browser');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json',
               '.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp3':'audio/mpeg' };
const PASS = 'RaiseKing!59';

let cloud = { version: 0, updatedAt: null, build: 0, data: null };
const server = http.createServer((q, r) => {
  const p = q.url.split('?')[0];
  if (p === '/api/state') {
    if (q.method === 'GET') { r.setHeader('Content-Type','application/json'); r.end(JSON.stringify(cloud)); return; }
    let b = ''; q.on('data', c => b += c);
    q.on('end', () => {
      const j = JSON.parse(b); r.setHeader('Content-Type','application/json');
      if (j.verify) { r.end('{"ok":true,"role":"admin"}'); return; }
      cloud = { version: cloud.version + 1, updatedAt: Date.now(), build: 0,
                data: { players: j.data.players, games: j.data.games,
                        seasons: j.data.seasons || [], settings: j.data.settings || {} } };
      r.end(JSON.stringify({ version: cloud.version }));
    });
    return;
  }
  if (p === '/api/comments' || p === '/api/photos') { r.setHeader('Content-Type','application/json'); r.end('{}'); return; }
  const f = path.join(ROOT, p === '/' ? '/index.html' : p);
  if (fs.existsSync(f)) { r.setHeader('Content-Type', MIME[path.extname(f)] || 'text/plain'); r.end(fs.readFileSync(f)); }
  else { r.statusCode = 404; r.end(); }
});

let failures = 0;
const ok = (n, c) => { if (!c) failures++; console.log((c ? 'PASS' : 'FAIL') + ' — ' + n); };

(async () => {
  await new Promise(r => server.listen(8215, r));
  const b = await launchBrowser(chromium);
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));

  await p.goto('http://localhost:8215/'); await p.waitForTimeout(300);
  await p.locator('.chip', { hasText: 'מנהל' }).click();
  await p.fill('#lg-user', 'pitboss'); await p.fill('#lg-pass', PASS);
  await p.locator('button', { hasText: 'כניסת מנהל' }).click(); await p.waitForTimeout(400);

  // record what is spoken and how many oscillators the chime builds
  const installed = await p.evaluate(() => {
    window.__spoken = [];
    const stub = {
      cancel() {},
      getVoices() { return [{ lang: 'en-US', name: 'Test English' }, { lang: 'he-IL', name: 'Test Hebrew' }]; },
      speak(u) { window.__spoken.push({ text: u.text, lang: u.lang, volume: u.volume, rate: u.rate, voice: u.voice && u.voice.name }); },
      addEventListener() {},
    };
    try { Object.defineProperty(window, 'speechSynthesis', { value: stub, configurable: true, writable: true }); }
    catch (e) { return false; }
    // headless Chromium ships no speech engine at all, so the utterance
    // constructor has to be stood in for as well
    window.SpeechSynthesisUtterance = function (text) { this.text = text; this.lang = ''; this.volume = 1; this.rate = 1; this.pitch = 1; this.voice = null; };
    window.__osc = 0;
    const realTone = window.tone;
    window.tone = function (...a) { window.__osc++; try { return realTone.apply(this, a); } catch (e) {} };
    return window.speechSynthesis === stub;
  });
  ok('the test could stand in for the browser speech engine', installed === true);

  /* ---- defaults ---- */
  ok('volume starts at 100%', await p.evaluate(() => S.settings.volume === 100));
  ok('announcements default to English', await p.evaluate(() => S.settings.voiceLang === 'en'));

  /* ---- the chime itself ---- */
  const chime = await p.evaluate(() => {
    window.__osc = 0; unlockAudio(); playLevelUp();
    return { osc: window.__osc, ms: LEVEL_UP_MS };
  });
  // two passes x three notes x four harmonics
  ok('the blinds-up chime stacks 24 partials', chime.osc === 24);
  ok('the chime runs over two seconds', chime.ms >= 2000);
  const warn = await p.evaluate(() => { window.__osc = 0; playWarn(); return window.__osc; });
  ok('the one-minute warning stays a different, shorter shape', warn === 12 && warn < chime.osc);
  ok('everything runs through one limiter',
     await p.evaluate(() => !!limiter && limiter.ratio.value === 12));

  /* ---- the announcement waits for the chime ---- */
  const timing = await p.evaluate(async () => {
    window.__spoken = [];
    const g = { config: { ladder: [[10,20],[20,40]], levelMinutes: 15, breakAfter: 0, breakMinutes: 10 }, timer: { idx: 1 } };
    levelChanged(g);
    const immediately = window.__spoken.length;
    await new Promise(r => setTimeout(r, LEVEL_UP_MS + 400));
    return { immediately, after: window.__spoken.slice() };
  });
  ok('nothing is spoken while the chime is still ringing', timing.immediately === 0);
  ok('the announcement arrives once the chime is done', timing.after.length === 1);
  const said = timing.after[0] || {};
  ok('it says the blinds are going up', said.text === 'Blinds going up. 20, 40');
  ok('it is spoken at full volume', said.volume === 1);
  ok('it picks a real installed voice', said.voice === 'Test English');
  ok('it is tagged as English', /^en/i.test(said.lang || ''));

  /* ---- Hebrew still available ---- */
  const he = await p.evaluate(async () => {
    S.settings.voiceLang = 'he'; window.__spoken = [];
    levelChanged({ config: { ladder: [[10,20],[600,1200]], levelMinutes: 15, breakAfter: 0, breakMinutes: 10 }, timer: { idx: 1 } });
    await new Promise(r => setTimeout(r, LEVEL_UP_MS + 400));
    S.settings.voiceLang = 'en';
    return window.__spoken.slice();
  });
  ok('Hebrew mode announces in Hebrew', he.length === 1 && (he[0] || {}).text === 'הבליינדים עולים. 600, 1200');
  ok('and picks the Hebrew voice', (he[0] || {}).voice === 'Test Hebrew');

  /* ---- the toggles still mean something ---- */
  const off = await p.evaluate(async () => {
    S.settings.voice = false; window.__spoken = []; window.__osc = 0;
    levelChanged({ config: { ladder: [[10,20],[20,40]], levelMinutes: 15, breakAfter: 0, breakMinutes: 10 }, timer: { idx: 1 } });
    await new Promise(r => setTimeout(r, LEVEL_UP_MS + 300));
    const spokenWithVoiceOff = window.__spoken.length, chimed = window.__osc;
    S.settings.voice = true; S.settings.sound = false; window.__osc = 0;
    playLevelUp();
    const oscWithSoundOff = window.__osc;
    S.settings.sound = true;
    return { spokenWithVoiceOff, chimed, oscWithSoundOff };
  });
  ok('voice off silences the announcement but keeps the chime',
     off.spokenWithVoiceOff === 0 && off.chimed === 24);
  ok('sound off silences the chime', off.oscWithSoundOff === 0);

  /* ---- the volume control ---- */
  await p.evaluate(() => go('settings')); await p.waitForTimeout(400);
  ok('settings show a volume slider', await p.locator('#st-vol').count() === 1);
  ok('the slider starts at the saved value', (await p.inputValue('#st-vol')) === '100');
  ok('settings offer a test button', await p.locator('button', { hasText: 'בדיקת' }).count() === 1);
  ok('settings offer both announcement languages',
     await p.locator('.chip', { hasText: 'English' }).count() === 1
     && await p.locator('.chip', { hasText: 'עברית' }).count() === 1);

  // drive it the way a thumb does: set the value and let oninput fire
  const drag = v => p.evaluate(val => {
    const el = document.getElementById('st-vol');
    el.value = String(val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    unlockAudio();
    return { s: S.settings.volume, gain: masterGain.gain.value, label: document.getElementById('vol-val').textContent };
  }, v);
  const louder = await drag(180);
  ok('dragging the slider raises the master gain', louder.s === 180 && Math.abs(louder.gain - 1.8) < 0.001);
  ok('the slider shows the level while you drag it', louder.label === '180%');
  ok('the slider cannot be dragged past 200%', await p.evaluate(() => document.getElementById('st-vol').max === '200'));
  ok('a value beyond the range is clamped anyway',
     await p.evaluate(() => { setVolume(999); return S.settings.volume === 200; }));
  await drag(150);
  await p.locator('button', { hasText: 'שמירת הגדרות' }).click(); await p.waitForTimeout(1800);
  ok('the volume is saved', await p.evaluate(() => S.settings.volume === 150));
  ok('and reaches the cloud', !!cloud.data && (cloud.data.settings || {}).volume === 150);

  const tested = await p.evaluate(async () => {
    window.__spoken = []; window.__osc = 0;
    testLevelSound();
    const immediately = window.__osc;
    await new Promise(r => setTimeout(r, LEVEL_UP_MS + 400));
    return { immediately, spoke: window.__spoken[0] && window.__spoken[0].text };
  });
  ok('the test button plays the real chime', tested.immediately === 24);
  ok('and speaks the real announcement', tested.spoke === 'Blinds going up. 100, 200');

  ok('a muted setting produces silence',
     await p.evaluate(() => { setVolume(0); unlockAudio(); return masterGain.gain.value === 0; }));

  console.log(errs.length ? 'JS errors:\n' + errs.join('\n') : 'No JS errors.');
  if (errs.length) failures += errs.length;
  await b.close(); server.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
