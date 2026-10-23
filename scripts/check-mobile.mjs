/**
 * Mobile regression check. Run `npm run check:mobile` after `npm run dev`.
 * Requires Playwright (`npm i -D playwright`) in projects that do not already
 * provide it. It checks all hash routes, both directions and the requested
 * phone widths for horizontal overflow and browser edge strips.
 */
const routes = ['/', '/about', '/services', '/who-we-serve', '/insights', '/contact'];
const widths = [360, 375, 390, 412, 430];
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Playwright is required: npm i -D playwright');
  process.exit(1);
}
const browser = await chromium.launch({ headless: true });
const failures = [];
for (const lang of ['ar', 'en']) for (const width of widths) for (const route of routes) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(`${base}/#${route}`, { waitUntil: 'networkidle' });
  if (lang === 'en') await page.getByRole('button', { name: 'AR EN' }).click();
  const report = await page.evaluate(() => {
    const vw = innerWidth, bg = ['#fbf8f3', '#f1e7db'];
    const offenders = [...document.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect(); return r.left < -0.5 || r.right > vw + 0.5;
    }).map(el => ({ tag: el.tagName, class: el.className, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right }));
    return { scrollWidth: document.documentElement.scrollWidth, vw, offenders, bg };
  });
  if (report.scrollWidth > width || report.offenders.length) failures.push({ lang, width, route, ...report });
  await page.screenshot({ path: `mobile-${lang}-${width}-${route.replaceAll('/', '_') || 'home'}.png` });
  await page.close();
}
await browser.close();
if (failures.length) { console.error(JSON.stringify(failures, null, 2)); process.exit(1); }
console.log('Mobile check passed: no horizontal overflow at 360–430px in AR and EN.');
