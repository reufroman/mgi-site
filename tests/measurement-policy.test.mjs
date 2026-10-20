import test from 'node:test';
import assert from 'node:assert/strict';
import { getMeasurementPolicy, CALL_CONSENT_KEY, LEGACY_CONSENT_KEY, MEASUREMENT_DECISION_KEY, MEASUREMENT_POLICY_VERSION } from '../src/data/measurement-policy.mjs';
import { installCallMeasurement } from '../src/data/landing-call-measurement.mjs';
import { installTagManager } from '../src/data/tag-manager.mjs';
import calls from '../src/data/landing-call-measurement.json' with { type: 'json' };
import gtm from '../src/data/tag-manager.json' with { type: 'json' };
function environment({ saved, legacy, gpc = false, coloradoDefault = false, pathname = '/', fetcher } = {}) {
  const values = new Map(), listeners = new Set(), requests = [], scripts = [], commands = [], reloads = [];
  if (saved) values.set(CALL_CONSENT_KEY, saved);
  if (legacy) values.set(LEGACY_CONSENT_KEY, legacy);
  const window = {
    navigator: { globalPrivacyControl: gpc }, location: { protocol: 'https:', hostname: 'mgiheatingandair.com', pathname, reload: () => reloads.push(true) },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    fetch: async (url, options) => { requests.push({ url, options }); return fetcher ? fetcher() : { ok: true, json: async () => ({ coloradoDefault }) }; },
    addEventListener: (type, fn) => { if (type === 'storage') listeners.add(fn); }, removeEventListener: (type, fn) => listeners.delete(fn),
    gtag: (...args) => commands.push(args)
  };
  const document = { head: { appendChild: script => scripts.push(script) }, createElement: () => ({}), querySelectorAll: () => [] };
  return { window, document, values, requests, scripts, commands, reloads, storage(key) { for (const listener of listeners) listener({ key }); } };
}
test('Colorado response grants only an effective default, with no stored decision and one uncached same-origin lookup', async () => {
  const env = environment({ coloradoDefault: true }), policy = getMeasurementPolicy(env.window);
  assert.equal(policy.state.choice, 'unset'); assert.equal(policy.state.pending, true);
  await policy.ready;
  assert.deepEqual(policy.state, { choice: 'granted', basis: 'colorado-opt-out-default', pending: false });
  assert.equal(env.values.size, 0); assert.equal(env.requests.length, 1);
  assert.equal(env.requests[0].url, '/api/measurement-region'); assert.equal(env.requests[0].options.cache, 'no-store'); assert.equal(env.requests[0].options.credentials, 'same-origin');
  assert.equal(getMeasurementPolicy(env.window), policy);
});
test('non-Colorado, malformed response, HTTP error, and lookup failure remain off', async () => {
  for (const fetcher of [undefined, async () => ({ ok: true, json: async () => ({ coloradoDefault: 'true' }) }), async () => ({ ok: false }), async () => { throw Error('network'); }]) {
    const env = environment({ fetcher }), policy = getMeasurementPolicy(env.window); await policy.ready;
    assert.equal(policy.state.choice, 'unset'); assert.equal(policy.state.pending, false); assert.equal(env.values.size, 0);
  }
});
test('GPC and both saved-decline forms outrank older allow and never need geography', async () => {
  for (const settings of [{ gpc: true, saved: 'granted' }, { legacy: 'off', saved: 'granted' }, { saved: 'denied', legacy: 'on' }]) {
    const env = environment({ coloradoDefault: true, ...settings }), policy = getMeasurementPolicy(env.window); await policy.ready;
    assert.equal(policy.state.choice, 'denied'); assert.equal(env.requests.length, 0);
    if (settings.gpc) { policy.grant(); assert.equal(policy.state.choice, 'denied'); assert.equal(policy.state.basis, 'gpc'); }
  }
});
test('explicit decisions record version and time; existing allow resolves without lookup', async () => {
  const old = environment({ saved: 'granted' }), previous = getMeasurementPolicy(old.window); await previous.ready;
  assert.equal(previous.state.basis, 'explicit-allow'); assert.equal(old.requests.length, 0); assert.equal(old.values.has(MEASUREMENT_DECISION_KEY), false);
  const env = environment(), policy = getMeasurementPolicy(env.window); policy.grant(); await policy.ready;
  let record = JSON.parse(env.values.get(MEASUREMENT_DECISION_KEY));
  assert.equal(record.choice, 'granted'); assert.equal(record.policyVersion, MEASUREMENT_POLICY_VERSION); assert.ok(Number.isFinite(Date.parse(record.decidedAt)));
  policy.deny(); record = JSON.parse(env.values.get(MEASUREMENT_DECISION_KEY)); assert.equal(record.choice, 'denied'); assert.equal(policy.state.choice, 'denied');
});
test('late Colorado response cannot override a decline during lookup', async () => {
  let finish; const pending = new Promise(resolve => { finish = resolve; });
  const env = environment({ fetcher: () => pending }), policy = getMeasurementPolicy(env.window); policy.deny();
  finish({ ok: true, json: async () => ({ coloradoDefault: true }) }); await policy.ready;
  assert.equal(policy.state.choice, 'denied'); assert.equal(policy.state.basis, 'explicit-decline');
});
test('shared policy starts GTM and LP calls together after geography and preserves IDs, ownership, and RDP ordering', async () => {
  const env = environment({ coloradoDefault: true, pathname: '/lp/furnace-repair/' });
  const call = installCallMeasurement(calls, env); const manager = installTagManager(gtm, { ...env, manageConsent: false, reloadOnWithdrawal: false });
  assert.equal(env.scripts.length, 0); await call.ready; await manager.ready;
  assert.equal(env.requests.length, 1); assert.equal(env.scripts.length, 2);
  assert.equal(env.scripts.filter(script => script.src.includes('/gtm.js')).length, 1);
  assert.equal(env.commands.filter(args => args[0] === 'config' && args[1] === `${calls.googleAdsId}/${calls.callConversionLabel}`).length, 1);
  const rdp = env.commands.findIndex(args => args[0] === 'set' && args[1].restricted_data_processing === true);
  const ads = env.commands.findIndex(args => args[0] === 'config' && args[1] === calls.googleAdsId);
  assert.ok(rdp >= 0 && rdp < ads); assert.equal(env.commands.find(args => args[0] === 'consent' && args[1] === 'update')[2].ad_personalization, 'denied');
  env.values.set(LEGACY_CONSENT_KEY, 'off'); env.storage(LEGACY_CONSENT_KEY); assert.equal(call.consent, 'denied'); assert.equal(manager.consent, 'denied'); assert.equal(env.reloads.length, 1);
});
test('GPC prevents both optional loaders despite an existing allow', async () => {
  const env = environment({ gpc: true, saved: 'granted', coloradoDefault: true });
  const call = installCallMeasurement(calls, env), manager = installTagManager(gtm, env); await call.ready; await manager.ready;
  call.grant(); manager.grant(); assert.equal(env.scripts.length, 0); assert.equal(env.commands.length, 0);
});
test('privacy choices skip region lookup and load no scripts after explicit choices', async () => {
  const env = environment({ pathname: '/privacy-choices/', coloradoDefault: true });
  const manager = installTagManager(gtm, { ...env, choicesOnly: true }); manager.grant(); manager.deny(); await manager.ready;
  assert.equal(env.requests.length, 0); assert.equal(env.scripts.length, 0); assert.equal(env.commands.length, 0);
});
test('wrong hosts and HTTP do not query regional defaults', async () => {
  for (const [hostname, protocol] of [['localhost','https:'], ['www.mgiheatingandair.com','https:'], ['mgiheatingandair.com','http:']]) {
    const env = environment({ coloradoDefault: true }); Object.assign(env.window.location, { hostname, protocol });
    const manager = installTagManager(gtm, env); await manager.ready; assert.equal(env.requests.length, 0); assert.equal(env.scripts.length, 0);
  }
});
