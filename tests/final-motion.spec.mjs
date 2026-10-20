import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const routes=JSON.parse(fs.readFileSync('src/data/routes.json','utf8'));
const base='http://127.0.0.1:4328';
const out='evidence/final-readiness';
const browser=await chromium.launch();
const rows=[],errors=[];
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/api/**',r=>r.abort());
 while(cursor<routes.length){const route=routes[cursor++];await p.goto(base+route.canonical_route);await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>document.querySelector('main')?.dataset.motionPolicy);
 const row=await p.evaluate(()=>{const main=document.querySelector('main');const points=[...document.querySelectorAll('.hero .polaroid,[data-reading-motion]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none').map(e=>({y:Math.round(e.getBoundingClientRect().top+scrollY),type:e.dataset.readingMotion||'hero',tag:e.tagName,text:e.matches('h2,h3')?e.textContent.slice(0,100):null})).sort((a,b)=>a.y-b.y);const gaps=points.slice(1).map((point,i)=>({from:points[i].y,to:point.y,gap:point.y-points[i].y}));return {policy:main.dataset.motionPolicy,mainTop:Math.round(main.getBoundingClientRect().top+scrollY),mainBottom:Math.round(main.getBoundingClientRect().bottom+scrollY),height:document.documentElement.scrollHeight,points,gaps,overflow:document.documentElement.scrollWidth>innerWidth};});
 rows.push({pageId:route.page_id,route:route.canonical_route,...row});if(row.overflow)errors.push(route.page_id+': desktop overflow');}
 await context.close();
}));
const samples=['/','/services/ac-repair/','/service-area/windsor/','/answers/','/blog/','/blog/what-is-a-manual-j-calculation-and-why-is-it-important/','/schedule-service/'];
const behavioral=[];
for(const route of samples){const context=await browser.newContext({viewport:{width:1440,height:900}});const p=await context.newPage();await p.goto(base+route);await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>document.querySelector('main')?.dataset.motionPolicy);await p.evaluate(()=>{window.__shifts=[];new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__shifts.push(e.value)}).observe({type:'layout-shift',buffered:false})});
 const points=await p.locator('[data-reading-motion]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top+scrollY));
 let observed=0;for(const y of points){await p.evaluate(y=>scrollTo({top:Math.max(0,y-650),behavior:'instant'}),y);await p.waitForTimeout(90);observed+=await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);await p.waitForTimeout(650);}
 await p.evaluate(()=>scrollTo({top:1500,behavior:'instant'}));await p.waitForTimeout(100);const progress=await p.locator('.mgi-reading-progress').evaluateAll(es=>es.map(e=>getComputedStyle(e).transform));await p.screenshot({path:out+'/motion-'+(route==='/'?'home':route.split('/').filter(Boolean).at(-1))+'-desktop.png'});const shifts=await p.evaluate(()=>window.__shifts);assert.ok(shifts.reduce((a,b)=>a+b,0)<.01,route+' motion layout shifts');
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(80);assert.equal(await p.locator('[data-reading-motion],.mgi-reading-progress').count(),0);assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
 await p.emulateMedia({reducedMotion:'no-preference'});await p.setViewportSize({width:393,height:852});await p.waitForTimeout(300);assert.equal(await p.locator('[data-reading-motion],.mgi-reading-progress').count(),0);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 behavioral.push({route,observedAnimationSamples:observed,progress,layoutShiftTotal:shifts.reduce((a,b)=>a+b,0),reducedMotion:true,mobileDecorativeMotionDisabled:true});await context.close();}
const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:900}});const p=await nojs.newPage();for(const route of samples){await p.goto(base+route);assert.ok((await p.locator('main').innerText()).length>100);assert.equal(await p.locator('.mgi-reading-progress,.mgi-motion-mark').count(),0);}await nojs.close();
rows.sort((a,b)=>a.route.localeCompare(b.route));
const gaps=rows.filter(r=>r.policy==='section-cues').flatMap(r=>r.gaps.filter(g=>g.gap>1200).map(g=>({route:r.route,...g})));
const tails=rows.filter(r=>r.policy==='section-cues'&&r.points.length&&r.mainBottom-r.points.at(-1).y>1200).map(r=>({route:r.route,from:r.points.at(-1).y,to:r.mainBottom,gap:r.mainBottom-r.points.at(-1).y}));
fs.writeFileSync(out+'/motion-coverage.json',JSON.stringify({viewport:{width:1440,height:900},rows,behavioral,noJSRoutes:samples,largeGaps:gaps,longTails:tails,errors},null,2));
console.log(JSON.stringify({routes:rows.length,policies:rows.reduce((a,r)=>(a[r.policy]=(a[r.policy]||0)+1,a),{}),largeGaps:gaps,longTails:tails,behavioral,errors},null,2));await browser.close();assert.deepEqual(errors,[]);
