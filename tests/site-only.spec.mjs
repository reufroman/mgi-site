// Reu excludes scheduling form checks. Never open or inspect the intake pages here.
import fs from 'node:fs';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.MGI_TEST_URL||'https://mgi.localnerds.co';
const routes=JSON.parse(fs.readFileSync('src/data/routes.json','utf8'));
const excluded=new Set(['ST-003','ST-004','ST-018']);
const errors=[],results=[];const assert=(ok,message)=>{if(!ok)errors.push(message)};
const browser=await chromium.launch();
try{
 const context=await browser.newContext();
 const selected=routes.filter(r=>!excluded.has(r.page_id));let next=0;
 await Promise.all(Array.from({length:8},async()=>{while(next<selected.length){const r=selected[next++];const response=await context.request.get(base+r.canonical_route);const body=await response.text();assert(response.status()===200&&body.includes(`data-page-id="${r.page_id}"`),'Route failure '+r.page_id);}}));
 results.push({check:'non-intake-http-identities',routes:selected.length,excluded:[...excluded]});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 for(const width of [393,820,1440]){
  await page.setViewportSize({width,height:1000});
  for(const id of ['ST-001','ST-059','ST-060','ST-028','SL-BER-FUR-REP','ST-054','ST-052','ST-007','ST-008']){
   const r=routes.find(r=>r.page_id===id);await page.goto(base+r.canonical_route,{waitUntil:'networkidle'});
   assert(await page.locator('body').getAttribute('data-page-id')===id,'Wrong identity '+id);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+id+'@'+width);
   if(width!==820&&['ST-001','ST-059','ST-054','ST-052','ST-007','ST-008'].includes(id)){
    const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert(!audit.violations.length,'Axe '+id+'@'+width+': '+audit.violations.map(v=>v.id).join(','));
   }
   for(const href of await page.locator('a[href^="tel:"]').evaluateAll(es=>es.map(e=>e.getAttribute('href'))))assert(href==='tel:+19702871673','Invalid business dial URI '+id+'@'+width);
   results.push({check:'rendered-site',id,width});
  }
 }
 await page.setViewportSize({width:820,height:1000});await page.goto(base+'/');await page.locator('.mobile-menu summary').click();
 for(const name of ['Services','Service areas','Homeowner help','About'])assert(await page.locator('.mobile-menu nav a').filter({hasText:new RegExp('^'+name+'$')}).isVisible(),'Missing menu '+name);
 await page.keyboard.press('Escape');assert(await page.locator('.mobile-menu').getAttribute('open')===null,'Menu Escape failed');
 await page.goto(base+'/service-area/greeley/');await page.locator('a[href="/local-hvac/greeley-furnace-repair/"]').click();
 assert(new URL(page.url()).pathname==='/local-hvac/greeley-furnace-repair/','Area service context missing');
 for(const link of await page.locator('a[href^="/schedule-service/"]').evaluateAll(es=>es.map(e=>e.href))){const p=new URL(link).searchParams;assert(p.get('town')==='Greeley'&&p.get('service')==='Furnace Repair','Service handoff URL loses context');}
 results.push({check:'site-handoff-links-only',formOpened:false});
 for(const r of routes.filter(r=>r.family==='Article'&&!r.source_answer_id)){await page.goto(base+r.canonical_route);const sourceLinks=await page.locator('.blog-sources ul a, .source-list ul a').evaluateAll(es=>es.map(e=>({label:e.textContent?.trim(),href:e.getAttribute('href')})));assert(sourceLinks.length>0&&sourceLinks.every(s=>s.label&&s.href?.startsWith('https://'))&&new Set(sourceLinks.map(s=>s.href)).size===sourceLinks.length,'Source links '+r.page_id);}
 results.push({check:'article-source-labels',count:routes.filter(r=>r.family==='Article'&&!r.source_answer_id).length});await context.close();
}catch(error){errors.push(error.stack||String(error))}finally{await browser.close();const report={base,scope:'Site only. ServiceTitan iframe and all intake/form checks excluded by Reu.',errors,results};const evidenceDir=process.env.MGI_TEST_EVIDENCE_DIR||'evidence/elite-review';fs.mkdirSync(evidenceDir,{recursive:true});fs.writeFileSync(evidenceDir+'/live-site-only.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({groups:results.length,errors:errors.length}));if(errors.length){console.error(errors);process.exitCode=1;}}
