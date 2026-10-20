// Website-call measurement is separate from saved-booking conversions.
import { CALL_CONSENT_KEY, LEGACY_CONSENT_KEY, readMeasurementPreference, saveMeasurementPreference, getMeasurementPolicy } from './measurement-policy.mjs';
export { CALL_CONSENT_KEY, LEGACY_CONSENT_KEY };
export const readCallPreference = readMeasurementPreference;
export const saveCallPreference = saveMeasurementPreference;
const controllers = new WeakMap();
const PHONE_TEXT = /(?:\+?1[ .-]?)?\(?970\)?[ .-]?287[ .-]?1673/g;
const digits = value => String(value || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

export function validateCallMeasurement(config) {
  return config?.enabled === true && config.productionHostname === 'mgiheatingandair.com'
    && /^AW-\d+$/.test(config.googleAdsId || '')
    && (config.analyticsManagedByTagManager == null || typeof config.analyticsManagedByTagManager === 'boolean')
    && (config.googleAnalyticsId == null || /^G-[A-Z0-9]+$/.test(config.googleAnalyticsId))
    && /^[A-Za-z0-9_-]+$/.test(config.callConversionLabel || '')
    && digits(config.phoneDisplay) === '9702871673' && config.phoneHref === 'tel:+19702871673';
}

export function installCallMeasurement(config, { window: win, document: doc, choicesOnly = false, onChange = () => {} }) {
  if (controllers.has(win)) return controllers.get(win);
  const active = !choicesOnly && validateCallMeasurement(config)
    && win.location.protocol === 'https:' && win.location.hostname === config.productionHostname
    && !/^\/privacy-choices(?:\/|$)/.test(win.location.pathname || '/');
  const policy = getMeasurementPolicy(win, { choicesOnly });
  let consent = policy.state.choice, started = false, disposed = false, generation = 0, withdrawalReloaded = false;
  const originals = new Map();
  const denied = { ad_storage: 'denied', ad_user_data: 'denied', analytics_storage: 'denied', ad_personalization: 'denied' };
  const granted = { ...denied, ad_storage: 'granted', ad_user_data: 'granted', analytics_storage: config.googleAnalyticsId ? 'granted' : 'denied' };
  function restore() {
    for (const [anchor, original] of originals) {
      anchor.setAttribute('href', original.href);
      if (original.aria === null) anchor.removeAttribute('aria-label'); else anchor.setAttribute('aria-label', original.aria);
      for (const [node, text] of original.texts) node.nodeValue = text;
    }
    originals.clear();
  }
  function replacePhone(formatted, mobile, token) {
    if (disposed || consent !== 'granted' || token !== generation || !active) return;
    if (typeof formatted !== 'string' || !/^\+?\d{10,15}$/.test(String(mobile)) || !/[0-9]/.test(formatted) || formatted.length > 40) return;
    for (const anchor of doc.querySelectorAll('a[href^="tel:"]')) {
      if (digits(anchor.getAttribute('href').slice(4)) !== '9702871673' && !originals.has(anchor)) continue;
      if (!originals.has(anchor)) {
        const texts = [];
        function visit(node) {
          if (node.nodeType === 3 && /970\)?[ .-]?287[ .-]?1673/.test(node.nodeValue || '')) texts.push([node, node.nodeValue]);
          for (const child of node.childNodes || []) visit(child);
        }
        visit(anchor);
        originals.set(anchor, { href: anchor.getAttribute('href'), aria: anchor.getAttribute('aria-label'), texts });
      }
      const original = originals.get(anchor);
      anchor.setAttribute('href', `tel:${mobile}`);
      for (const [node, text] of original.texts) node.nodeValue = text.replace(PHONE_TEXT, formatted);
      if (original.aria) anchor.setAttribute('aria-label', original.aria.replace(PHONE_TEXT, formatted));
    }
  }
  function start() {
    if (!active || disposed || consent !== 'granted') return false;
    if (!started) {
      started = true;
      win.dataLayer = win.dataLayer || [];
      win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };
      win.gtag('consent', 'default', denied);
      win.gtag('consent', 'update', granted);
      win.gtag('set', { restricted_data_processing: true });
      win.gtag('js', new Date());
      win.gtag('config', config.googleAdsId, { send_page_view: false });
      if (config.googleAnalyticsId && !config.analyticsManagedByTagManager) win.gtag('config', config.googleAnalyticsId);
      const script = doc.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent((!config.analyticsManagedByTagManager && config.googleAnalyticsId) || config.googleAdsId)}`;
      doc.head.appendChild(script);
    } else win.gtag('consent', 'update', granted);
    ++generation;
    // 2026-10-19 (Reu Yep): ServiceTitan DNI is the single owner of the /lp/ phone number.
    // The Google Ads website-call forwarding-number swap (phone_conversion_*) is removed so the two
    // never fight. AW config, consent mode and GA4-via-GTM above stay. Deployed as 5c94fea7.
    return true;
  }
  function apply(state) {
    const choice = state.choice;
    const previous = consent;
    consent = choice;
    if (choice === 'granted') { if (previous !== 'granted' || !started) start(); }
    else {
      ++generation; restore();
      if (started) win.gtag('consent', 'update', denied);
    }
    onChange(consent, state);
    // Website-call tags lack built-in consent support. Remove their live code
    // by restarting this document with the saved denial after withdrawal.
    if (previous === 'granted' && choice !== 'granted' && started && !withdrawalReloaded && typeof win.location.reload === 'function') {
      withdrawalReloaded = true;
      win.location.reload();
    }
  }
  const controller = {
    status: choicesOnly ? 'choices-only' : active ? 'ready' : 'disabled',
    grant() { policy.grant(); return active; },
    deny() { policy.deny(); },
    dispose() { disposed = true; ++generation; restore(); unsubscribe(); },
    get policyState() { return policy.state; },
    get ready() { return policy.ready; },
    get consent() { return consent; }
  };
  controllers.set(win, controller);
  const unsubscribe = policy.subscribe(apply);
  return controller;
}
