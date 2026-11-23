// Non-submitting live smoke. Host bytes and native provider are real; all Google
// measurement/conversion requests are intercepted and fulfilled locally.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { api } from '../../Website-Astro-Tracking-Release-2026-10-27/scripts/cf.mjs';
const evidence=path.resolve('evidence/native-completion-2026-10-30');
const receipt=JSON.parse(await fs.readFile(evidence+'/activation-deployment.json','utf8'));
const expected='14f46649-813d-4f15-bdda-ae3063819351';
assert.equal(receipt.deployment,expected);assert.equal(receipt.configUnchanged,true);
const canonical=await api();assert.equal(canonical.canonical_deployment.id,expected,'Production drift before smoke');
const host='https://mgiheatingandair.com',container='GTM-5NWW55ZN',adsId='621269572',label='yOT8CKje04UZEMSkn6gC';
const results=[],log=[],browser=await chromium.launch({headless:true});let failure;
const library=request=>{const url=new URL(request.url());return request.method()==='GET'&&request.resourceType()==='script'&&((url.hostname==='www.googletagmanager.com'&&['/gtm.js','/gtag/js','/gtag/destination'].includes(url.pathname))||(url.hostname==='www.googleadservices.com'&&url.pathname==='/pagead/conversion_async.js'));};
function note(message){log.push(message);console.log(message);}
async function snapshot(page){return page.evaluate(()=>({url:location.href,installed:window.__mgiNativeBookingMeasurement?.status||null,started:(window.dataLayer||[]).filter(event=>event?.event==='BookingStarted').map(({event,event_category,schedulerName})=>({event,event_category,schedulerName})),confirmed:(window.dataLayer||[]).filter(event=>event?.event==='mgi_booking_request_confirmed').length,nativeLoaders:document.querySelectorAll('#se-widget-embed').length,legacyLoaders:[...document.scripts].filter(script=>script.src.includes('/webscheduler/shim.js')).length,gtmLoaders:[...document.scripts].filter(script=>script.src.includes('googletagmanager.com/gtm.js')).length,gtmRuntime:!!window.google_tag_manager?.['GTM-5NWW55ZN'],nativeFrames:document.querySelectorAll('#se-widget-iframe').length,conversionKeys:Object.keys(localStorage).filter(key=>key.startsWith('mgi-native-conversion-v1:')),effectiveGpc:navigator.globalPrivacyControl===true}));}
try{
 for(const scenario of ['granted','denied','gpc','direct-thank-you']){
  const record={scenario,libraries:[],blockedHosts:{},eligibleConversionAttempts:[],errors:[]};
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.addInitScript(({scenario})=>{
   if(location.hostname!=='mgiheatingandair.com')return;
   localStorage.setItem('mgi-lp-call-measurement-v1',scenario==='denied'?'denied':'granted');
   localStorage.setItem('mgi-optional-tracking',scenario==='denied'?'off':'on');
   if(scenario==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{value:true});
  },{scenario});
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===host)return route.continue(); // Actual production HTML/assets/API.
   if(library(request)){
    if(url.pathname==='/gtm.js')assert.equal(url.searchParams.get('id'),container);
    record.libraries.push({hostname:url.hostname,path:url.pathname,id:url.searchParams.get('id')});return route.continue();
   }
   if(/(^|\.)servicetitan\.com$/.test(url.hostname))return route.continue(); // Real native provider, no synthetic event or submission.
   record.blockedHosts[url.hostname]=(record.blockedHosts[url.hostname]||0)+1;
   const id=url.pathname.match(/\/(?:1p-conversion|conversion|viewthroughconversion)\/(\d+)\/?$/)?.[1]||url.searchParams.get('tid')?.match(/^AW-(\d+)$/)?.[1];
   if(id===adsId&&url.searchParams.get('label')===label)record.eligibleConversionAttempts.push({hostname:url.hostname,path:url.pathname,id,label,blocked:true});
   const image=request.resourceType()==='image';return route.fulfill({status:200,contentType:image?'image/gif':'application/javascript',body:image?Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=','base64'):''});
  });
  const page=await context.newPage();page.on('pageerror',error=>record.errors.push(error.message));
  try{
   const thankYou=scenario==='direct-thank-you';
   await page.goto(host+(thankYou?'/booking-thank-you/':'/schedule-service/?ws-widget=open'),{waitUntil:'domcontentloaded'});
   if(thankYou){await page.locator('h1').waitFor();await page.waitForTimeout(1500);}
   else await page.waitForFunction(()=>window.dataLayer?.some(event=>event.event==='BookingStarted'),null,{timeout:35000});
   if(['granted','direct-thank-you'].includes(scenario))await page.waitForFunction(()=>!!window.google_tag_manager?.['GTM-5NWW55ZN'],null,{timeout:20000});
   record.state=await snapshot(page);
   assert.equal(record.state.confirmed,0);assert.equal(record.state.conversionKeys.length,0);assert.equal(record.eligibleConversionAttempts.length,0);assert.equal(record.state.legacyLoaders,0);
   if(thankYou){assert.equal(record.state.installed,null);assert.equal(record.state.nativeLoaders,0);assert.equal(record.state.nativeFrames,0);assert.equal(record.state.started.length,0);}
   else{assert.equal(record.state.installed,'installed');assert.equal(record.state.nativeLoaders,1);assert.equal(record.state.nativeFrames,1);assert(record.state.started.length>=1);}
   const allowed=['granted','direct-thank-you'].includes(scenario);assert.equal(record.state.gtmLoaders,allowed?1:0);assert.equal(record.state.gtmRuntime,allowed);
   if(!allowed)assert.equal(record.libraries.length,0);
   assert.deepEqual(record.errors,[]);record.status='PASS';results.push(record);note('PASS '+scenario);
  }catch(error){record.status='FAIL';record.failure=error.stack||String(error);try{record.state=await snapshot(page);}catch{}results.push(record);throw error;}
  finally{await context.close();}
 }
 const after=await api();assert.equal(after.canonical_deployment.id,expected,'Production drift during smoke');
}catch(error){failure=error;note('FAIL '+(error.stack||String(error)));}
finally{
 await browser.close();await fs.writeFile(evidence+'/activation-production-smoke.json',JSON.stringify({at:new Date().toISOString(),deployment:expected,scope:'Actual production host bytes and real native provider, fresh contexts, no interaction beyond automatic opening, no completion-event injection, no booking submission; all Google measurement and conversion hits blocked',conversionRequestsDelivered:0,bookingSubmissions:0,results,priorFixtureDiagnostic:{source:'Earlier activation fixture tool outputs, not a retained exact failed artifact',finding:'A strict presence-only contact-field assertion flagged em on both blocked Google transports.',resolution:'Final fixture recorded em length4 and exact equality to literal tv.1, with no email/hash payload. Refined assertion then passed all eight scenarios.'}},null,2));
 await fs.writeFile(evidence+'/activation-production-smoke.log',log.join('\n')+'\n');
}
if(failure)throw failure;
