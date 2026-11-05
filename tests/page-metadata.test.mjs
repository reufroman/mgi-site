import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allRoutes,contentFor} from '../src/data/catalog.mjs';
import {pageMetadata} from '../src/data/page-metadata.mjs';

test('core metadata identifies the topic while leaving the accepted reading copy intact',()=>{
 for(const [id,subject] of [['ST-001','Heating and Cooling'],['ST-005','Services'],['ST-013','Guides']]){
  const route=allRoutes.find(r=>r.page_id===id),content=contentFor(route);
  const before=JSON.stringify(content),metadata=pageMetadata(route,content);
  assert.ok(metadata.title.includes(subject));assert.equal(metadata.description,content.summary);
  assert.equal(JSON.stringify(content),before);
 }
});
test('all governed pages have unique metadata descriptions and titles without changing content',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const route of allRoutes){
  const content=contentFor(route),before=JSON.stringify(content),metadata=pageMetadata(route,content);
  assert.ok(metadata.title&&metadata.description,route.page_id);
  assert.ok(!titles.has(metadata.title),`Duplicate title: ${route.page_id}`);
  assert.ok(!descriptions.has(metadata.description),`Duplicate description: ${route.page_id}`);
  assert.equal(JSON.stringify(content),before,`Mutated page body: ${route.page_id}`);
  titles.add(metadata.title);descriptions.add(metadata.description);
 }
 assert.equal(titles.size,allRoutes.length);assert.equal(descriptions.size,allRoutes.length);
});
test('shared emergency-opening descriptions preserve the specific question and safety priority',()=>{
 const ids=['MGI-066','MGI-067','MGI-072','MGI-075','MGI-077','MGI-079','MGI-082','MGI-093','MGI-098','MGI-099','MGI-100'];
 for(const id of ids){
  const route=allRoutes.find(r=>r.source_answer_id===id),content=contentFor(route);
  const metadata=pageMetadata(route,content);
  assert.ok(metadata.description.startsWith(content.title.trim()),id);
  assert.ok(metadata.description.includes('safety-first'),id);
  assert.ok(!metadata.description.endsWith('…'),id);
  assert.equal(metadata.title,content.title,id);
 }
});
