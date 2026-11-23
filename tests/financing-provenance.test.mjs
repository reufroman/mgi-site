import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationInputs} from '../scripts/publication-inputs.mjs';
import {financingReleaseMatches,financingReleaseProvenance,financingNov23Direction,financingNov23DirectionMatches,publicationErrors,publicationAudit,readPublication} from '../src/data/publication.mjs';

async function fixture(){
 const record=readPublication(),expected=await publicationInputs('https://mgiheatingandair.com');
 expected.renderSourceHash=record.holidaySpecialsRelease.renderSourceHash;
 expected.now='2026-11-23T20:00:00Z';
 return {record,expected};
}
test('separately documented historical Financing source matches the accepted Phase 1 functionality',async()=>{
 const {record,expected}=await fixture(),p=financingReleaseProvenance;
 assert.ok(Object.isFrozen(p));
 assert.equal(p.acceptanceEvidence,'gmail:1a1a798ee16385b8');
 assert.equal(p.pageId,'ST-007');
 assert.equal(financingReleaseMatches(p,record,expected,'ST-007',p.releasedHash,expected.now),true);
});
test('Financing provenance rejects changed evidence, source, prior records, scope, origin, or time',async()=>{
 const {record,expected}=await fixture(),p=financingReleaseProvenance,match=(v,r=record,e=expected,id='ST-007',source=p.releasedHash,now=expected.now)=>financingReleaseMatches(v,r,e,id,source,now);
 for(const k of Object.keys(p)){const changed={...p,[k]:p[k]+'x'};assert.equal(match(changed),false,k);}
 assert.equal(match({...p,extra:'value'}),false);
 assert.equal(match(p,record,expected,'ST-008'),false);
 assert.equal(match(p,record,expected,'ST-007','f'.repeat(64)),false);
 assert.equal(match(p,record,expected,'ST-007',p.releasedHash,'2026-11-03T23:00:00Z'),false);
 assert.equal(match(p,record,{...expected,canonicalOrigin:'https://example.com'}),false);
 const changed=structuredClone(record);changed.pages['ST-007'].contentHash='f'.repeat(64);assert.equal(match(p,changed),false);
 const missing=structuredClone(record);delete missing.measurementRelease.pages['ST-007'];assert.equal(match(p,missing),false);
 const untrusted=structuredClone(record);untrusted.approvedBy='Other';assert.equal(match(p,untrusted),false);
});
test('the exact Financing direction records Reu separately from Jesse and permits only its bound source',async()=>{
 const {record,expected}=await fixture(),d=financingNov23Direction;
 assert.ok(Object.isFrozen(d));
 assert.equal(d.clientLinkRequest,'gmail:1a2098a9db4b31af');
 assert.equal(d.directedBy,'Reu Smith, MGI fCMO');
 assert.equal(expected.pageHashes['ST-007'],d.pageHash);
 assert.equal(expected.financingComponentHash,d.componentHash);
 assert.equal(financingNov23DirectionMatches(d,record,expected,'ST-007',d.pageHash,expected.now),true);
 assert.ok(!publicationErrors(record,expected).some(e=>e.startsWith('publication.pages.ST-007.contentHash')));
 assert.deepEqual(publicationAudit(record,expected).financingDirection,d);
});
test('the separate Financing direction rejects altered scope, provenance, source, component, origin, prior record, or time',async()=>{
 const {record,expected}=await fixture(),d=financingNov23Direction;
 const match=(direction=d,r=record,e=expected,id='ST-007',source=d.pageHash,now=expected.now)=>financingNov23DirectionMatches(direction,r,e,id,source,now);
 for(const key of Object.keys(d))assert.equal(match({...d,[key]:d[key]+'x'}),false,key);
 assert.equal(match({...d,extra:'value'}),false);
 assert.equal(match(d,record,expected,'ST-008'),false);
 assert.equal(match(d,record,expected,'ST-007','f'.repeat(64)),false);
 assert.equal(match(d,record,{...expected,financingComponentHash:'f'.repeat(64)}),false);
 assert.equal(match(d,record,{...expected,financingComponentHash:undefined}),false);
 assert.equal(match(d,record,{...expected,canonicalOrigin:'https://example.com'}),false);
 assert.equal(match(d,record,expected,'ST-007',d.pageHash,'2026-11-22T23:00:00Z'),false);
 const changed=structuredClone(record);changed.pages['ST-007'].contentHash='f'.repeat(64);assert.equal(match(d,changed),false);
 const missing=structuredClone(record);delete missing.measurementRelease.pages['ST-007'];assert.equal(match(d,missing),false);
 const alteredInput={...expected,financingComponentHash:'f'.repeat(64)};
 assert.ok(publicationErrors(record,alteredInput).some(e=>e.startsWith('publication.pages.ST-007.contentHash')));
});
