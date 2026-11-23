import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicationErrors} from '../src/data/publication.mjs';

const privacy={
 'ST-014':'2eb080c0b413863f8dc98099cd4f24e94dcc4ab9df3de3b2993667123b5907a3',
 'ST-017':'a487cf83a3ced41cdbabc11b6e000627ce30fe3bc8f0fba265886440fa2d5023'
};
const images={
 'IMG-006':'cc3433e096dc7e5deaccd98a3829b7053bd5840473504c83edb6c4ff08976ba9',
 'IMG-025':'0b046ae8409e3b65b48728532098447054877e71711ae8aab611c5a571471266',
 'IMG-033':'286ca6121e61addaf34a461495b4a3a20b0815138333cc058ebe500d504c745d',
 'TOWN-loveland-05':'59d5129ea0263953a11e3fc4af106b1bedf10c452877029930e45bead933822c',
 'TOWN-thornton-05':'9a64466392deaa08ec4430f4065955321b8006f5bd78452bd9e546c1efac4fbb',
 'TOWN-broomfield-05':'5a260ce5afc82089f1ee58d10d11acc8ca20732d9cdf4cca86aca082410dae02'
};
function fixture(){
 const record=JSON.parse(readFileSync('src/data/publication.json','utf8'));
 const expected={canonicalOrigin:'https://mgiheatingandair.com',renderSourceHash:record.holidaySpecialsRelease.renderSourceHash,now:'2026-11-23T20:00:00Z',
  pageHashes:{...Object.fromEntries(Object.entries(record.pages).map(([id,p])=>[id,p.contentHash])),...privacy},
  imageHashes:{...Object.fromEntries(Object.entries(record.images).map(([id,i])=>[id,i.sourceHash])),...images},
  site:{schedulerWidgetId:record.scheduler.widgetId,schedulerWebsiteUrl:'https://mgiheatingandair.com'}};
 return {record,expected};
}
test('only exact previously released privacy and image sources pass',()=>{
 const {record,expected}=fixture();assert.deepEqual(publicationErrors(record,expected),[]);
 for(const [field, entries] of [['pageHashes',privacy],['imageHashes',images]]){
  for(const id of Object.keys(entries)){
   const x=fixture();x.expected[field][id]='f'.repeat(64);
   assert.ok(publicationErrors(x.record,x.expected).some(e=>e.includes(id)),id+' changed');
   const y=fixture();delete y.record[field==='pageHashes'?'pages':'images'][id];
   assert.ok(publicationErrors(y.record,y.expected).some(e=>e.includes(id)),id+' original missing');
  }
 }
 const x=fixture();x.expected.pageHashes['ST-007']='3'.repeat(64);
 assert.ok(publicationErrors(x.record,x.expected).some(e=>e.includes('ST-007')));
 x.expected.imageHashes['IMG-not-released']='a'.repeat(64);
 assert.ok(publicationErrors(x.record,x.expected).some(e=>e.includes('IMG-not-released')));
});
test('privacy provenance requires its original measurement authorization',()=>{
 for(const tamper of [r=>delete r.measurementRelease.pages['ST-014'],r=>r.measurementRelease.authorizedBy='Other',r=>r.measurementRelease.scope='other',r=>r.measurementRelease.containerId='other',r=>r.measurementRelease.evidenceReference='',r=>r.measurementRelease.renderSourceHash='bad']){
  const {record,expected}=fixture();tamper(record);
  assert.ok(publicationErrors(record,expected).some(e=>e.includes('ST-014')));
 }
});
test('release dates, origin, and current whole-site fingerprint still gate',()=>{
 let x=fixture();x.expected.now='2026-10-18T12:00:00Z';
 assert.ok(publicationErrors(x.record,x.expected).some(e=>e.includes('ST-014')));
 x=fixture();x.expected.now='2026-11-02T12:00:00Z';
 assert.ok(publicationErrors(x.record,x.expected).some(e=>e.includes('IMG-006')));
 x=fixture();x.expected.renderSourceHash='f'.repeat(64);x.expected.canonicalOrigin='https://example.com';
 const errors=publicationErrors(x.record,x.expected);
 assert.ok(errors.some(e=>e.includes('current fingerprint')));assert.ok(errors.some(e=>e.includes('canonicalOrigin')));
});
