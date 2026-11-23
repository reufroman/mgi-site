// Offline-host activation fixture. Real published Google libraries may load;
// every measurement hit and every ServiceTitan endpoint is fulfilled locally.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(process.env.MGI_ACTIVATION_CANDIDATE||'.local-preview/native-activation-candidate');
const evidence=path.resolve('evidence/native-completion-2026-10-30');
const host='https://mgiheatingandair.com',fixtureOrigin='https://scheduler.servicetitan.com';
const container='GTM-5NWW55ZN',adsId='621269572',label='yOT8CKje04UZEMSkn6gC',appointment='900000001';
const transactionId=`mgi-sp-request-${appointment}`,reservation=`mgi-native-conversion-v1:AW-${adsId}/${label}:${appointment}`;
const scenarios=['granted','denied','gpc','synthetic-url','synthetic-cookie','known-test-receipt','direct-thank-you','malformed-cookie'];
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
const nativeScript=`(()=>{
 const listeners={};
 window._scheduler={addEventListener:(name,fn)=>{listeners[name]=fn;},show:async()=>{},hide:()=>{}};
 const frame=document.createElement('iframe');frame.id='se-widget-iframe';frame.title='Offline native booking fixture';
 frame.src='${fixtureOrigin}/__codex_offline_booking_fixture__/';
 frame.onload=()=>{setTimeout(()=>listeners.AppReady?.(),0);};document.body.appendChild(frame);
})();`;
const nativeFrame=`<!doctype html><meta charset="utf-8"><title>Offline native booking fixture</title><p>No provider request or service booking occurs.</p><script>
window.fixtureEmit=(action,value)=>parent.postMessage({type:'se-send-client-google-analytics',ga:{action,category:'Scheduling Pro - Booking',label:'Appointment id',schedulerName:'MGI-Website-12Oct',value}},'${host}');
</script>`;
function googleLibrary(request,url) {
 return request.method()==='GET'&&request.resourceType()==='script'
  && ((url.hostname==='www.googletagmanager.com'&&['/gtm.js','/gtag/js','/gtag/destination'].includes(url.pathname))
   ||(url.hostname==='www.googleadservices.com'&&url.pathname==='/pagead/conversion_async.js'))
  && !/TEST(?:$|[-_]|CODEX|MGI)/i.test(url.href);
}
function conversionMetadata(request,url) {
 const params=new URLSearchParams(url.search);
 // Some transports POST URL-encoded fields. Keep selected metadata only.
 if(request.method()==='POST')for(const [key,value]of new URLSearchParams(request.postData()||''))if(!params.has(key))params.set(key,value);
 const id=url.pathname.match(/\/(?:1p-conversion|conversion|viewthroughconversion)\/(\d+)\/?$/)?.[1]
  ||params.get('tid')?.match(/^AW-(\d+)$/)?.[1]||null;
 const metadata={hostname:url.hostname,path:url.pathname,id,label:params.get('label'),transactionId:params.get('oid')||params.get('transaction_id')||params.get('order_id'),value:params.get('value'),currency:params.get('currency_code')||params.get('currency'),method:request.method(),blocked:true,contactParameterKeys:[...params.keys()].filter(key=>/^(?:em|ph|fn|ln|ct|zp|email|phone|address|first_name|last_name|sha256_email_address|user_data(?:[._].*)?)$/i.test(key)).map(key=>({key,length:params.get(key)?.length||0,empty:!params.get(key),emptyGoogleMarker:key==='em'&&params.get(key)==='tv.1'}))};
 if(!metadata.transactionId){const nested=params.get('data')||'';metadata.transactionId=nested.match(/(?:^|[;&])(?:transaction_id|order_id)=([^;&]+)/)?.[1]||null;}
 return metadata;
}
async function state(page) {
 return page.evaluate(({reservation})=>({url:location.href,confirmed:(window.dataLayer||[]).filter(event=>event?.event==='mgi_booking_request_confirmed'),stored:localStorage.getItem(reservation),conversionKeys:Object.keys(localStorage).filter(key=>key.startsWith('mgi-native-conversion-v1:')),installed:window.__mgiNativeBookingMeasurement?.status||null,gtmReady:!!window.google_tag_manager?.['GTM-5NWW55ZN'],nativeFrames:document.querySelectorAll('#se-widget-iframe').length}),{reservation});
}
async function ready(page,{gtm=true}={}) {
 await page.locator('#se-widget-iframe').waitFor({state:'attached'});
 const frame=page.frameLocator('#se-widget-iframe');await frame.locator('body').waitFor();
 if(gtm)await page.waitForFunction(()=>!!window.google_tag_manager?.['GTM-5NWW55ZN'],null,{timeout:20000});
 return page.frames().find(frame=>frame.url().startsWith(fixtureOrigin+'/__codex_offline_booking_fixture__/'));
}
async function send(frame,action='BookingBooked',id=appointment) {await frame.evaluate(({action,id})=>window.fixtureEmit(action,id),{action,id});}
async function settle(page){await page.waitForTimeout(1200);}
await fs.access(root);await fs.mkdir(evidence,{recursive:true});
const results=[],log=[],browser=await chromium.launch({headless:true});let failure;
function note(message){log.push(message);console.log(message);}
try{
 for(const scenario of scenarios){
  const context=await browser.newContext({serviceWorkers:'block'});
  const records={scenario,libraries:[],conversionAttempts:[],blockedHosts:{},providerRequestsFulfilled:0,errors:[]};
  await context.addInitScript(({scenario})=>{
   if(location.hostname!=='mgiheatingandair.com')return;
   localStorage.setItem('mgi-lp-call-measurement-v1',scenario==='denied'?'denied':'granted');
   localStorage.setItem('mgi-optional-tracking',scenario==='denied'?'off':'on');
   if(scenario==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{value:true});
  },{scenario});
  if(scenario==='synthetic-cookie'||scenario==='malformed-cookie')await context.addCookies([{name:'mgi_click',value:scenario==='synthetic-cookie'?encodeURIComponent(JSON.stringify({gclid:'TEST_CODEX_ACTIVATION_FIXTURE'})):'%bad',domain:'mgiheatingandair.com',path:'/',secure:true,sameSite:'Lax'}]);
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===host){
    if(url.pathname==='/api/measurement-region')return route.fulfill({json:{coloradoDefault:false}});
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:'Fixture path blocked'});
    try{return route.fulfill({body:await fs.readFile(file),contentType:mime[path.extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:'Fixture file missing'});}
   }
   if(url.href==='https://embed.scheduler.servicetitan.com/scheduler-v1.js'){records.providerRequestsFulfilled++;return route.fulfill({contentType:'application/javascript',body:nativeScript});}
   if(url.origin===fixtureOrigin&&url.pathname==='/__codex_offline_booking_fixture__/'){records.providerRequestsFulfilled++;return route.fulfill({contentType:'text/html',body:nativeFrame});}
   if(googleLibrary(request,url)){
    if(url.pathname==='/gtm.js')assert.equal(url.searchParams.get('id'),container,'Unexpected GTM container');
    records.libraries.push({hostname:url.hostname,path:url.pathname,id:url.searchParams.get('id'),method:request.method()});
    return route.continue();
   }
   records.blockedHosts[url.hostname]=(records.blockedHosts[url.hostname]||0)+1;
   const metadata=conversionMetadata(request,url);if(metadata.id===adsId&&metadata.label===label)records.conversionAttempts.push(metadata);
   // Includes Google collection/pixels and every unapproved external endpoint.
   // Never continue a conversion, including either mirrored Google transport.
   const image=request.resourceType()==='image';return route.fulfill({status:200,contentType:image?'image/gif':'application/javascript',body:image?Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=','base64'):''});
  });
  const page=await context.newPage();page.on('pageerror',error=>records.errors.push(error.message));
  try{
   let url=scenario==='direct-thank-you'?host+'/booking-thank-you/?appointment_id='+appointment:host+'/schedule-service/?ws-widget=open';
   if(scenario==='synthetic-url')url+='&gclid=TEST_CODEX_ACTIVATION_FIXTURE';
   await page.goto(url,{waitUntil:'domcontentloaded'});
   if(scenario==='direct-thank-you'){
    await page.locator('h1').waitFor();await settle(page);records.initial=await state(page);
    assert.equal(records.initial.nativeFrames,0);assert.equal(records.initial.confirmed.length,0);assert.equal(records.initial.conversionKeys.length,0);assert.equal(records.conversionAttempts.length,0);
   }else{
    const denied=['denied','gpc'].includes(scenario);let frame=await ready(page,{gtm:!denied});
    await send(frame,'BookingProcessStarted');await send(frame,'BookingBooked',scenario==='known-test-receipt'?'76346705':appointment);
    if(scenario==='granted'){
     await page.waitForFunction(()=>window.dataLayer?.some(event=>event.event==='mgi_booking_request_confirmed'),null,{timeout:10000});
     await page.waitForTimeout(100);const deadline=Date.now()+20000;
     while(!records.conversionAttempts.some(hit=>hit.transactionId===transactionId)&&Date.now()<deadline)await page.waitForTimeout(100);
     await settle(page);records.initial=await state(page);
     assert.equal(records.initial.confirmed.length,1);assert.equal(records.initial.confirmed[0].transaction_id,transactionId);assert.equal(records.initial.stored,'attempted');
     assert(records.conversionAttempts.some(hit=>hit.transactionId===transactionId),'Published Ads tag did not produce intended blocked conversion with transaction ID');
     assert(records.conversionAttempts.every(hit=>hit.value!==appointment),'Appointment ID must not become revenue');
     assert(records.conversionAttempts.every(hit=>hit.contactParameterKeys.every(field=>field.empty||field.emptyGoogleMarker)),'Unexpected contact data parameter in blocked conversion request');
     assert(!JSON.stringify(records.initial.confirmed).match(/email|phone|address|customer_name/i),'Unexpected contact field in conversion signal');
     const baselineAttempts=records.conversionAttempts.length;
     await send(frame);await send(frame);await send(frame,'BookingProcessStarted');await send(frame);await settle(page);
     records.afterRepeatedCallbacks=await state(page);assert.equal(records.afterRepeatedCallbacks.confirmed.length,1);assert.equal(records.conversionAttempts.length,baselineAttempts);
     await page.reload({waitUntil:'domcontentloaded'});frame=await ready(page);await send(frame,'BookingProcessStarted');await send(frame);await settle(page);
     records.afterReload=await state(page);assert.equal(records.afterReload.confirmed.length,0);assert.equal(records.afterReload.stored,'attempted');assert.equal(records.conversionAttempts.length,baselineAttempts);
     await page.goto(host+'/booking-thank-you/',{waitUntil:'domcontentloaded'});await page.locator('h1').waitFor();await page.goBack({waitUntil:'domcontentloaded'});frame=await ready(page);await send(frame,'BookingProcessStarted');await send(frame);await settle(page);
     records.afterBack=await state(page);assert.equal(records.afterBack.confirmed.length,0);assert.equal(records.conversionAttempts.length,baselineAttempts);
    }else{
     await settle(page);records.initial=await state(page);assert.equal(records.initial.confirmed.length,0);assert.equal(records.initial.conversionKeys.length,0);assert.equal(records.conversionAttempts.length,0);
     if(denied)assert.equal(records.libraries.length,0,'Denied/GPC must load no Google measurement libraries');
    }
   }
   assert.deepEqual(records.errors,[]);records.status='PASS';note('PASS '+scenario);results.push(records);
  }catch(error){records.status='FAIL';records.failure=error.stack||String(error);try{records.failureState=await state(page);}catch{}results.push(records);throw error;}
  finally{await context.close();}
 }
}catch(error){failure=error;note('FAIL '+(error.stack||String(error)));}
finally{
 await browser.close();await fs.writeFile(evidence+'/activation-browser.json',JSON.stringify({at:new Date().toISOString(),candidate:root,scope:'Compiled candidate host; real published Google JavaScript GETs only; native scheduler and every conversion/measurement/provider request fulfilled locally; fixture messages, no booking or delivered conversion',realProviderRequests:0,conversionRequestsDelivered:0,results},null,2));
 await fs.writeFile(evidence+'/activation-browser.log',log.join('\n')+'\n');
}
if(failure)throw failure;
