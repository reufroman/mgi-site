// One effective browser policy governs Google measurement and the ST tag in GTM.
export const CALL_CONSENT_KEY = 'mgi-lp-call-measurement-v1';
export const LEGACY_CONSENT_KEY = 'mgi-optional-tracking';
export const MEASUREMENT_DECISION_KEY = 'mgi-measurement-decision-v1';
export const MEASUREMENT_POLICY_VERSION = '2026-10-19';
const policies = new WeakMap();
const keys = [CALL_CONSENT_KEY, LEGACY_CONSENT_KEY, MEASUREMENT_DECISION_KEY];
function storedPreference(win) {
  try {
    const legacy = win.localStorage.getItem(LEGACY_CONSENT_KEY);
    if (legacy === 'off') return 'denied';
    const choice = win.localStorage.getItem(CALL_CONSENT_KEY);
    if (choice === 'denied') return 'denied';
    if (choice === 'granted') return 'granted';
  } catch { /* Explicit current-document decisions still work without storage. */ }
  return 'unset';
}
export function readMeasurementPreference(win) {
  if (win.navigator?.globalPrivacyControl === true) return 'denied';
  return storedPreference(win);
}
export function saveMeasurementPreference(win, choice) {
  if (!['granted', 'denied'].includes(choice)) return false;
  try {
    win.localStorage.setItem(CALL_CONSENT_KEY, choice);
    win.localStorage.setItem(LEGACY_CONSENT_KEY, choice === 'granted' ? 'on' : 'off');
    win.localStorage.setItem(MEASUREMENT_DECISION_KEY, JSON.stringify({ choice, policyVersion: MEASUREMENT_POLICY_VERSION, decidedAt: new Date().toISOString() }));
  } catch { /* The explicit choice remains valid for this document. */ }
  return true;
}
export function getMeasurementPolicy(win, { choicesOnly = false } = {}) {
  if (policies.has(win)) return policies.get(win);
  let explicit = 'unset', coloradoDefault = false, pending = false, lookupStarted = false, listening = false;
  const subscribers = new Set();
  function resolve() {
    if (win.navigator?.globalPrivacyControl === true) return { choice: 'denied', basis: 'gpc', pending: false };
    const saved = storedPreference(win);
    if (saved === 'denied' || explicit === 'denied') return { choice: 'denied', basis: 'explicit-decline', pending: false };
    if (saved === 'granted' || explicit === 'granted') return { choice: 'granted', basis: 'explicit-allow', pending: false };
    if (coloradoDefault) return { choice: 'granted', basis: 'colorado-opt-out-default', pending: false };
    return { choice: 'unset', basis: pending ? 'region-pending' : 'opt-in-default', pending };
  }
  let state = resolve();
  function refresh() {
    state = resolve();
    for (const listener of subscribers) listener(state);
    return state;
  }
  const storageChanged = event => {
    if (event.key === null || keys.includes(event.key)) { explicit = 'unset'; refresh(); }
  };
  const eligible = !choicesOnly && win.location.protocol === 'https:' && win.location.hostname === 'mgiheatingandair.com'
    && !/^\/privacy-choices(?:\/|$)/.test(win.location.pathname || '/');
  async function lookupRegion() {
    if (!eligible || state.choice !== 'unset' || lookupStarted || typeof win.fetch !== 'function') return state;
    lookupStarted = true; pending = true; refresh();
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 4000);
    timeout.unref?.();
    try {
      const response = await win.fetch('/api/measurement-region', { cache: 'no-store', credentials: 'same-origin', headers: { Accept: 'application/json' }, signal: abort.signal });
      if (response.ok) coloradoDefault = (await response.json())?.coloradoDefault === true;
    } catch { coloradoDefault = false; }
    finally { clearTimeout(timeout); pending = false; refresh(); }
    return state;
  }
  const policy = {
    get state() { return state; },
    refresh,
    grant() { saveMeasurementPreference(win, 'granted'); explicit = 'granted'; return refresh(); },
    deny() { saveMeasurementPreference(win, 'denied'); explicit = 'denied'; return refresh(); },
    subscribe(listener) {
      subscribers.add(listener);
      if (!listening) { win.addEventListener('storage', storageChanged); listening = true; }
      listener(state);
      return () => { subscribers.delete(listener); if (!subscribers.size && listening) { win.removeEventListener('storage', storageChanged); listening = false; } };
    },
    ready: null
  };
  policies.set(win, policy);
  policy.ready = lookupRegion();
  return policy;
}
