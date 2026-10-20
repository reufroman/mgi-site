import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.MGI_TEST_URL||'http://127.0.0.1:4323';
const browser=await chromium.launch();const results=[];
try{
 const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();
 for(const width of [320,393,820,1451]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/services/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('.service-category').count(),8);
  assert.equal(await page.locator('.service-category a').count(),29);
  assert.equal(new Set(await page.locator('.service-category a').evaluateAll(es=>es.map(e=>e.getAttribute('href')))).size,29);
  assert.equal(await page.locator('#answer .filter-controls,#answer .review-note').count(),0);
  assert(await page.evaluate(()=>document.querySelector('.repair-replace-panel').compareDocumentPosition(document.querySelector('.service-category-grid'))&Node.DOCUMENT_POSITION_FOLLOWING));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(await page.locator('.repair-replace-buttons a').evaluateAll(es=>es.map(e=>new URL(e.href).pathname)),['/blog/repair-or-replace-furnace/','/blog/repair-or-replace-air-conditioner/','/blog/repair-or-replace-water-heater/']);
  if([393,1451].includes(width)){
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[]);
   await page.locator('.repair-replace-panel').scrollIntoViewIfNeeded();await page.screenshot({path:`evidence/services-comments-${width}.png`});
  }
  results.push({width,categories:8,uniqueServiceLinks:29,overflow:false});
 }
 for(const [path,id] of [['/blog/repair-or-replace-furnace/','ST-055'],['/blog/repair-or-replace-air-conditioner/','ST-080'],['/blog/repair-or-replace-water-heater/','ST-081']]){
  const response=await page.goto(base+path);assert.equal(response.status(),200);assert.equal(await page.locator('body').getAttribute('data-page-id'),id);results.push({guide:path,id,status:200});
 }
 await context.close();
 for(const mode of ['normal','reduce','no-js']){
  const ctx=await browser.newContext({reducedMotion:mode==='reduce'?'reduce':'no-preference',javaScriptEnabled:mode!=='no-js',viewport:{width:1451,height:1000}});
  if(mode!=='no-js')await ctx.addInitScript(()=>{window.headerMotion=[];const original=Element.prototype.animate;Element.prototype.animate=function(keyframes,options){if(this.matches('.hero .polaroid'))window.headerMotion.push({keyframes,options});return original.call(this,keyframes,options)}});
  const p=await ctx.newPage();
  for(const route of ['/','/services/','/services/furnace/','/service-area/greeley/']){
   await p.goto(base+route,{waitUntil:'load'});await p.waitForTimeout(1500);
   const frames=await p.locator('.hero .polaroid').evaluateAll(es=>es.filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none').map(e=>({opacity:getComputedStyle(e).opacity,transform:getComputedStyle(e).transform,animations:e.getAnimations().length})));
   assert(frames.length>0);assert(frames.every(f=>f.opacity==='1'&&f.transform!=='none'&&f.animations===0));
   const calls=mode==='no-js'?[]:await p.evaluate(()=>window.headerMotion);assert.equal(calls.length,mode==='normal'?frames.length:0);
   if(mode==='normal')assert(calls.every(c=>c.options.duration===1200&&c.keyframes[0].translate!==c.keyframes[1].translate));
   results.push({mode,route,frames:frames.length,slideCalls:calls.length,visibleAfterLoad:true});
  }await ctx.close();
 }
 fs.writeFileSync('evidence/services-comments-browser.json',JSON.stringify({base,results,errors:[]},null,2)+'\n');console.log(JSON.stringify({checks:results.length,errors:0}));
}finally{await browser.close()}
