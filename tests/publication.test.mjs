import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertPublication, publicationErrors, publicationAudit} from '../src/data/publication.mjs';

const fixture = () => {
 const expected = {
  canonicalOrigin: 'https://mgiheatingandair.com', renderSourceHash: 'a'.repeat(64),
  pageHashes: {'ST-001': 'b'.repeat(64), 'ST-004': 'c'.repeat(64)},
  imageHashes: {'IMG-001': 'd'.repeat(64)}, now: '2026-10-12T23:59:59Z',
  site: {schedulerWidgetId: '73995714-0241-4b8a-a89d-e81f8b1dfef6', schedulerWebsiteUrl: 'https://mgiheatingandair.com'}
 };
 const record = {
  approvedBy: 'Jessica Hoeye', reportedBy: 'Reu', approvedAt: '2026-10-12', evidenceReference: 'fixture:explicit human instruction',
  canonicalOrigin: expected.canonicalOrigin, renderSourceHash: expected.renderSourceHash,
  pages: Object.fromEntries(Object.entries(expected.pageHashes).map(([id, contentHash]) => [id, {contentHash}])),
  images: Object.fromEntries(Object.entries(expected.imageHashes).map(([id, sourceHash]) => [id, {sourceHash}])),
  scheduler: {requestProvider: 'servicetitan-webscheduler', widgetId: expected.site.schedulerWidgetId, websiteUrl: expected.site.schedulerWebsiteUrl, scriptUrl: 'https://static.servicetitan.com/webscheduler/shim.js'},
  unresolvedAssurances: [{id: 'office-routing', status: 'not-tested', owner: 'MGI office', nextAction: 'Confirm incoming requests reach the correct team.'}]
 };
 return {record, expected};
};

test('exact public permission passes without manufacturing assurance', () => {
 const {record, expected} = fixture();
 const before = JSON.stringify(record);
 assert.deepEqual(publicationErrors(record, expected), []);
 assert.doesNotThrow(() => assertPublication(record, expected));
 const audit = publicationAudit(record, expected);
 assert.equal(audit.publicationAuthorized, true);
 assert.equal(audit.assuranceStatus, 'unverified');
 assert.equal(audit.unresolvedAssurances[0].status, 'not-tested');
 audit.unresolvedAssurances[0].status = 'modified';
 assert.equal(JSON.stringify(record), before);
});

test('missing identity, evidence, and invalid or future dates block permission', () => {
 for (const [key, value] of [['approvedBy', 'Mike'], ['reportedBy', 'unknown'], ['evidenceReference', ' '], ['approvedAt', '2026-02-30'], ['approvedAt', '2026-10-13'], ['approvedAt', '2026-10-12Tbad'], ['approvedAt', null]]) {
  const {record, expected} = fixture(); record[key] = value;
  assert.ok(publicationErrors(record, expected).some(error => error.includes(key)), key);
 }
 assert.throws(() => assertPublication(null, {}), /authorization/);
});

test('source and image changes, missing and extra routes, and invalid hashes block', () => {
 for (const mutate of [
  r => {r.renderSourceHash = 'e'.repeat(64);}, r => {r.pages['ST-001'].contentHash = 'f'.repeat(64);},
  r => {delete r.pages['ST-004'];}, r => {r.pages.EXTRA = {contentHash: 'b'.repeat(64)};},
  r => {r.images['IMG-001'].sourceHash = '0'.repeat(64);}, r => {delete r.images['IMG-001'];},
  r => {r.images.EXTRA = {sourceHash: 'd'.repeat(64)};}
 ]) {
  const {record, expected} = fixture(); mutate(record);
  assert.throws(() => assertPublication(record, expected));
 }
 const {record, expected} = fixture();
 expected.pageHashes['ST-001'] = record.pages['ST-001'].contentHash = 'not-a-hash';
 assert.throws(() => assertPublication(record, expected), /source changed/);
});

test('production origin and configured scheduler must match exact authorization', () => {
 for (const mutate of [
  r => {r.canonicalOrigin += '/';}, r => {r.scheduler.widgetId = '73995714-0241-4b8a-a89d-e81f8b1dfef7';},
  r => {r.scheduler.websiteUrl = 'https://mgi.localnerds.co';}, r => {r.scheduler.scriptUrl = 'https://other.org/shim.js';},
  r => {r.scheduler.requestProvider = 'native';}, r => {delete r.scheduler;}
 ]) {
  const {record, expected} = fixture(); mutate(record);
  assert.throws(() => assertPublication(record, expected));
 }
 const {record, expected} = fixture();
 expected.canonicalOrigin = record.canonicalOrigin = 'https://mgi.localnerds.co';
 assert.throws(() => assertPublication(record, expected), /production origin/);
});

test('unresolved assurance cannot be described as verified or cleared with readiness flags', () => {
 for (const mutate of [
  r => {delete r.unresolvedAssurances;}, r => {r.unresolvedAssurances[0].status = 'verified';},
  r => {r.unresolvedAssurances[0].verified = true;}, r => {r.ready = true;},
  r => {r.pages['ST-001'].evidence = {sourceGate: true};},
  r => {r.unresolvedAssurances.push({...r.unresolvedAssurances[0]});},
  r => {r.unresolvedAssurances[0].owner = '';}
 ]) {
  const {record, expected} = fixture(); mutate(record);
  assert.throws(() => assertPublication(record, expected));
 }
});

test('validator requires actual nonempty selected source sets and valid widget config', () => {
 for (const mutate of [
  e => {e.pageHashes = {};}, e => {e.imageHashes = {};}, e => {delete e.renderSourceHash;},
  e => {e.site.schedulerWidgetId = 'invalid';}, e => {e.site.schedulerWebsiteUrl = 'https://wrong.org';}
 ]) {
  const {record, expected} = fixture(); mutate(expected);
  assert.throws(() => assertPublication(record, expected));
 }
});

test('scoped Reu landing authorization retains the prior approved baseline',()=>{
 const {record,expected}=fixture();expected.renderSourceHash='e'.repeat(64);
 const landing=Object.fromEntries(Array.from({length:9},(_,i)=>[`LP-00${i+1}`,'f'.repeat(64)]));Object.assign(expected.pageHashes,landing);
 record.supplementalRelease={authorizedBy:'Reu',authorizedAt:'2026-10-12',canonicalOrigin:expected.canonicalOrigin,evidenceReference:'fixture:Reu explicitly directs landing rollout and live deployment',renderSourceHash:expected.renderSourceHash,pages:Object.fromEntries(Object.entries(landing).map(([id,contentHash])=>[id,{contentHash}]))};
 assert.deepEqual(publicationErrors(record,expected),[]);
 const changedBaseline=structuredClone(record);changedBaseline.pages['ST-001'].contentHash='0'.repeat(64);assert.ok(publicationErrors(changedBaseline,expected).some(e=>e.includes('ST-001')));
 for(const mutate of [r=>{r.supplementalRelease.pages['ST-002']={contentHash:'f'.repeat(64)}},r=>{delete r.supplementalRelease.pages['LP-009']},r=>{r.supplementalRelease.authorizedBy='unknown'},r=>{r.supplementalRelease.evidenceReference=''}]){const copy=structuredClone(record);mutate(copy);assert.ok(publicationErrors(copy,expected).some(e=>e.includes('supplementalRelease')));}
});

test('exact Reu measurement release preserves baseline permission and blocks unrelated changes',()=>{
 const {record,expected}=fixture();
 const original=structuredClone(record);
 expected.renderSourceHash='e'.repeat(64);
 record.measurementRelease={authorizedBy:'Reu',authorizedAt:'2026-10-12',scope:'sitewide-consent-tag-manager',containerId:'GTM-5NWW55ZN',canonicalOrigin:expected.canonicalOrigin,evidenceReference:'fixture: I am the CMO this is a yes',renderSourceHash:expected.renderSourceHash,pages:structuredClone(record.pages)};
 assert.deepEqual(publicationErrors(record,expected),[]);
 assert.deepEqual(record.pages,original.pages);
 assert.equal(publicationAudit(record,expected).approvedBy,'Jessica Hoeye');
 assert.equal(publicationAudit(record,expected).measurementAuthorization.authorizedBy,'Reu');
 for(const mutate of [r=>{delete r.measurementRelease},r=>{r.measurementRelease.authorizedBy='unknown'},r=>{r.measurementRelease.authorizedAt='2026-10-13'},r=>{r.measurementRelease.evidenceReference=''},r=>{r.measurementRelease.scope='any-change'},r=>{r.measurementRelease.canonicalOrigin='https://other.org'},r=>{r.measurementRelease.renderSourceHash='f'.repeat(64)},r=>{r.measurementRelease.containerId='GTM-WRONG'},r=>{delete r.measurementRelease.pages['ST-004']},r=>{r.measurementRelease.pages.EXTRA={contentHash:'f'.repeat(64)}},r=>{r.measurementRelease.pages['ST-001'].contentHash='f'.repeat(64)}]){
  const copy=structuredClone(record);mutate(copy);assert.throws(()=>assertPublication(copy,expected));
 }
 const changed=structuredClone(expected);changed.pageHashes['ST-001']='f'.repeat(64);
 const falselyBound=structuredClone(record);falselyBound.measurementRelease.pages['ST-001'].contentHash=changed.pageHashes['ST-001'];
 assert.throws(()=>assertPublication(falselyBound,changed),/unchanged non-privacy/);
 const extra=structuredClone(expected);extra.pageHashes.EXTRA='f'.repeat(64);const extraRecord=structuredClone(record);extraRecord.measurementRelease.pages.EXTRA={contentHash:'f'.repeat(64)};
 assert.throws(()=>assertPublication(extraRecord,extra),/existing route set/);
});
