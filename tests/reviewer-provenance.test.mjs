import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {publicationInputs} from '../scripts/publication-inputs.mjs';
import {publicationErrors,readPublication} from '../src/data/publication.mjs';

const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const affected=['ST-059','ST-060','ST-061',...['WEL','GRE','LOV','BER','WIN','LON','BOU','ERI','FRE','FIR','THO','BRO','FCO','JOH','TIM','SEV','DAC'].flatMap(t=>['FUR-REP','FUR-RPL','AC-REP'].map(s=>`SL-${t}-${s}`))];
const message=(id)=>`publication.pages.${id}.contentHash`;
async function fixture(){const record=readPublication();const expected=await publicationInputs('https://mgiheatingandair.com');expected.renderSourceHash=record.holidaySpecialsRelease.renderSourceHash;expected.now='2026-11-23T20:00:00Z';return {record,expected};}
function findPortrait(o){if(!o||typeof o!=='object')return null;for(const [k,v] of Object.entries(o)){if(k==='reviewerImage'&&typeof v==='string'&&v.startsWith('/assets/reviewer-preserved-'))return [o,k];const x=findPortrait(v);if(x)return x;}return null;}
test('all 54 exact portrait substitutions map to their previously authorized content',async()=>{
 const {record,expected}=await fixture();const errors=publicationErrors(record,expected);
 assert.equal(affected.length,54);
 for(const id of affected)assert.ok(!errors.some(e=>e.startsWith(message(id))),id);
});
test('changed content, asset bytes, URL, source hash, and missing original remain blocked',async()=>{
 const {record,expected}=await fixture(), id='ST-061', content=expected.pageContents[id], [portrait,key]=findPortrait(content), old=portrait[key];
 content.title+=' changed';expected.pageHashes[id]=digest(content);
 assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message(id))));content.title=content.title.slice(0,-8);expected.pageHashes[id]=digest(content);
 expected.reviewerAssetHashes[old]='f'.repeat(64);assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message(id))));
 expected.reviewerAssetHashes[old]=createHash('sha256').update(await (await import('node:fs/promises')).readFile('public'+old)).digest('hex');
 portrait[key]=Object.keys(expected.reviewerAssetHashes).find(path=>path!==old);expected.pageHashes[id]=digest(content);assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message(id))));
 portrait[key]='/assets/reviewer-preserved-wrong.png';expected.pageHashes[id]=digest(content);assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message(id))));
 portrait[key]=old;expected.pageHashes[id]='f'.repeat(64);assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message(id))));
 expected.pageHashes[id]=digest(content);delete record.pages[id];assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message(id))));
});
test('unsupported pages, missing actual inputs, and future release date cannot use the exception',async()=>{
 const {record,expected}=await fixture(),id='ST-061';
 const content=expected.pageContents[id];expected.pageContents['ST-007']=content;expected.pageHashes['ST-007']=digest(content);
 assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message('ST-007'))));
 delete expected.pageContents[id];assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message(id))));
 expected.pageContents[id]=content;expected.now='2026-11-02T20:00:00Z';assert.ok(publicationErrors(record,expected).some(e=>e.startsWith(message(id))));
});
