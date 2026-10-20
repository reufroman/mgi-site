import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANDING_CONSENT_KEY, validateLandingConversions, installLandingMeasurement } from '../src/data/landing-conversions.mjs';
// Fictional protocol fixture, never evidence for the supplied MGI widget.
const fixture = () => ({ enabled: true, productionHostname: 'mgiheatingandair.com', googleAdsId: 'AW-123456789', googleAdsLabel: 'mock-label', provider: { origin: 'https://scheduler.example.test', iframeSelector: '#mock-provider', eventTypeField: 'type', eventType: 'mock-booking-received', successField: 'result.success', successValue: true, receiptField: 'result.receipt' }, verification: Object.fromEntries(['providerProtocolEvidence', 'opaqueReceiptEvidence', 'googleAdsDestinationEvidence', 'productionDomainEvidence', 'consentPolicyEvidence', 'activationApprovalEvidence'].map(key => [key, 'mock-test-only'])) });
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
function browser({ host = 'mgiheatingandair.com', consent, storageFailure = false, session = storage() } = {}) {
  const calls = [], scripts = [], listeners = new Map();
  const frame = { tagName: 'IFRAME', src: 'https://scheduler.example.test/widget', contentWindow: {} };
  const failed = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const localStorage = storageFailure ? failed : storage();
  if (consent) localStorage.setItem(LANDING_CONSENT_KEY, consent);
  const window = { location: { protocol: 'https:', hostname: host, href: `https://${host}/lp/test/` }, localStorage, sessionStorage: storageFailure ? failed : session, gtag: (...args) => calls.push(args), addEventListener: (name, handler) => listeners.set(name, handler), removeEventListener: name => listeners.delete(name) };
  const document = { head: { appendChild: script => scripts.push(script) }, createElement: () => ({}), querySelector: selector => selector === '#mock-provider' ? frame : null };
  const message = (changes = {}) => listeners.get('message')?.({ isTrusted: true, origin: 'https://scheduler.example.test', source: frame.contentWindow, data: { type: 'mock-booking-received', result: { success: true, receipt: 'opaque-receipt-123' } }, ...changes });
  return { window, document, calls, scripts, frame, message, listeners };
}
const conversions = env => env.calls.filter(call => call[0] === 'event' && call[1] === 'conversion');
test('committed default has no guessed protocol and performs no measurement', () => {
  const config = JSON.parse(readFileSync(new URL('../src/data/landing-conversions.json', import.meta.url)));
  assert.equal(config.enabled, false); assert.equal(config.googleAdsId, 'AW-621269572'); assert.ok(Object.values(config.provider).every(v => v === null));
  const env = browser(); assert.equal(installLandingMeasurement(config, env).grant(), false); assert.deepEqual(env.calls, []); assert.equal(env.scripts.length, 0);
});
test('activation requires all evidence and exact HTTPS origin and Google Ads destination', () => {
  assert.equal(validateLandingConversions(fixture()).valid, true);
  const missing = fixture(); missing.verification = {}; assert.equal(validateLandingConversions(missing).errors.length, 6);
  for (const origin of ['http://scheduler.example.test', 'https://scheduler.example.test/path', 'https://scheduler.example.test/']) { const config = fixture(); config.provider.origin = origin; assert.equal(validateLandingConversions(config).valid, false); }
  const unsafe = fixture(); unsafe.provider.receiptField = '__proto__.id'; assert.equal(validateLandingConversions(unsafe).valid, false);
  const config = fixture(); config.googleAdsId = 'G-123'; const env = browser(); assert.equal(installLandingMeasurement(config, env).status, 'disabled'); assert.equal(env.scripts.length, 0);
});
test('review, localhost, alternate production host, and HTTP cannot activate', () => {
  for (const host of ['localhost', 'mgi.localnerds.co', 'www.mgiheatingandair.com', 'mgiheatingandair.com.evil.test']) { const env = browser({ host, consent: 'granted' }); assert.equal(installLandingMeasurement(fixture(), env).status, 'disabled'); assert.equal(env.scripts.length, 0); }
  const env = browser({ consent: 'granted' }); env.window.location.protocol = 'http:'; assert.equal(installLandingMeasurement(fixture(), env).status, 'disabled');
});
test('unset and denied consent never load Google or queue commands', () => {
  for (const consent of [undefined, 'denied', 'invalid']) { const env = browser({ consent }); const controller = installLandingMeasurement(fixture(), env); env.message(); controller.deny(); env.message(); assert.deepEqual(env.calls, []); assert.equal(env.scripts.length, 0); }
});
test('verified origin and source success queues only opaque receipt conversion', () => {
  const env = browser(); const controller = installLandingMeasurement(fixture(), env); controller.grant(); env.message();
  assert.equal(env.scripts.length, 1); assert.equal(env.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=AW-123456789');
  assert.deepEqual(conversions(env), [['event', 'conversion', { send_to: 'AW-123456789/mock-label', transaction_id: 'opaque-receipt-123' }]]);
  assert.ok(env.calls.some(call => call[0] === 'config' && call[2].send_page_view === false));
});
test('wrong origin/source, synthetic event, opens, incomplete success, and PII-like receipts reject', () => {
  const env = browser({ consent: 'granted' }); installLandingMeasurement(fixture(), env);
  const changes = [{ origin: 'https://evil.test' }, { source: {} }, { source: null }, { isTrusted: false }, { data: { type: 'ws-open', result: { success: true, receipt: 'a' } } }, { data: { type: 'mock-booking-received', result: { success: false, receipt: 'a' } } }, { data: { type: 'mock-booking-received', result: { success: true } } }];
  for (const receipt of ['', 'customer@example.test', '970 123 4567', 'x'.repeat(129)]) changes.push({ data: { type: 'mock-booking-received', result: { success: true, receipt } } });
  for (const change of changes) env.message(change);
  env.frame.src = 'https://evil.test/widget'; env.message(); assert.deepEqual(conversions(env), []);
});
test('receipt deduplication works in memory and across installs in one session', () => {
  const session = storage(); const first = browser({ consent: 'granted', session }); installLandingMeasurement(fixture(), first); first.message(); first.message(); assert.equal(conversions(first).length, 1);
  const second = browser({ consent: 'granted', session }); installLandingMeasurement(fixture(), second); second.message(); assert.equal(conversions(second).length, 0);
  second.message({ data: { type: 'mock-booking-received', result: { success: true, receipt: 'another-receipt' } } }); assert.equal(conversions(second).length, 1);
});
test('storage errors retain explicit consent and current-page deduplication', () => {
  const env = browser({ storageFailure: true }); const controller = installLandingMeasurement(fixture(), env); assert.equal(env.scripts.length, 0); controller.grant(); env.message(); env.message(); assert.equal(conversions(env).length, 1);
});
test('withdrawal blocks success and disposal removes the listener', () => {
  const env = browser({ consent: 'granted' }); const controller = installLandingMeasurement(fixture(), env); controller.deny(); env.message(); assert.equal(conversions(env).length, 0);
  controller.grant(); env.message(); assert.equal(conversions(env).length, 1); assert.equal(env.scripts.length, 1); controller.dispose(); assert.equal(env.listeners.has('message'), false);
});
