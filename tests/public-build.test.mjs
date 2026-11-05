import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {robotsDirective,sitemapXml} from '../src/data/seo-policy.mjs';
import {readPublication,assertPublication} from '../src/data/publication.mjs';
import {publicationInputs} from '../scripts/publication-inputs.mjs';
test('public source permission exactly matches current content and images',async()=>{
 assertPublication(readPublication(),await publicationInputs('https://mgiheatingandair.com'));
});
test('mode selection keeps public permission distinct from strict assurance release',()=>{
 for(const [mode,count,review] of [['public',749,false],['review',749,true],['release',0,false]]){
 const run=spawnSync(process.execPath,['--input-type=module','-e',"import {pages,review} from './src/data/catalog.mjs'; console.log(JSON.stringify({count:pages.length,review}));"],{encoding:'utf8',env:{...process.env,MGI_BUILD_MODE:mode}});
 assert.equal(run.status,0,run.stderr);assert.deepEqual(JSON.parse(run.stdout),{count,review});
 }
});
test('public nonindex exceptions remain excluded from sitemap',()=>{
 const routes=JSON.parse(readFileSync(new URL('../src/data/routes.json',import.meta.url)));
 const map=sitemapXml(routes,'https://mgiheatingandair.com',false);
 assert.equal((map.match(/<loc>/g)||[]).length,738);
 for(const id of ['ST-018','ST-019']){const route=routes.find(r=>r.page_id===id);assert.equal(robotsDirective(route,false),'noindex, follow');assert.ok(!map.includes('https://mgiheatingandair.com'+route.canonical_route));}
 assert.ok(map.includes('https://mgiheatingandair.com/about/faqs/'));
 assert.equal((sitemapXml(routes,'https://mgi-review.invalid',true).match(/<loc>/g)||[]).length,0);
});
test('utility public information contains no legal-authoring instructions',()=>{
 const data=JSON.parse(readFileSync(new URL('../src/data/editorial.json',import.meta.url)));
 for(const id of ['ST-014','ST-015','ST-016','ST-017','MIGRATION-FAQ']){const c=data[id];const visible=JSON.stringify([c.title,c.summary,c.sections]);assert.doesNotMatch(visible,/draft|final policy|before publication|must be reviewed|verified contact route|\u2014/i);}
});
