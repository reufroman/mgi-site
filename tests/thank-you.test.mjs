import test from 'node:test';
import assert from 'node:assert/strict';
import { installThankYouAttribution } from '../src/data/thank-you-attribution.mjs';

function fixture({ search = '', hostname = 'mgiheatingandair.com', choice, gpc = false, cookie = '' } = {}) {
  const values = new Map(choice ? [['mgi-lp-call-measurement-v1', choice]] : []);
  const writes = [];
  const win = { location: { protocol: 'https:', hostname, search, pathname: '/thank-you/' }, navigator: { globalPrivacyControl: gpc }, localStorage: { getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v) }, addEventListener() {}, removeEventListener() {} };
  win.document = {};
  Object.defineProperty(win.document, 'cookie', { get: () => cookie, set: v => { writes.push(v); cookie = v; } });
  return { win, writes, values };
}
test('GCLID and UTMs persist only with permission, without a conversion', () => {
  const f = fixture({ search: '?gclid=CLICK_123&utm_source=google&email=private@example.com', choice: 'granted' });
  installThankYouAttribution(f.win);
  assert.equal(f.writes.length, 1);
  assert.match(decodeURIComponent(f.writes[0]), /CLICK_123/);
  assert.doesNotMatch(decodeURIComponent(f.writes[0]), /email|private/);
  assert.equal(f.win.dataLayer, undefined);
  assert.equal(f.win.gtag, undefined);
});
test('unset choice does not persist attribution', () => {
  const f = fixture({ search: '?gclid=CLICK_123' }); installThankYouAttribution(f.win); assert.equal(f.writes.length, 0);
});
test('decline and GPC remove the click cookie', () => {
  for (const option of [{ choice: 'denied' }, { choice: 'granted', gpc: true }]) {
    const f = fixture({ ...option, search: '?gclid=CLICK_123' }); installThankYouAttribution(f.win);
    assert.deepEqual(f.writes, ['mgi_click=; Max-Age=0; Path=/; SameSite=Lax; Secure']);
  }
});
test('preview cannot store production attribution', () => {
  const f = fixture({ hostname: 'preview.pages.dev', search: '?gclid=CLICK_123', choice: 'granted' }); installThankYouAttribution(f.win); assert.equal(f.writes.length, 0);
});
test('a newer UTM touch does not inherit an older click ID', () => {
  const f = fixture({ search: '?utm_source=newsletter', choice: 'granted', cookie: 'mgi_click=' + encodeURIComponent(JSON.stringify({ gclid: 'OLD' })) }); installThankYouAttribution(f.win);
  assert.match(decodeURIComponent(f.writes[0]), /newsletter/); assert.doesNotMatch(decodeURIComponent(f.writes[0]), /OLD|gclid/);
});
test('returning visitors and reloads do not create conversions or extend cookie lifetime', () => {
  const f = fixture({ choice: 'granted', cookie: 'mgi_click=' + encodeURIComponent(JSON.stringify({ gclid: 'EXISTING' })) }); installThankYouAttribution(f.win);
  assert.equal(f.writes.length, 0); assert.equal(f.win.dataLayer, undefined);
});
test('blocked storage leaves the page functional and does not track', () => {
  const f = fixture({ search: '?gclid=CLICK_123' }); f.win.localStorage.getItem = () => { throw Error('blocked'); };
  assert.doesNotThrow(() => installThankYouAttribution(f.win)); assert.equal(f.writes.length, 0);
});
