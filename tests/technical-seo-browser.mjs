import fs from 'node:fs';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const folder='evidence/technical-seo-2026-10-09/visual';fs.mkdirSync(folder,{recursive:true});
const browser=await chromium.launch();const context=await browser.newContext();const page=await context.newPage();const errors=[],checks=[];
page.on('pageerror',error=>errors.push(String(error)));
const paths=['/','/services/furnace-repair/','/services/windsor-ac-repair/','/service-area/','/rebates/','/answers/furnaces/','/answers/why-does-my-furnace-smell-like-gas/'];
const routes=JSON.parse(fs.readFileSync('src/data/routes.json'));
paths[2]=routes.find(r=>r.page_id==='SL-WIN-AC-REP').canonical_route;paths[6]=routes.find(r=>r.source_answer_id==='MGI-001').canonical_route;
for(const width of [393,1440]){await page.setViewportSize({width,height:1000});for(const [index,path] of paths.entries()){
 const response=await page.goto('http://127.0.0.1:4328'+path,{waitUntil:'networkidle'});if(response.status()!==200)errors.push(path+': HTTP '+response.status());
 await page.locator('footer').scrollIntoViewIfNeeded();await page.waitForTimeout(120);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1300);
 const measures=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc)}));if(measures.overflow||measures.broken.length)errors.push(path+': '+JSON.stringify(measures));
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();if(axe.violations.length)errors.push(path+': axe '+axe.violations.map(v=>v.id));
 await page.screenshot({path:`${folder}/${width}-${index}-opening.png`});if(path==='/rebates/'){await page.getByRole('link',{name:'Use the rebate planning checklist'}).scrollIntoViewIfNeeded();await page.screenshot({path:`${folder}/${width}-rebate-link.png`});}
 if(index===6){const link=page.locator('.article-library>a');if(await link.getAttribute('href')!=='/answers/furnaces/')errors.push('Furnace category link mismatch');if(await link.isVisible()){await link.scrollIntoViewIfNeeded();await page.screenshot({path:`${folder}/${width}-answer-link.png`});}}
 checks.push({path,width,...measures,axeViolations:axe.violations.length});
}}
await browser.close();fs.writeFileSync(folder+'/results.json',JSON.stringify({checks,errors,scope:'14 desktop/phone render and automated accessibility samples, excluding customer intake.'},null,2));console.log(JSON.stringify({checks:checks.length,errors}));if(errors.length)process.exitCode=1;
