import fs from 'node:fs';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.MGI_TEST_URL||'http://127.0.0.1:4324';
const out='evidence/elite-review/comment-refinement';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const errors=[],observations=[];
const assert=(ok,msg)=>{if(!ok)errors.push(msg)};
for(const width of [320,393,820,1100,1200,1451]){
 const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(async()=>{await document.fonts.ready;document.querySelectorAll('img').forEach(i=>i.loading='eager');});
 for(let y=0;y<await page.evaluate(()=>document.body.scrollHeight);y+=700){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(60)}await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(250);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow@'+width);
 assert(await page.locator('.origin').count()===0,'origin label present');assert(await page.locator('.image-disclaimer').count()===1,'footer disclaimer');
 assert(await page.locator('.eyebrow:visible').count()===0,'eyebrow visible');
 assert(await page.locator('.hero.home .rebate-cta').isVisible(),'hero rebate');assert(await page.locator('.header-right .phone-button').isVisible(),'phone button@'+width);assert(await page.locator('.header-right .schedule-button').isVisible(),'schedule button@'+width);
 assert(await page.locator('.service-buttons a').count()===8,'service buttons');assert(await page.locator('.service-buttons svg').count()===8,'service icons');
 assert(await page.locator('.review-card').count()===3,'real reviews');assert(await page.locator('.footer-grid nav[aria-label="Footer service areas"] a').count()===13,'12 town links');
 const photoDimensions=await page.locator('.section.dark .link-card .polaroid').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
 assert(photoDimensions.every(d=>Math.abs(d.w-photoDimensions[0].w)<1&&Math.abs(d.h-photoDimensions[0].h)<1),'unequal photo frames@'+width);
 const hero=await page.locator('.hero.home').boundingBox(),badge=await page.locator('.brand img').boundingBox(),masthead=await page.locator('.masthead').boundingBox();assert(masthead.height<=90,'header height@'+width);assert(badge.width>=120,'badge too small');
 assert(await page.locator('.process li').first().evaluate(e=>parseFloat(getComputedStyle(e,'::before').fontSize)>=64),'small process numbers');
 if(width<=1100){await page.locator('.mobile-menu summary').click();for(const name of ['Services','Service areas','Financing','Rebates','Emergency','Homeowner help','About'])assert(await page.locator('.mobile-menu a').filter({hasText:new RegExp('^'+name+'$')}).isVisible(),'missing menu '+name);await page.keyboard.press('Escape');assert(await page.locator('.mobile-menu').getAttribute('open')===null,'Escape');}
 if(width>1100){await page.locator('.header-help summary').click();for(const name of ['Homeowner help','About'])assert(await page.locator('.header-help a').filter({hasText:new RegExp('^'+name+'$')}).isVisible(),'missing More '+name+'@'+width);await page.keyboard.press('Escape');assert(await page.locator('.header-help').getAttribute('open')===null,'More Escape');}
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert(!axe.violations.length,'axe@'+width+': '+axe.violations.map(v=>v.id).join(','));
 observations.push({width,photoDimensions,badge,masthead,axe:axe.violations.length,hero});
 await page.screenshot({path:`${out}/home-${width}.png`,fullPage:true});await page.screenshot({path:`${out}/home-top-${width}.png`});await context.close();
}
await browser.close();fs.writeFileSync(`${out}/checks.json`,JSON.stringify({base,formChecked:false,errors,observations},null,2)+'\n');console.log(JSON.stringify({widths:observations.length,errors}));if(errors.length)process.exitCode=1;
