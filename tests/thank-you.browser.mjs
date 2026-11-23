import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('.local-preview/booking-thank-you-candidate');
const evidence = 'evidence/thank-you-2026-10-29';
const browser = await chromium.launch({ headless: true });
const results = [];
try {
 for (const width of [1440, 393, 320]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  const page = await context.newPage(), errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
   const url = new URL(route.request().url());
   if (url.hostname !== 'mgiheatingandair.com') { external.push(url.hostname); return route.fulfill({ status: 200, body: '', contentType: 'application/javascript' }); }
   if (url.pathname === '/api/measurement-region') return route.fulfill({ json: { coloradoDefault: false } });
   const file = path.resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
   if (!file.startsWith(root + '/')) return route.abort();
   try { const body = await fs.readFile(file); const ext = path.extname(file); return route.fulfill({ body, contentType: ({ '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.webp':'image/webp', '.png':'image/png', '.woff2':'font/woff2' })[ext] || 'application/octet-stream' }); } catch { return route.fulfill({ status: 404, body: 'Missing fixture' }); }
  });
  await page.goto('https://mgiheatingandair.com/booking-thank-you/?gclid=TEST_LOCAL_ONLY&utm_source=google');
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator('.thank-header img').evaluate(img => img.getBoundingClientRect().width), 120);
  assert.equal(await page.locator('img').evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0)), true);
  assert.equal((await context.cookies()).some(c => c.name === 'mgi_click'), false);
  assert.equal(external.length, 0);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  assert.deepEqual(accessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.length })), []);
  await page.screenshot({ path: `${evidence}/${width}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Allow measurement', exact: true }).click();
  await page.waitForFunction(() => document.cookie.includes('mgi_click='));
  assert.match(decodeURIComponent((await context.cookies()).find(c => c.name === 'mgi_click').value), /TEST_LOCAL_ONLY/);
  assert.equal(await page.evaluate(() => (window.dataLayer || []).some(item => /confirmed|conversion|booking/.test(String(item.event || item[0] || '')))), false);
  await page.reload();
  assert.equal(await page.evaluate(() => (window.dataLayer || []).some(item => /confirmed|conversion|booking/.test(String(item.event || item[0] || '')))), false);
  await page.getByRole('button', { name: 'Turn measurement off', exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem('mgi-lp-call-measurement-v1') === 'denied');
  await page.waitForFunction(() => !document.cookie.includes('mgi_click='));
  assert.deepEqual(errors, []);
  results.push({ width, overflow: false, brokenImages: 0, accessibilityViolations: 0, runtimeErrors: errors, deniedExternalRequests: 0, consentAndClickCapture: 'PASS', reloadConversionEvents: 0, withdrawalClearsAttribution: true });
  await context.close();
 }
 await fs.writeFile(evidence + '/browser.json', JSON.stringify({ testMode: 'all requests fulfilled locally; no live booking, pixel, or Ads request', results }, null, 2));
 console.log(JSON.stringify(results));
} finally { await browser.close(); }
