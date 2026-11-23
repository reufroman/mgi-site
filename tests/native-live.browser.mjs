// Development integration probe: candidate host module, real vendor, no submission.
import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const evidence='evidence/native-completion-2026-10-30';
const module=await fs.readFile('src/data/paid-tracking-repair.mjs','utf8');
const browser=await chromium.launch({headless:true});
const results=[];
try { for (const scenario of ['denied','gpc','granted']) {
 const context=await browser.newContext();
 await context.addInitScript(({scenario})=>{
   localStorage.setItem('mgi-lp-call-measurement-v1',scenario==='denied'?'denied':'granted');
   sessionStorage.setItem('st-dni-parameters',JSON.stringify({gclid:'TEST_STALE_NOT_CONVERSION',email:'fixture-private@example.invalid'}));
   if(scenario==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{value:true});
 },{scenario});
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://mgiheatingandair.com/**',route=>{
   if(new URL(route.request().url()).pathname==='/native-probe.mjs')return route.fulfill({contentType:'application/javascript',body:module});
   return route.fulfill({contentType:'text/html',body:`<body><div id="scheduler-help" hidden>Call fallback</div><button id="open">Open scheduler</button><script type="module">import {installSchedulerTransport} from '/native-probe.mjs';const policy={ready:Promise.resolve(),state:{choice:'${scenario==='granted'?'granted':'denied'}'}};window.probe=installSchedulerTransport({window,document,policy,websiteUrl:'https://mgiheatingandair.com'});document.querySelector('#open').onclick=()=>probe.open();</script>`});
 });
 await page.goto('https://mgiheatingandair.com/schedule-service/?gclid=TEST_NATIVE_TRANSPORT_ONLY&utm_source=google&se_action=unsafe&fbclid=stale');
 const ready=await page.evaluate(()=>window.probe.ready);
 if(!ready)throw Error('Native not ready: '+scenario);
 await page.locator('#open').click();
 await page.waitForFunction(()=>window.dataLayer?.some(e=>e.event==='BookingStarted'),{timeout:15000});
 const state=await page.evaluate(()=>({url:location.href,session:sessionStorage.getItem('st-dni-parameters'),frame:document.querySelector('#se-widget-iframe')?.src,events:window.dataLayer,legacy:!!window.STWidgetManager,loaderCount:document.querySelectorAll('#se-widget-embed').length}));
 await page.screenshot({path:evidence+'/native-'+scenario+'.png'});
 if(state.legacy||state.loaderCount!==1||state.session!==null)throw Error('Loader/session failure');
 const frame=new URL(state.frame),client=new URL(frame.searchParams.get('client_url'));
 if(scenario!=='granted'&&client.searchParams.has('gclid'))throw Error('Denied click leak');
 if(state.frame.includes('fixture-private')||state.frame.includes('TEST_STALE')||client.searchParams.has('se_action')||client.searchParams.has('fbclid'))throw Error('Stale source leak');
 if(state.events.some(e=>e.event==='BookingBooked'))throw Error('Unexpected completion');
 results.push({scenario,scope:'local candidate host module with real native provider; no Google tags, no submission',ready,state,errors});
 await context.close();
 }await fs.writeFile(evidence+'/native-live.json',JSON.stringify({at:new Date().toISOString(),results},null,2));console.log(JSON.stringify(results));
} finally {await browser.close();}
