import {chromium} from '@playwright/test';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(process.env.MGI_NATIVE_CANDIDATE||'.local-preview/native-scheduler-candidate'),evidence='evidence/native-completion-2026-10-30';
const browser=await chromium.launch({headless:true});const results=[];
try{for(const scenario of ['granted','denied','gpc','referrer','withdrawal','content-granted','content-denied']){
 const context=await browser.newContext();await context.addInitScript(({scenario})=>{if(!localStorage.getItem('mgi-lp-call-measurement-v1'))localStorage.setItem('mgi-lp-call-measurement-v1',scenario==='denied'||scenario==='referrer'||scenario==='content-denied'?'denied':'granted');if(scenario==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{value:true});sessionStorage.setItem('st-dni-parameters',JSON.stringify({gclid:'TEST_STALE',email:'fixture-private@example.invalid'}));},{scenario});
 const page=await context.newPage(),errors=[],blocked=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.hostname!=='mgiheatingandair.com'){
  if(!/(^|\.)(googletagmanager.com|google-analytics.com|googleadservices.com|doubleclick.net|google.com|googlesyndication.com)$/.test(u.hostname))return r.continue();
  blocked.push(u.hostname);return r.fulfill({body:'',contentType:'application/javascript'});
 }if(u.pathname==='/api/measurement-region')return r.fulfill({json:{coloradoDefault:false}});
 if(u.pathname==='/referrer-fixture/')return r.fulfill({contentType:'text/html',body:'<a href="/schedule-service/?ws-widget=open&gclid=TEST_CURRENT">Open scheduler</a>'});
 const file=path.resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+'/'))return r.abort();try{return r.fulfill({body:await fs.readFile(file),contentType:({'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream'});}catch{return r.fulfill({status:404,body:'missing'});}});
 if(scenario==='referrer'){await page.goto('https://mgiheatingandair.com/referrer-fixture/?gclid=TEST_REFERRER');await page.getByRole('link',{name:'Open scheduler',exact:true}).click();}
 else if(scenario.startsWith('content-')){
  await page.goto('https://mgiheatingandair.com/answers/furnaces/?q=filter&utm_source=google&gclid=TEST_NATIVE_ARTIFACT#content');
  const original=page.url();await page.waitForLoadState('networkidle');assert.equal(page.url(),original);assert.equal(await page.locator('#se-widget-embed').count(),0);
  await page.getByRole('link',{name:'Schedule service',exact:true}).first().click();
 }else await page.goto('https://mgiheatingandair.com/schedule-service/?ws-widget=open&gclid=TEST_NATIVE_ARTIFACT&utm_source=google&fbclid=TEST_DISALLOWED');
 try {await page.waitForFunction(()=>window.dataLayer?.some(e=>e.event==='BookingStarted'));} catch(e) {await fs.writeFile(evidence+'/artifact-failure.json',JSON.stringify({scenario,errors,blocked,state:await page.evaluate(()=>({url:location.href,html:document.querySelector('#scheduler-help')?.outerHTML,frame:document.querySelector('#se-widget-iframe')?.src,scripts:[...document.scripts].map(s=>s.src),native:!!window._scheduler,events:window.dataLayer}))},null,2));throw e;}
 let before=await page.evaluate(()=>({url:location.href,referrer:document.referrer,frame:document.querySelector('#se-widget-iframe')?.src,events:window.dataLayer,session:sessionStorage.getItem('st-dni-parameters'),legacy:!!window.STWidgetManager,loaders:document.querySelectorAll('#se-widget-embed').length,cookie:document.cookie}));
 assert.equal(before.legacy,false);assert.equal(before.loaders,1);assert.equal(before.session,null);assert(!before.frame.includes('TEST_STALE'));assert(!before.frame.includes('fixture-private'));
 const client=new URL(new URL(before.frame).searchParams.get('client_url'));assert.equal(client.searchParams.has('gclid'),['granted','withdrawal','content-granted'].includes(scenario));assert(!client.searchParams.has('fbclid'));if(scenario==='referrer')assert.equal(before.referrer,'');
 let after;
 if(scenario==='withdrawal'){
  // Exercise actual banner choice UI after provider initialization.
  await page.locator('#se-widget-iframe').evaluate(el=>el); // Inspection only; close through native control.
  const f=page.frameLocator('#se-widget-iframe');await f.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Turn measurement off',exact:true}).click();
  await page.waitForFunction(()=>!new URL(location.href).searchParams.has('gclid')&&!!document.querySelector('#se-widget-iframe'));
  after=await page.evaluate(()=>({url:location.href,referrer:document.referrer,frame:document.querySelector('#se-widget-iframe')?.src,cookie:document.cookie}));
  assert(!after.frame.includes('TEST_NATIVE_ARTIFACT'));assert.equal(after.referrer,'');
 }
 assert.deepEqual(errors,[]);assert(!before.events.some(e=>e.event==='BookingBooked'));
 if(scenario==='granted')await page.frameLocator('#se-widget-iframe').getByRole('button',{name:'Close',exact:true}).waitFor({state:'visible'});
 if(scenario==='granted')await page.screenshot({path:evidence+'/native-artifact-granted.png'});
 results.push({scenario,before,after,errors,googleRequestsBlocked:blocked.length,submissions:0});await context.close();
}await fs.writeFile(evidence+'/artifact-browser.json',JSON.stringify({at:new Date().toISOString(),scope:'exact candidate served at host origin; real native provider; Google endpoints stubbed; no submissions',results},null,2));console.log('PASS '+results.map(x=>x.scenario).join(', '));}finally{await browser.close();}
