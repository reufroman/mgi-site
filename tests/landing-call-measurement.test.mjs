import test from 'node:test';
import assert from 'node:assert/strict';
import { installCallMeasurement, CALL_CONSENT_KEY, LEGACY_CONSENT_KEY } from '../src/data/landing-call-measurement.mjs';
const config = { enabled: true, productionHostname: 'mgiheatingandair.com', googleAdsId: 'AW-123456', callConversionLabel: 'fixture-only', phoneDisplay: '(970) 287-1673', phoneHref: 'tel:+19702871673' };
function environment(host = 'mgiheatingandair.com') {
  const commands = [], scripts = [], listeners = new Map(), values = new Map(), reloads = [];
  const number = { nodeType: 3, nodeValue: 'Call (970) 287-1673', childNodes: [] };
  const icon = { nodeType: 1, childNodes: [{ nodeType: 3, nodeValue: '↗', childNodes: [] }] };
  const attrs = new Map([['href', config.phoneHref], ['aria-label', 'Call (970) 287-1673']]);
  const anchor = { childNodes: [number, icon], getAttribute: key => attrs.get(key) ?? null, setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key) };
  const window = { location: { protocol: 'https:', hostname: host, reload: () => reloads.push('reload') }, localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }, gtag: (...args) => commands.push(args), addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  const document = { head: { appendChild: script => scripts.push(script) }, createElement: () => ({}), querySelectorAll: () => [anchor] };
  return { window, document, commands, scripts, listeners, values, anchor, number, icon, reloads };
}
const callConfigs = env => env.commands.filter(c => c[0] === 'config' && c[1].includes('/'));
// 2026-10-19 (Reu Yep, live since deployment 5c94fea7): ServiceTitan DNI is the single owner of the
// /lp/ phone number. The Google Ads website-call forwarding-number swap (phone_conversion_* config and
// its callback) was removed, so these tests now assert that no swap config is sent and the MGI number
// and tel link are never rewritten by this module. Earlier versions asserted the removed swap.
const adsConfigs = env => env.commands.filter(c => c[0] === 'config' && c[1] === config.googleAdsId);
const unchanged = env => { assert.equal(env.number.nodeValue, 'Call (970) 287-1673'); assert.equal(env.anchor.getAttribute('href'), config.phoneHref); assert.equal(env.anchor.getAttribute('aria-label'), 'Call (970) 287-1673'); assert.equal(env.icon.childNodes[0].nodeValue, '↗'); };
test('no choice and legacy denial block loading and preserve calling', () => {
  for (const prior of [null, 'off']) {
    const env = environment(); if (prior) { env.values.set(LEGACY_CONSENT_KEY, prior); env.values.set(CALL_CONSENT_KEY, 'granted'); }
    const controller = installCallMeasurement(config, env);
    assert.equal(env.scripts.length, 0); assert.deepEqual(env.commands, []);
    controller.deny(); assert.equal(env.anchor.getAttribute('href'), config.phoneHref);
  }
});
test('grant configures one Ads loader and Ads config, no forwarding-number swap, no conversion events', () => {
  const env = environment(), controller = installCallMeasurement(config, env);
  controller.grant(); controller.grant();
  assert.equal(env.scripts.length, 1); assert.equal(callConfigs(env).length, 0);
  assert.deepEqual(env.commands[0], ['consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', analytics_storage: 'denied', ad_personalization: 'denied' }]);
  assert.equal(adsConfigs(env).length, 1); assert.deepEqual(adsConfigs(env)[0][2], { send_page_view: false });
  assert.equal(env.commands.some(c => c[2] && Object.keys(c[2]).some(k => k.startsWith('phone_conversion'))), false);
  assert.equal(env.commands.some(c => c[0] === 'event'), false);
  assert.equal(installCallMeasurement(config, env), controller);
});
test('grant and withdrawal leave the MGI number, tel link, CTA and icon unchanged', () => {
  const env = environment(), controller = installCallMeasurement(config, env); controller.grant();
  unchanged(env);
  controller.deny(); unchanged(env);
});
test('withdrawal and regrant keep one loader and never send a forwarding-number swap', () => {
  const env = environment(), controller = installCallMeasurement(config, env); controller.grant();
  controller.deny(); unchanged(env);
  controller.grant(); unchanged(env);
  assert.equal(callConfigs(env).length, 0); assert.equal(adsConfigs(env).length, 1); assert.equal(env.scripts.length, 1);
  assert.equal(env.commands.filter(c => c[0] === 'consent' && c[1] === 'update').at(-1)[2].ad_storage, 'granted');
});
test('storage changes withdraw calls and synchronize the preference', () => {
  const env = environment(), controller = installCallMeasurement(config, env); controller.grant();
  env.values.set(LEGACY_CONSENT_KEY, 'off'); env.listeners.get('storage')({ key: LEGACY_CONSENT_KEY });
  assert.equal(controller.consent, 'denied'); assert.equal(env.anchor.getAttribute('href'), config.phoneHref);
  controller.dispose(); assert.equal(env.listeners.has('storage'), false);
});
test('choices page, alternate hosts, invalid config, and HTTP never load tags', () => {
  const cases = [
    [environment(), config, true], [environment('localhost'), config, false],
    [environment('www.mgiheatingandair.com'), config, false], [environment(), { ...config, callConversionLabel: null }, false]
  ];
  const http = environment(); http.window.location.protocol = 'http:'; cases.push([http, config, false]);
  for (const [env, settings, choicesOnly] of cases) {
    const controller = installCallMeasurement(settings, { ...env, choicesOnly }); controller.grant();
    assert.equal(env.scripts.length, 0); assert.deepEqual(env.commands, []);
    assert.equal(env.values.get(CALL_CONSENT_KEY), 'granted');
  }
});
test('blocked storage still accepts explicit current-page consent', () => {
  const env = environment(); env.window.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const controller = installCallMeasurement(config, env); controller.grant(); assert.equal(env.scripts.length, 1);
  controller.deny(); assert.equal(controller.consent, 'denied');
});
test('verified optional GA4 uses one loader and one page config only after analytics consent', () => {
  const env = environment(), settings = { ...config, googleAnalyticsId: 'G-FIXTURE123' };
  const controller = installCallMeasurement(settings, env);
  assert.deepEqual(env.commands, []); assert.equal(env.scripts.length, 0);
  controller.grant(); controller.grant();
  assert.equal(env.scripts.length, 1);
  assert.equal(env.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-FIXTURE123');
  assert.equal(env.commands.filter(c => c[0] === 'config' && c[1] === 'G-FIXTURE123').length, 1);
  assert.equal(env.commands[1][2].analytics_storage, 'granted');
  assert.equal(env.commands[1][2].ad_personalization, 'denied');
  assert.equal(env.commands.some(c => c[0] === 'event'), false);
  controller.deny();
  assert.equal(env.commands.at(-1)[2].analytics_storage, 'denied');
  controller.grant();
  assert.equal(env.commands.filter(c => c[0] === 'config' && c[1] === 'G-FIXTURE123').length, 1);
  const invalid = environment(); installCallMeasurement({ ...settings, googleAnalyticsId: 'G-invalid<script>' }, invalid).grant();
  assert.equal(invalid.scripts.length, 0);
});
test('withdrawal reloads once after restoration, denied update, and status; initial denial and choices do not', () => {
  const env = environment(), order = [];
  env.window.location.reload = () => {
    assert.equal(env.anchor.getAttribute('href'), config.phoneHref);
    assert.equal(env.commands.at(-1)[2].ad_storage, 'denied');
    assert.equal(order.at(-1), 'denied');
    env.reloads.push('reload');
  };
  const controller = installCallMeasurement(config, { ...env, onChange: choice => order.push(choice) });
  controller.deny(); assert.equal(env.reloads.length, 0);
  controller.grant(); unchanged(env);
  controller.deny(); controller.deny(); assert.equal(env.reloads.length, 1);
  const choices = environment(); const preference = installCallMeasurement(config, { ...choices, choicesOnly: true });
  preference.grant(); preference.deny(); assert.equal(choices.reloads.length, 0);
  const crossPage = environment(); installCallMeasurement(config, crossPage).grant();
  crossPage.values.set(LEGACY_CONSENT_KEY, 'off'); crossPage.listeners.get('storage')({ key: LEGACY_CONSENT_KEY });
  assert.equal(crossPage.reloads.length, 1);
});

test('GTM-managed analytics grants consent without direct GA4 configuration and retains AW calls',()=>{
 const settings={...config,googleAnalyticsId:'G-FIXTURE123',analyticsManagedByTagManager:true};
 const env=environment();const controller=installCallMeasurement(settings,env);controller.grant();controller.grant();
 assert.equal(env.scripts.length,1);
 assert.equal(env.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=AW-123456');
 assert.equal(env.commands.some(c=>c[0]==='config'&&c[1]==='G-FIXTURE123'),false);
 assert.equal(env.commands.find(c=>c[0]==='consent'&&c[1]==='update')[2].analytics_storage,'granted');
 assert.equal(callConfigs(env).length,0);assert.equal(adsConfigs(env).length,1);
 unchanged(env);
 controller.deny();unchanged(env);assert.equal(env.reloads.length,1);
 const legacy=environment();installCallMeasurement({...settings,analyticsManagedByTagManager:false},legacy).grant();
 assert.equal(legacy.commands.filter(c=>c[0]==='config'&&c[1]==='G-FIXTURE123').length,1);
 assert.equal(legacy.scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-FIXTURE123');
 const invalid=environment();installCallMeasurement({...settings,analyticsManagedByTagManager:'true'},invalid).grant();assert.equal(invalid.scripts.length,0);
});
