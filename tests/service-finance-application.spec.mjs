import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import net from 'node:net';
import { chromium } from 'playwright';
import { dev } from 'astro';

let base, server, port;
async function freePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
  const result = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return result;
}
before(async () => {
  port = await freePort();
  server = await dev({ root: process.cwd(), server: { host: '127.0.0.1', port }, logLevel: 'silent' });
  base = `http://127.0.0.1:${port}`;
});
after(async () => {
  if (server) await server.stop();
  if (port) {
    const probe = net.createServer();
    await new Promise((resolve, reject) => probe.once('error', reject).listen(port, '127.0.0.1', resolve));
    await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  }
});
const expectedUrl = 'https://apply.svcfin.com/home/dealerAuthentication?id=900127069&key=1742219857';
const digest = value => createHash('sha256').update(value).digest('hex');
const expectedIntro = 'Apply online through Synchrony, Wells Fargo, or Service Finance. Confirm the available plan and your terms before applying.';
const expectedAnswer = 'You can apply online through Synchrony, Wells Fargo, or Service Finance. Confirm which plans are available for your project. The lender determines approval and the terms offered to you.';

for (const width of [1440, 390]) {
  test(`financing page retains the lenders and conditions at ${width}px`, async () => {
    const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--no-sandbox'] });
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      await context.routeWebSocket('**/*', socket => socket.close());
      const page = await context.newPage();
      await page.goto(`${base}/financing/`, { waitUntil: 'load' });
      const section = page.locator('#financing-options');
      assert.equal(await section.locator('.finance-intro p').innerText(), expectedIntro);
      const card = section.locator('.finance-provider-grid > div').filter({ has: page.getByRole('heading', { name: 'Service Finance', exact: true }) });
      assert.equal(await card.count(), 1);
      assert.equal(await card.isVisible(), true);
      const apply = card.getByRole('link', { name: 'Apply for financing with Service Finance (opens in a new tab)' });
      assert.equal(await apply.count(), 1);
      assert.equal(await apply.isVisible(), true);
      assert.equal(digest(await apply.getAttribute('href')), digest(expectedUrl), 'Service Finance destination differs');
      assert.equal(await apply.getAttribute('target'), '_blank');
      assert.match(await apply.getAttribute('rel'), /\bnoopener\b/);
      assert.equal(await card.getByRole('link', { name: /Explore lender questions/ }).getAttribute('href'), 'https://www.svcfin.com/faqs');
      assert.equal(await section.getByRole('link', { name: 'Apply for financing with Synchrony (opens in a new tab)' }).count(), 1);
      assert.equal(await section.getByRole('link', { name: 'Apply for financing with Wells Fargo (opens in a new tab)' }).count(), 1);
      const faq = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Which financing providers should I ask about?' }) });
      assert.equal(await faq.count(), 1);
      await faq.locator('summary').click();
      assert.equal(await faq.locator('p').innerText(), expectedAnswer);
      assert.match(await page.locator('body').innerText(), /subject to credit approval/i);
      assert.match(await page.locator('body').innerText(), /total repayment cost/i);
      assert.equal(await page.locator('a[href="/rebates/"]').count() > 0, true);
      await context.close();
    } finally {
      await browser.close();
    }
  });
}
