import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productionIntegrationErrors, assertProductionIntegrations} from '../src/data/production-integrations.mjs';

// Synthetic records validate evidence rules, without fetching or opening a form.
const fixture = () => {
 const embedUrl = 'https://scheduler.provider-fixture.org/embed/account?campaign=website';
 return {site: {schedulerUrl: embedUrl}, integrations: {
  requestProvider: 'servicetitan-iframe', consentReviewed: true,
  schedulerApproval: {approvedBy: 'Jessica Hoeye', approvedAt: '2026-10-12', evidenceReference: 'fixture:embed-approval', embedUrl},
  providerReadiness: {ready: true, confirmedBy: 'MGI office fixture', confirmedAt: '2026-10-12', evidenceReference: 'fixture:provider-readiness', embedUrl},
  schedulerConsentApproval: {approvedBy: 'Jessica Hoeye', approvedAt: '2026-10-12', evidenceReference: 'fixture:consent-approval', embedUrl}
 }};
};

test('complete exact-URL iframe evidence clears only the integration gate', () => {
 const {site, integrations} = fixture();
 assert.deepEqual(productionIntegrationErrors(site, integrations), []);
 assert.doesNotThrow(() => assertProductionIntegrations(site, integrations));
});

test('missing inputs return all actionable errors and native flags cannot substitute', () => {
 const errors = productionIntegrationErrors({}, {requestDeliveryTested: true, duplicateHandlingTested: true, consentReviewed: true});
 assert.equal(errors.length, 10);
 for (const key of ['requestProvider', 'schedulerUrl', 'schedulerApproval', 'providerReadiness', 'schedulerConsentApproval']) assert.ok(errors.some(error => error.includes(key)));
 assert.throws(() => assertProductionIntegrations({}, {}), error => errors.every(message => error.message.includes(message)));
});

test('malformed, insecure, credential-bearing, and review URLs cannot pass', () => {
 for (const url of [null, '', 'not a URL', 'http://provider.org/embed', 'https://user:secret@provider.org/embed', 'https://localhost/embed', 'https://127.0.0.1/embed', 'https://mgi.localnerds.co/embed', 'https://provider.test/embed', 'https://provider.org:8443/embed', ' https://provider.org/embed']) {
  const {site, integrations} = fixture();
  site.schedulerUrl = url;
  for (const key of ['schedulerApproval', 'providerReadiness', 'schedulerConsentApproval']) integrations[key].embedUrl = url;
  assert.ok(productionIntegrationErrors(site, integrations).some(error => error.startsWith('site.schedulerUrl:')), String(url));
 }
});

test('an account or campaign change reopens all three exact-URL evidence bindings', () => {
 const {site, integrations} = fixture();
 site.schedulerUrl += '&campaign=new';
 assert.equal(productionIntegrationErrors(site, integrations).filter(error => error.includes('.embedUrl:')).length, 3);
});

test('each readiness and approval record requires identity, date, and evidence', () => {
 const checks = [
  ['schedulerApproval', 'approvedBy', 'Someone else'], ['schedulerApproval', 'approvedAt', 'unknown'], ['schedulerApproval', 'evidenceReference', ' '],
  ['providerReadiness', 'ready', false], ['providerReadiness', 'confirmedBy', ' '], ['providerReadiness', 'confirmedAt', 'unknown'], ['providerReadiness', 'evidenceReference', ''],
  ['schedulerConsentApproval', 'approvedBy', 'Someone else'], ['schedulerConsentApproval', 'approvedAt', 'unknown'], ['schedulerConsentApproval', 'evidenceReference', '']
 ];
 for (const [record, key, value] of checks) {
  const {site, integrations} = fixture();
  integrations[record][key] = value;
  assert.ok(productionIntegrationErrors(site, integrations).some(error => error.includes(record)), `${record}.${key}`);
 }
 const {site, integrations} = fixture();
 integrations.consentReviewed = false;
 assert.ok(productionIntegrationErrors(site, integrations).some(error => error.includes('schedulerConsentApproval')));
});

test('legacy native adapter or missing mode cannot clear the chosen iframe gate', () => {
 for (const mode of [undefined, 'native', 'servicetitan', '']) {
  const {site, integrations} = fixture();
  integrations.requestProvider = mode;
  integrations.requestDeliveryTested = true;
  integrations.duplicateHandlingTested = true;
  assert.ok(productionIntegrationErrors(site, integrations).some(error => error.startsWith('integrations.requestProvider:')));
 }
});

test('impossible calendar dates do not count as recorded approval or readiness', () => {
 for (const [record, field] of [['schedulerApproval', 'approvedAt'], ['providerReadiness', 'confirmedAt'], ['schedulerConsentApproval', 'approvedAt']]) {
  const {site, integrations} = fixture();
  integrations[record][field] = '2026-02-30';
  assert.ok(productionIntegrationErrors(site, integrations).some(error => error.includes(record)));
 }
});

const widgetFixture = () => {
 const result = fixture();
 result.site.schedulerWidgetId = '3a4d0205-8ffe-416b-aeeb-84ddc231b1b9';
 result.site.schedulerUrl = null;
 result.integrations.requestProvider = 'servicetitan-webscheduler';
 for (const key of ['schedulerApproval', 'providerReadiness', 'schedulerConsentApproval']) {
  delete result.integrations[key].embedUrl;
  result.integrations[key].widgetId = result.site.schedulerWidgetId;
 }
 return result;
};

test('complete exact-widget evidence clears only the integration gate', () => {
 const {site, integrations} = widgetFixture();
 assert.deepEqual(productionIntegrationErrors(site, integrations), []);
 assert.doesNotThrow(() => assertProductionIntegrations(site, integrations));
});

test('widget changes and stale iframe evidence reopen all three identity bindings', () => {
 for (const useIframeEvidence of [false, true]) {
  const {site, integrations} = widgetFixture();
  if (useIframeEvidence) {
   for (const key of ['schedulerApproval', 'providerReadiness', 'schedulerConsentApproval']) {
    delete integrations[key].widgetId;
    integrations[key].embedUrl = 'https://scheduler.provider-fixture.org/embed/account';
   }
  } else site.schedulerWidgetId = '3a4d0205-8ffe-416b-aeeb-84ddc231b1b8';
  assert.equal(productionIntegrationErrors(site, integrations).filter(error => error.includes('.widgetId:')).length, 3);
 }
});

test('malformed and missing widget IDs cannot pass even when evidence matches', () => {
 for (const id of [null, '', 'not-a-widget', '3a4d0205-8ffe-416b-aeeb-84ddc231b1b9 ', 'https://static.servicetitan.com/webscheduler/shim.js']) {
  const {site, integrations} = widgetFixture();
  site.schedulerWidgetId = id;
  for (const key of ['schedulerApproval', 'providerReadiness', 'schedulerConsentApproval']) integrations[key].widgetId = id;
  assert.ok(productionIntegrationErrors(site, integrations).some(error => error.startsWith('site.schedulerWidgetId:')));
  assert.equal(productionIntegrationErrors(site, integrations).filter(error => error.includes('.widgetId:')).length, 3);
 }
});

test('widget installation alone never supplies public approval or provider readiness', () => {
 const {site} = widgetFixture();
 const errors = productionIntegrationErrors(site, {requestProvider: 'servicetitan-webscheduler'});
 for (const key of ['schedulerApproval', 'providerReadiness', 'schedulerConsentApproval']) assert.ok(errors.some(error => error.includes(key)));
});
