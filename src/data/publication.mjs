import {readFileSync} from 'node:fs';

// Publication permission is distinct from professional or operating assurance.
// This module reads local records only. It never loads the provider scheduler.
const nonempty = value => typeof value === 'string' && value.trim() !== '';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const widget = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const scriptUrl = 'https://static.servicetitan.com/webscheduler/shim.js';
const assuranceStates = new Set(['unverified', 'pending', 'not-tested']);

function recordedDate(value, now) {
 if (!nonempty(value) || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false;
 const parsed = Date.parse(value);
 return Number.isFinite(parsed) && new Date(value.slice(0, 10)).toISOString().slice(0, 10) === value.slice(0, 10) && parsed <= Date.parse(now);
}

export function readPublication(filePath = new URL('./publication.json', import.meta.url)) {
 return JSON.parse(readFileSync(filePath, 'utf8'));
}

/** Expected hashes must be computed from the actual selected render inputs. */
export function publicationErrors(record, expected = {}) {
 const errors = [];
 if (!object(record)) return ['publication: supply a recorded public-release authorization'];
 if (record.approvedBy !== 'Jessica Hoeye') errors.push('publication.approvedBy: record Jessica Hoeye public-release approval');
 if (record.reportedBy !== 'Reu') errors.push('publication.reportedBy: record Reu as the approval reporter');
 if (!recordedDate(record.approvedAt, expected.now || new Date().toISOString())) errors.push('publication.approvedAt: supply a real, non-future approval date');
 if (!nonempty(record.evidenceReference)) errors.push('publication.evidenceReference: name the human instruction reporting approval');
 if (expected.canonicalOrigin !== 'https://mgiheatingandair.com' || record.canonicalOrigin !== expected.canonicalOrigin) errors.push('publication.canonicalOrigin: authorization must bind the exact production origin https://mgiheatingandair.com');
 const supplement=record.supplementalRelease;
 // This supplemental permission covers measurement presentation and the exact
 // frozen render source only. All existing content except privacy disclosures
 // must retain its earlier baseline or landing authorization.
 const measurement=record.measurementRelease;
 const selectedIds=Object.keys(expected.pageHashes||{});
 const priorPages={...(record.pages||{}),...(supplement?.pages||{})};
 const measurementIds=Object.keys(measurement?.pages||{});
 const scopedMeasurement=object(measurement)&&measurement.authorizedBy==='Reu'&&measurement.scope==='sitewide-consent-tag-manager'&&measurement.containerId==='GTM-5NWW55ZN'&&measurement.canonicalOrigin===expected.canonicalOrigin&&recordedDate(measurement.authorizedAt,expected.now||new Date().toISOString())&&nonempty(measurement.evidenceReference)&&hash(measurement.renderSourceHash)&&measurement.renderSourceHash===expected.renderSourceHash&&object(measurement.pages)&&selectedIds.length>0&&measurementIds.length===selectedIds.length&&measurementIds.every(id=>Object.hasOwn(expected.pageHashes,id)&&Object.hasOwn(priorPages,id)&&measurement.pages[id]?.contentHash===expected.pageHashes[id])&&selectedIds.every(id=>['ST-014','ST-017'].includes(id)||priorPages[id]?.contentHash===expected.pageHashes[id]);
 if(measurement&&!scopedMeasurement)errors.push('publication.measurementRelease: require exact Reu permission, production origin, source, container, existing route set, and unchanged non-privacy content');
 const landingIds=Object.keys(expected.pageHashes||{}).filter(id=>/^LP-00[1-9]$/.test(id));
 const supplementalIds=Object.keys(supplement?.pages||{});
 const permittedIds=[...landingIds,'ST-014','ST-017'];
 const scopedSupplement=object(supplement)&&supplement.authorizedBy==='Reu'&&supplement.canonicalOrigin===expected.canonicalOrigin&&recordedDate(supplement.authorizedAt,expected.now||new Date().toISOString())&&nonempty(supplement.evidenceReference)&&hash(supplement.renderSourceHash)&&(supplement.renderSourceHash===expected.renderSourceHash||scopedMeasurement)&&object(supplement.pages)&&landingIds.length===9&&[9,11].includes(supplementalIds.length)&&supplementalIds.every(id=>permittedIds.includes(id))&&supplementalIds.every(id=>(supplement.pages[id]?.contentHash===expected.pageHashes[id]||(scopedMeasurement&&['ST-014','ST-017'].includes(id))))&&landingIds.every(id=>(supplement.pages[id]?.contentHash===expected.pageHashes[id]||(scopedMeasurement&&['ST-014','ST-017'].includes(id))));
 if(supplement&&!scopedSupplement)errors.push('publication.supplementalRelease: require exact Reu authorization for the nine campaign landing pages and explicitly authorized privacy disclosures only');
 if (!hash(expected.renderSourceHash) || (record.renderSourceHash !== expected.renderSourceHash&&!scopedSupplement&&!scopedMeasurement)) errors.push('publication.renderSourceHash: rendered source changed or exact source binding is missing');
 for (const [field, expectedField, hashField] of [['pages', 'pageHashes', 'contentHash'], ['images', 'imageHashes', 'sourceHash']]) {
  const wanted = expected[expectedField];
  const approved = record[field];
  if (!object(wanted) || !Object.keys(wanted).length) { errors.push(`expected.${expectedField}: supply actual nonempty source hashes`); continue; }
  if (!object(approved)) { errors.push(`publication.${field}: supply exact authorized source bindings`); continue; }
  for (const [id, sourceHash] of Object.entries(wanted)) {
   if (!hash(sourceHash) || ((field==='pages'&&scopedMeasurement?measurement.pages[id]?.contentHash:undefined)??(field==='pages'&&scopedSupplement?supplement.pages[id]?.contentHash:undefined)??approved[id]?.[hashField]) !== sourceHash) errors.push(`publication.${field}.${id}.${hashField}: source changed or authorization missing`);
  }
  for (const id of Object.keys(approved)) if (!Object.hasOwn(wanted, id)) errors.push(`publication.${field}.${id}: extra authorization outside the selected source set`);
 }
 const site = expected.site || {};
 const scheduler = record.scheduler;
 if (!object(scheduler) || scheduler.requestProvider !== 'servicetitan-webscheduler' || !widget(site.schedulerWidgetId) || scheduler.widgetId !== site.schedulerWidgetId || site.schedulerWebsiteUrl !== expected.canonicalOrigin || scheduler.websiteUrl !== site.schedulerWebsiteUrl || scheduler.scriptUrl !== scriptUrl) {
  errors.push('publication.scheduler: bind the exact configured ServiceTitan widget, production website URL, and official shim script');
 }
 if (!Array.isArray(record.unresolvedAssurances)) errors.push('publication.unresolvedAssurances: explicitly record outstanding assurance checks');
 else {
  const ids = new Set();
  for (const assurance of record.unresolvedAssurances) {
   if (!object(assurance) || !nonempty(assurance.id) || !assuranceStates.has(assurance.status) || !nonempty(assurance.owner) || !nonempty(assurance.nextAction)) errors.push('publication.unresolvedAssurances: each item needs id, unverified/pending/not-tested status, owner, and nextAction');
   if (ids.has(assurance?.id)) errors.push(`publication.unresolvedAssurances: duplicate id ${assurance.id}`);
   ids.add(assurance?.id);
  }
 }
 // Permission does not manufacture readiness or independent verification.
 const rejectClaims = (value, path) => {
  if (!object(value) && !Array.isArray(value)) return;
  for (const [key, item] of Object.entries(value)) {
   if (['ready', 'verified', 'sourceGate', 'professionallyReviewed', 'consentReviewed', 'routingTest', 'domainVerified'].includes(key)) errors.push(`${path}.${key}: assurance claims belong in separate evidence records`);
   if (key !== 'evidenceReference' && key !== 'nextAction') rejectClaims(item, `${path}.${key}`);
  }
 };
 rejectClaims(record, 'publication');
 return errors;
}

export function assertPublication(record, expected) {
 const errors = publicationErrors(record, expected);
 if (errors.length) throw Error('Public release blocked: exact publication authorization is incomplete\n' + errors.join('\n'));
}

/** An audit of permission is never a claim that unresolved facts were verified. */
export function publicationAudit(record, expected) {
 assertPublication(record, expected);
 return {
  publicationAuthorized: true,
  approvedBy: record.approvedBy,
  reportedBy: record.reportedBy,
  approvedAt: record.approvedAt,
  evidenceReference: record.evidenceReference,
  canonicalOrigin: record.canonicalOrigin,
  renderSourceHash: record.renderSourceHash,
  pageCount: Object.keys(expected.pageHashes).length,
  supplementalAuthorization:record.supplementalRelease||null,
  measurementAuthorization:record.measurementRelease||null,
  imageCount: Object.keys(record.images).length,
  assuranceStatus: 'unverified',
  unresolvedAssurances: structuredClone(record.unresolvedAssurances)
 };
}
