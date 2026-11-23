import { getMeasurementPolicy } from './measurement-policy.mjs';
import { attributionFrom, attributionCookie } from './paid-tracking-repair.mjs';

// This destination is deliberately NOT proof of a saved booking. The existing
// consent-gated GTM owns pixels. Enable a conversion only after the provider's
// success contract, intended Ads action, and native/browser deduplication pass QA.
export function installThankYouAttribution(win) {
  const policy = getMeasurementPolicy(win);
  const production = win.location.protocol === 'https:' && win.location.hostname === 'mgiheatingandair.com';
  const incoming = attributionFrom(win.location.search);
  const apply = state => {
    if (!production) return;
    try {
      if (state.choice === 'denied') {
        win.document.cookie = 'mgi_click=; Max-Age=0; Path=/; SameSite=Lax; Secure';
        return;
      }
      if (state.choice !== 'granted') return;
      const touch = Object.keys(incoming).length ? incoming : attributionCookie(win.document.cookie);
      if (Object.keys(incoming).length) win.document.cookie = `mgi_click=${encodeURIComponent(JSON.stringify(touch))}; Max-Age=7776000; Path=/; SameSite=Lax; Secure`;
      // Do not copy click IDs into a dataLayer, pixels, or an invented receipt.
    } catch { /* The reassurance page remains useful when storage is blocked. */ }
  };
  const unsubscribe = policy.subscribe(apply);
  win.addEventListener('mgi:measurement-choice', () => policy.refresh());
  return { policy, dispose: unsubscribe };
}
