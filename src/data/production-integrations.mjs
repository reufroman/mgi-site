// Local evidence validation only. This module never loads a provider form.
const approver = 'Jessica Hoeye';
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const recordedDate = value => nonempty(value) && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) &&
 Number.isFinite(Date.parse(value)) && new Date(value.slice(0, 10)).toISOString().slice(0, 10) === value.slice(0, 10);

function publicHttpsUrl(value) {
 if (!nonempty(value) || value !== value.trim()) return false;
 try {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
   url.hostname.includes('.') && !url.hostname.includes(':') && !/^[\d.]+$/.test(url.hostname) &&
   !/(?:^|\.)(?:localhost|localnerds\.co)$/.test(url.hostname) &&
   !/\.(?:invalid|test|local|example)$/.test(url.hostname);
 } catch { return false; }
}

/**
 * Provider intake evidence binds to its exact widget ID or legacy iframe URL.
 * Native adapter tests cannot establish readiness for provider-owned intake.
 */
export function productionIntegrationErrors(site = {}, integrations = {}) {
 const errors = [];
 const widgetMode = integrations.requestProvider === 'servicetitan-webscheduler';
 if (!widgetMode && integrations.requestProvider !== 'servicetitan-iframe') errors.push('integrations.requestProvider: explicitly select servicetitan-webscheduler or servicetitan-iframe');
 const bindingKey = widgetMode ? 'widgetId' : 'embedUrl';
 const bindingValue = widgetMode ? site.schedulerWidgetId : site.schedulerUrl;
 const validBinding = widgetMode
  ? nonempty(bindingValue) && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bindingValue)
  : publicHttpsUrl(bindingValue);
 const bindingLabel = widgetMode ? 'widget ID' : 'embed URL';
 if (!validBinding) errors.push(widgetMode
  ? 'site.schedulerWidgetId: supply the approved ServiceTitan widget UUID'
  : 'site.schedulerUrl: supply the approved public HTTPS ServiceTitan embed URL');
 const approval = integrations.schedulerApproval;
 if (approval?.approvedBy !== approver) errors.push('integrations.schedulerApproval.approvedBy: record Jessica Hoeye approval of the embed');
 if (!recordedDate(approval?.approvedAt)) errors.push('integrations.schedulerApproval.approvedAt: record the embed approval date');
 if (!nonempty(approval?.evidenceReference)) errors.push('integrations.schedulerApproval.evidenceReference: record the approval source');
 if (!validBinding || approval?.[bindingKey] !== bindingValue) errors.push(`integrations.schedulerApproval.${bindingKey}: approval must name the exact configured ${bindingLabel}`);
 const readiness = integrations.providerReadiness;
 if (readiness?.ready !== true || !nonempty(readiness?.confirmedBy) || !recordedDate(readiness?.confirmedAt) || !nonempty(readiness?.evidenceReference)) {
  errors.push('integrations.providerReadiness: record ready=true, confirmedBy, confirmedAt, and evidenceReference from MGI/provider-side confirmation of the correct account, routing, and scheduling readiness');
 }
 if (!validBinding || readiness?.[bindingKey] !== bindingValue) errors.push(`integrations.providerReadiness.${bindingKey}: provider-side readiness must name the exact configured ${bindingLabel}`);
 const consent = integrations.schedulerConsentApproval;
 if (integrations.consentReviewed !== true || consent?.approvedBy !== approver || !recordedDate(consent?.approvedAt) || !nonempty(consent?.evidenceReference)) {
  errors.push('integrations.schedulerConsentApproval: record consentReviewed=true and Jessica Hoeye approval with approvedAt and evidenceReference for provider consent/privacy handling');
 }
 if (!validBinding || consent?.[bindingKey] !== bindingValue) errors.push(`integrations.schedulerConsentApproval.${bindingKey}: consent approval must name the exact configured ${bindingLabel}`);
 return errors;
}

export function assertProductionIntegrations(site, integrations) {
 const errors = productionIntegrationErrors(site, integrations);
 if (errors.length) throw Error('Release blocked: ServiceTitan intake inputs remain open\n' + errors.join('\n'));
}
