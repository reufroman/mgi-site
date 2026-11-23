// Native appointment-ID request signal. Installation requires explicit enablement.
export const BOOKING_ACTION = 'AW-621269572/yOT8CKje04UZEMSkn6gC';
export const BOOKING_SCHEDULER = 'MGI-Website-12Oct';
export function nativeAppointmentReceipt(event) {
  if (!event || event.event !== 'BookingBooked' || event.event_category !== 'Scheduling Pro - Booking'
    || event.schedulerName !== BOOKING_SCHEDULER || event.event_label !== 'Appointment id'
    || typeof event.value !== 'string' || !/^[1-9][0-9]{0,19}$/.test(event.value)) return null;
  return { provider: 'servicetitan-scheduling-pro', kind: 'request', id: event.value };
}
export function createNativeBookingReporter({ enabled = false, consent, storage, emit, test = false }) {
  const seen = new Set(), refused = new Set();
  return event => {
    const receipt = nativeAppointmentReceipt(event);
    if (!enabled || test || !receipt) return { sent: false, reason: 'ineligible' };
    let allowed = false; try { allowed = consent() === true; } catch {}
    if (!allowed) { refused.add(receipt.id); return { sent: false, reason: 'consent-denied' }; }
    if (refused.has(receipt.id)) return { sent: false, reason: 'originally-denied' };
    const transactionId = `mgi-sp-request-${receipt.id}`;
    const key = `mgi-native-conversion-v1:${BOOKING_ACTION}:${receipt.id}`;
    if (seen.has(key)) return { sent: false, reason: 'duplicate', transactionId };
    try {
      if (storage.getItem(key) !== null) return { sent: false, reason: 'duplicate', transactionId };
      // Reserve durably before dispatch. Do not release an uncertain attempt:
      // a thrown callback cannot establish that Google did not receive it.
      storage.setItem(key, 'attempted');
      if (storage.getItem(key) !== 'attempted') return { sent: false, reason: 'storage-unavailable' };
    } catch { return { sent: false, reason: 'storage-unavailable' }; }
    seen.add(key);
    try {
      emit({ event: 'mgi_booking_request_confirmed', mgi_appointment_id: receipt.id,
        transaction_id: transactionId, mgi_conversion_action: BOOKING_ACTION,
        mgi_provider: receipt.provider });
      return { sent: true, transactionId };
    } catch { return { sent: false, reason: 'delivery-uncertain', transactionId }; }
  };
}
// Observe trusted native analytics messages without manufacturing BookingBooked
// or replaying a historical dataLayer backlog.
export function installNativeBookingObserver({ window: win, document: doc, consent, report }) {
  let participatingFrame = null;
  const listener = message => {
    const frame = doc.getElementById('se-widget-iframe');
    if (!frame || message.source !== frame.contentWindow || message.origin !== 'https://scheduler.servicetitan.com'
      || message.data?.type !== 'se-send-client-google-analytics') return;
    const ga = message.data.ga;
    if (!ga) return;
    const event = { event: ga.action, event_category: ga.category, event_label: ga.label,
      schedulerName: ga.schedulerName, value: ga.value };
    let allowed = false; try { allowed = consent() === true; } catch {}
    if (!allowed) {
      participatingFrame = null;
      // Let the reporter remember a refused receipt in memory only, so it
      // cannot be replayed after this document's consent later changes.
      if (ga.action === 'BookingBooked') report(event);
      return;
    }
    // Do not replay a restored completed flow after a later consent grant. A
    // fresh, permitted interaction in this document must precede completion.
    if (ga.action === 'BookingProcessStarted' && ga.schedulerName === BOOKING_SCHEDULER) { participatingFrame = frame.contentWindow; return; }
    if (ga.action !== 'BookingBooked' || participatingFrame !== frame.contentWindow) return;
    report(event);
  };
  win.addEventListener('message', listener);
  return () => win.removeEventListener('message', listener);
}

const TRACKING_CONTAINER = 'GTM-5NWW55ZN';
const EXCLUDED_TEST_APPOINTMENTS = new Set(['76346705']);
export function isKnownTestTouch({ href, cookie = '' }) {
  try {
    const page = new URL(href), touch = {};
    for (const key of ['gclid', 'gbraid', 'wbraid', 'utm_campaign']) touch[key] = page.searchParams.get(key) || '';
    const saved = String(cookie).match(/(?:^|;\s*)mgi_click=([^;]*)/);
    const parsed = saved ? JSON.parse(decodeURIComponent(saved[1])) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return true;
    for (const key of ['gclid', 'gbraid', 'wbraid', 'utm_campaign']) {
      if (Object.hasOwn(parsed, key) && (typeof parsed[key] !== 'string' || !parsed[key].length || parsed[key].length > 200 || /[\u0000-\u001f\u007f]/.test(parsed[key]))) return true;
    }
    return [...Object.values(touch), ...['gclid', 'gbraid', 'wbraid', 'utm_campaign'].map(key => parsed?.[key])]
      .some(value => typeof value === 'string' && /^TEST(?:$|[-_]|CODEX|MGI)/i.test(value));
  } catch { return true; } // Unreadable test classification must not send a conversion.
}
export function installNativeBookingMeasurement({ window: win, document: doc, policy, enabled = false }) {
  const eligible = enabled && win.location.protocol === 'https:' && win.location.hostname === 'mgiheatingandair.com'
    && win.location.pathname.replace(/\/$/, '') === '/schedule-service';
  if (!eligible) return { status: 'disabled', dispose() {} };
  if (win.__mgiNativeBookingMeasurement) return win.__mgiNativeBookingMeasurement;
  const consent = () => {
    policy.refresh?.();
    return policy.state.choice === 'granted' && win.navigator?.globalPrivacyControl !== true;
  };
  const storage = { getItem: key => win.localStorage.getItem(key), setItem: (key, value) => win.localStorage.setItem(key, value) };
  const report = createNativeBookingReporter({ enabled: true, consent, storage,
    emit: event => win.dataLayer.push(event) });
  const dispose = installNativeBookingObserver({ window: win, document: doc, consent,
    report: event => {
      // Preserve refusal in memory without reading optional attribution/storage.
      if (!consent()) return report(event);
      if (EXCLUDED_TEST_APPOINTMENTS.has(event.value)) return { sent: false, reason: 'test-receipt' };
      let cookie; try { cookie = doc.cookie; } catch { return { sent: false, reason: 'storage-unavailable' }; }
      if (isKnownTestTouch({ href: win.location.href, cookie })) return { sent: false, reason: 'test-touch' };
      // A loader request is not a receiving tag runtime. Without this container
      // leave no reserved receipt, since the destination cannot process a hit.
      if (!win.google_tag_manager?.[TRACKING_CONTAINER] || !Array.isArray(win.dataLayer)) return { sent: false, reason: 'gtm-unavailable' };
      return report(event);
    } });
  const controller = { status: 'installed', dispose };
  win.__mgiNativeBookingMeasurement = controller;
  return controller;
}
