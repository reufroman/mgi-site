import { getMeasurementPolicy } from './measurement-policy.mjs';
const controllers = new WeakMap();
export function installTagManager(config, { window: win, document: doc, choicesOnly = false, manageConsent = true, reloadOnWithdrawal = true, onChange = () => {} }) {
  if (controllers.has(win)) return controllers.get(win);
  const active = !choicesOnly && config?.enabled === true && /^GTM-[A-Z0-9]+$/.test(config.containerId || '')
    && config.productionHostname === 'mgiheatingandair.com' && win.location.protocol === 'https:' && win.location.hostname === config.productionHostname
    && !/^\/privacy-choices(?:\/|$)/.test(win.location.pathname || '/');
  const policy = getMeasurementPolicy(win, { choicesOnly });
  let consent = policy.state.choice, started = false, reloadRequested = false;
  const denied = { ad_storage: 'denied', ad_user_data: 'denied', analytics_storage: 'denied', ad_personalization: 'denied' };
  function start() {
    if (!active || started || consent !== 'granted') return false;
    started = true;
    win.dataLayer = win.dataLayer || [];
    if (manageConsent) {
      win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };
      win.gtag('consent', 'default', denied);
      win.gtag('consent', 'update', { ...denied, ad_storage: 'granted', ad_user_data: 'granted', analytics_storage: 'granted' });
    }
    win.gtag = win.gtag || function () { win.dataLayer.push(arguments); };
    win.gtag('set', { restricted_data_processing: true });
    win.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = doc.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(config.containerId)}`;
    doc.head.appendChild(script);
    return true;
  }
  function apply(state) {
    const choice = state.choice;
    const previous = consent;
    consent = choice;
    if (choice === 'granted') start();
    else if (started && manageConsent) win.gtag('consent', 'update', denied);
    onChange(consent, state);
    if (previous === 'granted' && choice !== 'granted' && started && reloadOnWithdrawal && !reloadRequested) {
      reloadRequested = true;
      win.location.reload();
    }
  }
  const controller = {
    status: choicesOnly ? 'choices-only' : active ? 'ready' : 'disabled',
    grant() { policy.grant(); return active; },
    deny() { policy.deny(); },
    sync() { apply(policy.state); },
    dispose() { unsubscribe(); },
    get policyState() { return policy.state; },
    get ready() { return policy.ready; },
    get consent() { return consent; }
  };
  controllers.set(win, controller);
  const unsubscribe = policy.subscribe(apply);
  return controller;
}
