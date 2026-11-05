// Four-page rendering only. No intake page is opened, submitted, or inspected.
import fs from 'node:fs';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {contentFor,allRoutes} from '../src/data/catalog.mjs';
const base=process.env.MGI_TEST_URL||'http://127.0.0.1:4328';
const out='evidence/audit-batch-1',errors=[],results=[];
const assert=(ok,message)=>{if(!ok)errors.push(message)};
const selected=allRoutes.filter(r=>['ST-059','ST-060','ST-063','ST-079'].includes(r.page_id));
const browser=await chromium.launch();
try{
 for(const width of [393,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  for(const route of selected){
   await page.goto(base+route.canonical_route,{waitUntil:'networkidle'});
   await page.locator('img').evaluateAll(async es=>{for(const e of es){e.loading='eager';await e.decode().catch(()=>{});}});
   assert(await page.locator('h1').count()===1,`${route.page_id} H1`);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route.page_id}@${width} overflow`);
   assert(await page.locator('#answer').count()===1,`${route.page_id} answer anchor`);
   if(['ST-059','ST-079'].includes(route.page_id))assert(await page.evaluate(()=>!!(document.querySelector('[data-safety]').compareDocumentPosition(document.querySelector('[data-primary-actions]'))&Node.DOCUMENT_POSITION_FOLLOWING)),`${route.page_id} safety order`);
   if(route.page_id==='ST-079')assert(await page.locator('.batch-one .hero .polaroid').count()===0,'Urgent hero decoration');
   for(const link of await page.locator('a[href^="/schedule-service/"]').evaluateAll(es=>es.map(e=>e.href)))assert(new URL(link).searchParams.get('service')===route.name,`${route.page_id} service context`);
   assert(!/over 300|4\.8|24\/7|same-day|short cycling|weak cooling/i.test(await page.locator('.batch-one').innerText()),`${route.page_id} stale/copied promise or FAQ`);
   const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
   assert(!audit.violations.length,`${route.page_id}@${width} axe: ${audit.violations.map(v=>v.id)}`);
   const name=route.canonical_route.split('/').filter(Boolean).at(-1);
   await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});
   await page.goto(base+route.canonical_route+'?town=Greeley');
   for(const link of await page.locator('a[href^="/schedule-service/"],a[href^="/financing/"]').evaluateAll(es=>es.map(e=>e.href))){const url=new URL(link);assert(url.searchParams.get('town')==='Greeley',`${route.page_id} town context`);}
   await page.goto(base+route.canonical_route+'?town=InvalidTown');
   assert(!(await page.locator('a[href^="/schedule-service/"]').evaluateAll(es=>es.map(e=>e.href))).some(s=>s.includes('InvalidTown')),`${route.page_id} invalid town`);
   results.push({id:route.page_id,width,axeViolations:audit.violations.length,screenshot:`${name}-${width}.png`});
  }
  await context.close();
 }
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:393,height:1000}});const page=await context.newPage();
 for(const route of selected){await page.goto(base+route.canonical_route);assert(await page.locator('h1').isVisible()&&await page.locator('.batch-heading').first().isVisible(),`${route.page_id} JS-off visibility`);const detail=page.locator('.faq details').first();await detail.locator('summary').click();assert(await detail.locator('p').isVisible(),`${route.page_id} native FAQ`);results.push({id:route.page_id,mode:'JavaScript off'});}
 await context.close();
 for(const route of selected){const effective=contentFor(route);assert(effective.batchOne&&effective.title===effective.batchOne.title,`${route.page_id} effective approval content`);}
}catch(error){errors.push(error.stack||String(error));}finally{await browser.close();fs.writeFileSync(`${out}/focused-results.json`,JSON.stringify({base,scope:'Four base pages only; intake/form excluded',errors,results},null,2)+'\n');console.log(JSON.stringify({groups:results.length,errors}));if(errors.length)process.exitCode=1;}
