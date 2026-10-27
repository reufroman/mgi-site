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

export function installSchedulerTransport({ window: win, document: doc, policy, widgetId, websiteUrl }) {
  const local = win.location.protocol === 'https:' && win.location.origin === new URL(websiteUrl).origin
    && win.location.hostname === 'mgiheatingandair.com';
  const blocked = () => { const help = doc.getElementById('scheduler-help'); if (help) help.hidden = false; return false; };
  let failed = false;
  const ready = (async () => {
    if (!local) return false;
    await policy.ready;
    policy.refresh?.();
    let cookie = ''; try { cookie = doc.cookie; } catch {}
    const page = new URL(win.location.href);
    const destination = schedulerDestination({ pageUrl: page.href, cookie, measurementAllowed: policy.state.choice === 'granted' });
    for (const key of ATTRIBUTION_KEYS) {
      page.searchParams.delete(key);
      if (destination.searchParams.has(key)) page.searchParams.set(key, destination.searchParams.get(key));
    }
    // The hosting URL must be correct BEFORE the shim snapshots its parent URL.
    if (page.href !== win.location.href) win.history.replaceState(win.history.state, '', page.href);
    win.STWidgetManager = win.STWidgetManager || function () { (win.STWidgetManager.q = win.STWidgetManager.q || []).push(arguments); };
    win.STWidgetManager.l = Date.now();
    win.STWidgetManager('init', widgetId);
    const script = doc.createElement('script'); script.async = true;
    script.src = 'https://static.servicetitan.com/webscheduler/shim.js';
    script.onerror = () => { failed = true; blocked(); };
    doc.head.appendChild(script);
    if (page.searchParams.get('ws-widget') === 'open') win.STWidgetManager('ws-open');
    return true;
  })();
  return { ready, async open(link = '/schedule-service/') {
    if (!await ready || failed) return blocked();
    // The live consent banner has its own bundled policy instance. Same-tab
    // storage writes do not emit storage events, so re-read before opening.
    policy.refresh?.();
    let cookie = ''; try { cookie = doc.cookie; } catch {}
    const destination = schedulerDestination({ pageUrl: win.location.href, link, cookie, measurementAllowed: policy.state.choice === 'granted' });
    const current = new URL(win.location.href);
    const differs = [...ATTRIBUTION_KEYS, ...CONTEXT_KEYS].some(key => (current.searchParams.get(key) || '') !== (destination.searchParams.get(key) || ''));
    // A later link with a different touch needs a new hosting page, never a stale
    // already-initialized widget. Provider persistence still requires vendor proof.
    if (differs) { win.location.assign(destination.href); return true; }
    win.STWidgetManager('ws-open'); return true;
  } };
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
