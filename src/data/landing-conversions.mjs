// @ts-nocheck
// Disabled until the supplied widget's exact completion protocol is verified.
// Opening, closing, page views, and DOM events are never booking conversions.
export const LANDING_CONSENT_KEY = 'mgi-lp-ad-measurement-consent-v1';
const HOST = 'mgiheatingandair.com';
const fieldPattern = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/;
const text = (value) => typeof value === 'string' && value.trim().length > 0;

export function validateLandingConversions(config) {
  const errors = [];
  if (config?.enabled !== true) return { enabled: false, valid: true, errors };
  if (config.productionHostname !== HOST) errors.push('Production hostname must be mgiheatingandair.com.');
  if (!/^AW-\d+$/.test(config.googleAdsId || '')) errors.push('A verified Google Ads AW identifier is required.');
  if (!/^[A-Za-z0-9_-]+$/.test(config.googleAdsLabel || '')) errors.push('A verified Google Ads conversion label is required.');
  const provider = config.provider || {};
  try {
    const url = new URL(provider.origin);
    if (url.protocol !== 'https:' || url.origin !== provider.origin || url.username || url.password) throw Error();
  } catch { errors.push('An exact verified HTTPS provider origin is required.'); }
  if (!text(provider.iframeSelector)) errors.push('An exact provider iframe selector is required.');
  for (const field of ['eventTypeField', 'successField', 'receiptField']) {
    if (!fieldPattern.test(provider[field] || '') || /(^|\.)(__proto__|prototype|constructor)(\.|$)/.test(provider[field])) errors.push(`A safe verified ${field} is required.`);
  }
  if (!text(provider.eventType)) errors.push('The exact provider completion event is required.');
  if (!(typeof provider.successValue === 'boolean' || text(provider.successValue))) errors.push('An explicit provider success discriminator is required.');
  for (const field of ['providerProtocolEvidence', 'opaqueReceiptEvidence', 'googleAdsDestinationEvidence', 'productionDomainEvidence', 'consentPolicyEvidence', 'activationApprovalEvidence']) {
    if (!text(config.verification?.[field])) errors.push(`Missing ${field}.`);
  }
  return { enabled: true, valid: errors.length === 0, errors };
}

function ownField(object, path) {
  for (const key of path.split('.')) {
    if (!object || typeof object !== 'object' || !Object.hasOwn(object, key)) return undefined;
    object = object[key];
  }
  return object;
}

export function installLandingMeasurement(config, { window: win, document: doc }) {
  const validation = validateLandingConversions(config);
  const inactive = { status: 'disabled', consent: 'unset', grant: () => false, deny: () => {}, dispose: () => {} };
  if (!validation.enabled || !validation.valid || win.location.protocol !== 'https:' || win.location.hostname !== HOST) return inactive;
  let consent = 'unset';
  let started = false;
  const seen = new Set();
  const provider = config.provider;
  const destination = `${config.googleAdsId}/${config.googleAdsLabel}`;
  try { consent = win.localStorage.getItem(LANDING_CONSENT_KEY) || 'unset'; } catch { /* Ask for an explicit choice when storage is unavailable. */ }
  function saveChoice(choice) {
    consent = choice;
    try { win.localStorage.setItem(LANDING_CONSENT_KEY, choice); } catch { /* The current page choice remains effective. */ }
  }
  function onMessage(event) {
    if (consent !== 'granted' || !event.isTrusted || event.origin !== provider.origin || !event.source) return;
    let frame;
    try { frame = doc.querySelector(provider.iframeSelector); } catch { return; }
    if (!frame || frame.tagName !== 'IFRAME' || event.source !== frame.contentWindow) return;
    try { if (new URL(frame.src, win.location.href).origin !== provider.origin) return; } catch { return; }
    if (ownField(event.data, provider.eventTypeField) !== provider.eventType || ownField(event.data, provider.successField) !== provider.successValue) return;
    const receipt = ownField(event.data, provider.receiptField);
    // Only a verified opaque identifier, never a customer email, phone, or payload.
    if (typeof receipt !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(receipt)) return;
    const key = `mgi-lp-conversion-v1:${destination}:${receipt}`;
    if (seen.has(key)) return;
    try { if (win.sessionStorage.getItem(key) === 'sent') { seen.add(key); return; } } catch { /* In-memory deduplication still applies. */ }
    seen.add(key);
    try {
      win.gtag('event', 'conversion', { send_to: destination, transaction_id: receipt });
      try { win.sessionStorage.setItem(key, 'sent'); } catch { /* Reload deduplication requires usable session storage. */ }
    } catch { seen.delete(key); }
  }
  function start() {
    if (consent !== 'granted') return false;
    if (started) {
      win.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'denied' });
      return true;
    }
    started = true;
    win.dataLayer = win.dataLayer || [];
    win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };
    win.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    win.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied', analytics_storage: 'denied' });
    win.gtag('js', new Date());
    win.gtag('config', config.googleAdsId, { send_page_view: false });
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.googleAdsId)}`;
    doc.head.appendChild(script);
    win.addEventListener('message', onMessage);
    return true;
  }
  const controller = {
    status: 'ready',
    grant() { saveChoice('granted'); return start(); },
    deny() {
      saveChoice('denied');
      if (started) win.gtag('consent', 'update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' });
    },
    dispose() { win.removeEventListener('message', onMessage); },
    get consent() { return consent; }
  };
  if (consent === 'granted') start();
  return controller;
}
