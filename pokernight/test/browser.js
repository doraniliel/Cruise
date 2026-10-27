// Finding Playwright's bundled browser.
//
// The container image ships its own Chromium, and both its build number and
// its folder layout change when the image is refreshed — chromium-1194's
// chrome-linux/headless_shell became chromium-1243's
// chrome-headless-shell-linux64/chrome-headless-shell. Every suite used to
// hard-code that path, so one refresh broke all eight at once. Look it up
// instead.
const fs = require('fs'), path = require('path');

const ROOT = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const BINARIES = ['chrome-headless-shell', 'headless_shell', 'chrome'];

function findBrowser(root = ROOT) {
  if (!fs.existsSync(root)) return null;
  const found = [];
  for (const dir of fs.readdirSync(root)) {
    if (!/^chromium/.test(dir)) continue;
    const base = path.join(root, dir);
    let subs = [];
    try { subs = fs.readdirSync(base); } catch (e) { continue; }
    for (const sub of subs) {
      for (const bin of BINARIES) {
        const exe = path.join(base, sub, bin);
        if (fs.existsSync(exe)) found.push(exe);
      }
    }
  }
  if (!found.length) return null;
  // the headless shell starts faster than full Chrome; prefer it
  found.sort((a, b) => (b.includes('headless') ? 1 : 0) - (a.includes('headless') ? 1 : 0));
  return found[0];
}

const executablePath = findBrowser();

// falls back to Playwright's own resolution if nothing was found on disk
const launch = (chromium, opts) =>
  chromium.launch(Object.assign({}, opts, executablePath ? { executablePath } : {}));

module.exports = { executablePath, findBrowser, launch };
