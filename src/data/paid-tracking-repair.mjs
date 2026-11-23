// Branch candidate. No Google loader, conversion label, or vendor endpoint is created here.
export const ATTRIBUTION_KEYS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_id', 'utm_content', 'utm_term'];
const CONTEXT_KEYS = ['service', 'town', 'topic'];
const allowed = new Set(ATTRIBUTION_KEYS);
const safeValue = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value);
export function attributionFrom(search) {
  const output = {};
  for (const [key, value] of new URLSearchParams(search)) if (allowed.has(key) && safeValue(value) && !(key in output)) output[key] = value;
  return output;
}
export function attributionCookie(cookie) {
  try {
    const match = String(cookie).match(/(?:^|;\s*)mgi_click=([^;]*)/);
    const parsed = JSON.parse(decodeURIComponent(match?.[1] || 'null'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(ATTRIBUTION_KEYS.filter(key => Object.hasOwn(parsed, key) && safeValue(parsed[key])).map(key => [key, parsed[key]]));
  } catch { return {}; }
}
export function schedulerDestination({ pageUrl, link = '/schedule-service/', cookie = '', measurementAllowed = false }) {
  const page = new URL(pageUrl), destination = new URL(link, page);
  if (destination.origin !== page.origin || destination.pathname.replace(/\/$/, '') !== '/schedule-service') throw Error('Only the same-origin scheduler is allowed.');
  if (page.pathname.replace(/\/$/, '') === '/schedule-service') for (const key of CONTEXT_KEYS) {
    if (!destination.searchParams.has(key) && safeValue(page.searchParams.get(key))) destination.searchParams.set(key, page.searchParams.get(key));
  }
  const incoming = attributionFrom(page.search);
  const linked = attributionFrom(destination.search);
  // Any new marketing touch replaces the old touch as a whole. Never attach an old
  // gclid to a new organic/social UTM visit. No click identifier is fabricated.
  const touch = Object.keys(incoming).length ? incoming : Object.keys(linked).length ? linked : attributionCookie(cookie);
  for (const key of ATTRIBUTION_KEYS) destination.searchParams.delete(key);
  if (measurementAllowed) for (const [key, value] of Object.entries(touch)) destination.searchParams.set(key, value);
  destination.searchParams.set('ws-widget', 'open');
  return destination;
}

export const NATIVE_SCHEDULER_ID = 'sched_dumyfs557ofap3vd4lag37v6';
export const NATIVE_SCHEDULER_API_KEY = 'c1rx3xe2fcg3eyfxb1my1jem';
// The native embed reads the complete hosting URL and st-dni-parameters itself.
// Give it only supported routing context plus the permitted current touch.
export function nativeHostingUrl(href, destination) {
  const page = new URL(href), clean = new URL(page.origin + page.pathname);
  for (const key of [...CONTEXT_KEYS, 'ws-widget']) {
    if (safeValue(page.searchParams.get(key))) clean.searchParams.set(key, page.searchParams.get(key));
  }
  for (const key of ATTRIBUTION_KEYS) if (destination.searchParams.has(key)) clean.searchParams.set(key, destination.searchParams.get(key));
  return clean;
}
export function installSchedulerTransport({ window: win, document: doc, policy, websiteUrl, timeoutMs = 15000 }) {
  if (win.__mgiNativeSchedulerTransport) return win.__mgiNativeSchedulerTransport;
  const local = win.location.protocol === 'https:' && win.location.origin === new URL(websiteUrl).origin
    && win.location.hostname === 'mgiheatingandair.com';
  const schedulerPage = win.location.pathname.replace(/\/$/, '') === '/schedule-service';
  const blocked = () => { const help = doc.getElementById('scheduler-help'); if (help) help.hidden = false; return false; };
  let failed = false, initializedChoice, initializedUrl, navigating = false;
  function cleanNavigation(url) {
    navigating = true;
    // A fresh document discards the provider's cached source data. Explicitly
    // suppress referrer so the old tagged URL cannot return through referrer.
    const link = doc.createElement('a'); link.href = url.href;
    link.referrerPolicy = 'no-referrer'; link.rel = 'noreferrer';
    // Keep the site's normal schedule-link interceptor from capturing this
    // required fresh-document navigation. The browser default still runs.
    link.addEventListener?.('click', event => event.stopPropagation());
    doc.body.appendChild(link); link.click(); link.remove();
    return false;
  }
  function normalize(link = '/schedule-service/') {
    policy.refresh?.();
    const granted = policy.state.choice === 'granted' && win.navigator?.globalPrivacyControl !== true;
    let cookie = ''; try { cookie = doc.cookie; } catch {}
    const original = win.location.href;
    const destination = schedulerDestination({ pageUrl: original, link, cookie, measurementAllowed: granted });
    if (granted && (Object.keys(attributionFrom(new URL(original).search)).length || Object.keys(attributionFrom(new URL(link, original).search)).length)) {
      const touch = attributionFrom(destination.search);
      try { doc.cookie = `mgi_click=${encodeURIComponent(JSON.stringify(touch))}; Max-Age=7776000; Path=/; SameSite=Lax; Secure`; } catch {}
    }
    // Never merge arbitrary Marketing Pro fields, stale IDs, or contact details.
    try { win.sessionStorage.removeItem('st-dni-parameters'); }
    catch { return { destination, granted, safe: false }; }
    const page = nativeHostingUrl(original, destination);
    if (page.href !== original) win.history.replaceState(win.history.state, '', page.href);
    return { destination, granted, safe: true };
  }
  const ready = (async () => {
    if (!local || !schedulerPage) return false;
    await policy.ready;
    const normalized = normalize();
    if (!normalized.safe) return blocked();
    initializedChoice = normalized.granted;
    initializedUrl = new URL(win.location.href);
    // The vendor copies document.referrer into its iframe unconditionally.
    // Reload without a referrer if it contains a query/hash, even when allowed:
    // approved attribution comes only from the current touch contract.
    try { const ref = doc.referrer && new URL(doc.referrer); if (ref && (ref.search || ref.hash)) return cleanNavigation(new URL(win.location.href)); } catch { return blocked(); }
    if (doc.getElementById('se-widget-embed') || win.STWidgetManager || win._scheduler) return blocked();
    const appReady = await new Promise(resolve => {
      const timer = setTimeout(() => { failed = true; blocked(); resolve(false); }, timeoutMs);
      const finish = ok => { clearTimeout(timer); resolve(ok); };
      const script = doc.createElement('script'); script.async = true; script.defer = true;
      script.id = 'se-widget-embed';
      script.setAttribute('data-api-key', NATIVE_SCHEDULER_API_KEY);
      script.setAttribute('data-schedulerid', NATIVE_SCHEDULER_ID);
      script.src = 'https://embed.scheduler.servicetitan.com/scheduler-v1.js';
      script.onload = () => {
        if (typeof win._scheduler?.addEventListener !== 'function') { failed = true; finish(blocked()); return; }
        // Script load is not application readiness. Register before its async
        // configuration/iframe handshake completes. No custom Booking* relay.
        win._scheduler.addEventListener('AppReady', () => {
          refreshConsent();
          finish(!failed && !navigating);
        });
      };
      script.onerror = () => { failed = true; finish(blocked()); };
      doc.head.appendChild(script);
    });
    if (appReady && new URL(win.location.href).searchParams.get('ws-widget') === 'open') {
      try { await win._scheduler.show({ schedulerId: NATIVE_SCHEDULER_ID }); }
      catch { failed = true; return blocked(); }
    }
    return appReady;
  })();
  // The live banner may have its own bundled policy instance. Refresh after
  // every UI click, and on storage/focus, to invalidate cached provider state.
  function refreshConsent() {
    if (!local || !schedulerPage || initializedChoice === undefined || navigating) return;
    const normalized = normalize();
    if (!normalized.safe) { failed = true; blocked(); return; }
    if (normalized.granted !== initializedChoice) cleanNavigation(new URL(win.location.href));
  }
  doc.addEventListener?.('click', () => queueMicrotask(refreshConsent));
  win.addEventListener?.('storage', refreshConsent);
  win.addEventListener?.('focus', refreshConsent);
  const transport = { ready, async open(link = '/schedule-service/') {
    if (!local || navigating) return blocked();
    await policy.ready;
    if (!schedulerPage) {
      policy.refresh?.();
      let cookie = ''; try { cookie = doc.cookie; } catch {}
      const destination = schedulerDestination({ pageUrl: win.location.href, link, cookie, measurementAllowed: policy.state.choice === 'granted' && win.navigator?.globalPrivacyControl !== true });
      // Native copies its hosting URL. Keep content-page searches and anchors
      // untouched, and host booking only on the dedicated request page.
      return cleanNavigation(nativeHostingUrl(destination.href, destination));
    }
    const normalized = normalize(link);
    if (!normalized.safe) return blocked();
    if (initializedChoice !== undefined && normalized.granted !== initializedChoice) return cleanNavigation(normalized.destination);
    const current = initializedUrl || new URL(win.location.href);
    const differs = [...ATTRIBUTION_KEYS, ...CONTEXT_KEYS].some(key => (current.searchParams.get(key) || '') !== (normalized.destination.searchParams.get(key) || ''));
    if (differs) { win.location.assign(normalized.destination.href); return true; }
    if (!await ready || failed || navigating) return blocked();
    try { await win._scheduler.show({ schedulerId: NATIVE_SCHEDULER_ID }); return true; }
    catch { failed = true; return blocked(); }
  } };
  win.__mgiNativeSchedulerTransport = transport;
  return transport;
}

// Called only by an adapter backed by a VERIFIED saved provider receipt. This
// module does not infer completion from DOM text, submit, clicks, or postMessage.
// The live adapter is deliberately absent until ServiceTitan specifies its contract.
export function createReceiptReporter({ mode = 'disabled', hostname, consent, storage, emit }) {
  const fixture = mode === 'fixture' && ['127.0.0.1', 'localhost'].includes(hostname);
  const seen = new Set();
  return receipt => {
    if (!fixture || !consent() || !receipt || receipt.confirmed !== true || receipt.test !== true
      || !['form', 'booking'].includes(receipt.kind) || !/^TEST-MGI-[A-Za-z0-9_-]{1,80}$/.test(receipt.id || '')) return false;
    const key = `mgi-receipt-v1:${receipt.kind}:${receipt.id}`;
    try { if (seen.has(key) || storage.getItem(key) === 'sent') return false; }
    catch { return false; } // Fail closed when reload deduplication is unavailable.
    const event = { event: `mgi_${receipt.kind}_confirmed`, mgi_receipt_id: receipt.id, mgi_test: true, mgi_transport: 'fixture' };
    // Reserve before sending to guard reentrant callbacks; release on failure.
    seen.add(key);
    try { storage.setItem(key, 'sent'); emit(event); return true; }
    catch { seen.delete(key); try { storage.removeItem(key); } catch {} return false; }
  };
}
