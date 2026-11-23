import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(process.env.MGI_FLOW_CANDIDATE||'.local-preview/completed-flow-candidate'),evidence='evidence/completed-flow-2026-10-30';const browser=await chromium.launch({headless:true});const results=[];
try{for(const scenario of ['granted','denied','gpc']){
 const c=await browser.newContext();await c.addInitScript(({scenario})=>{localStorage.setItem('mgi-lp-call-measurement-v1',scenario==='denied'?'denied':'granted');if(scenario==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{value:true});},{scenario});
 const p=await c.newPage();const errors=[],blocked=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='mgiheatingandair.com'){blocked.push(u.hostname);return r.fulfill({body:'',contentType:'application/javascript'});}if(u.pathname==='/api/measurement-region')return r.fulfill({json:{coloradoDefault:false}});const n=path.resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));if(!n.startsWith(root+'/'))return r.abort();try{const b=await fs.readFile(n);return r.fulfill({body:b,contentType:({'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'})[path.extname(n)]||'application/octet-stream'});}catch{return r.fulfill({status:404,body:'missing fixture'});}});
 await p.goto('https://mgiheatingandair.com/schedule-service/?gclid=TEST_CODEX_CONTINUITY_ONLY&utm_source=google&utm_medium=cpc');
 await p.waitForFunction(()=>Boolean(window.STWidgetManager));
 if(process.env.MGI_FLOW_CANDIDATE)assert.equal(await p.locator('script[src*="googletagmanager.com/gtm.js"]').count(),scenario==='granted'?1:0);
 const start=(await c.cookies()).find(x=>x.name==='mgi_click');
 if(scenario==='granted')assert.match(decodeURIComponent(start?.value||''),/TEST_CODEX_CONTINUITY_ONLY/);else assert.equal(start,undefined);
 // Stand-in for the documented clean success navigation. No provider is contacted.
 await p.goto('https://mgiheatingandair.com/booking-thank-you/');
 await p.locator('h1').waitFor({state:'visible'});
 const end=(await c.cookies()).find(x=>x.name==='mgi_click');
 assert.equal(end?.value,start?.value);assert.equal(await p.evaluate(()=>(window.dataLayer||[]).some(e=>/confirmed|conversion|BookingBooked/.test(String(e.event||e[0]||'')))),false);
 assert.deepEqual(errors,[]);results.push({scenario,directCapture:scenario==='granted'?'present':'absent',cleanDestinationRetainsSameCookie:true,conversionEvents:0,realProviderRequests:0,runtimeErrors:errors});await c.close();
}await fs.writeFile(evidence+'/browser-continuity.json',JSON.stringify({scope:'compiled production modules; all network fulfilled locally; clean redirect simulated, not a provider booking',results},null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
