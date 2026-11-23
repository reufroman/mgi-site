import test from 'node:test';
import assert from 'node:assert/strict';
import { attributionFrom, attributionCookie, schedulerDestination, createReceiptReporter, installSchedulerTransport, NATIVE_SCHEDULER_ID, NATIVE_SCHEDULER_API_KEY } from '../src/data/paid-tracking-repair.mjs';
const oldCookie='mgi_click='+encodeURIComponent(JSON.stringify({gclid:'old-click',utm_source:'google',utm_medium:'cpc'}));
test('scheduler preserves current click/source and service context, without identity fields',()=>{
 const out=schedulerDestination({pageUrl:'https://mgiheatingandair.com/?gclid=TEST-MGI-FORM-20261026&utm_source=google&utm_medium=cpc&email=private',link:'/schedule-service/?service=Furnace&town=Windsor',cookie:oldCookie,measurementAllowed:true});
 assert.equal(out.searchParams.get('gclid'),'TEST-MGI-FORM-20261026');assert.equal(out.searchParams.get('town'),'Windsor');assert.equal(out.searchParams.get('utm_medium'),'cpc');assert.equal(out.searchParams.has('email'),false);assert.equal(out.searchParams.get('ws-widget'),'open');
});
test('returning visit restores allowed click cookie, but a new touch never inherits stale click IDs',()=>{
 assert.equal(schedulerDestination({pageUrl:'https://mgiheatingandair.com/contact/',cookie:oldCookie,measurementAllowed:true}).searchParams.get('gclid'),'old-click');
 const fresh=schedulerDestination({pageUrl:'https://mgiheatingandair.com/?utm_source=facebook&utm_medium=social',cookie:oldCookie,measurementAllowed:true});assert.equal(fresh.searchParams.has('gclid'),false);assert.equal(fresh.searchParams.get('utm_source'),'facebook');
});
test('decline/unset strips attribution from scheduler links and never reads it into destination',()=>{
 const out=schedulerDestination({pageUrl:'https://mgiheatingandair.com/?gclid=secret-click',link:'/schedule-service/?gclid=stale&service=AC',cookie:oldCookie});assert.equal(out.searchParams.has('gclid'),false);assert.equal(out.searchParams.get('service'),'AC');
});
test('external destinations, other paths, malformed cookies, oversized and control-character input fail safely',()=>{
 for(const link of ['https://evil.invalid/schedule-service/','/contact/'])assert.throws(()=>schedulerDestination({pageUrl:'https://mgiheatingandair.com/',link}));
 assert.equal(schedulerDestination({pageUrl:'https://mgiheatingandair.com/',cookie:'mgi_click=%bad',measurementAllowed:true}).searchParams.has('gclid'),false);assert.deepEqual(attributionFrom('?gclid='+('x'.repeat(201))+'&utm_source=%00&email=x'),{});
});
function fixture(options={}){const values=new Map(),events=[];const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};return{values,events,storage,report:createReceiptReporter({mode:'fixture',hostname:'127.0.0.1',consent:()=>true,storage,emit:event=>events.push(event),...options})};}
const receipt={id:'TEST-MGI-FORM-20261026',kind:'form',confirmed:true,test:true};
test('confirmed fixture form and booking each emit once, without customer data',()=>{const f=fixture();assert.equal(f.report({...receipt,email:'never-send'}),true);assert.equal(f.report(receipt),false);assert.equal(f.report({...receipt,id:'TEST-MGI-BOOKING-20261026',kind:'booking'}),true);assert.equal(f.events.length,2);assert.equal(JSON.stringify(f.events).includes('never-send'),false);});
test('reload deduplication and missing consent prevent replay, including after consent is later granted',()=>{const f=fixture();f.report(receipt);const second=fixture({storage:f.storage});assert.equal(second.report(receipt),false);assert.equal(fixture({consent:()=>false}).report(receipt),false);});
test('unconfirmed, unlabeled, live-host, disabled, and phone-tap receipts cannot become conversions',()=>{
 for(const r of [{...receipt,confirmed:false},{...receipt,test:false},{...receipt,id:'real-customer'},{...receipt,kind:'phone_tap'}])assert.equal(fixture().report(r),false);
 for(const settings of [{hostname:'mgiheatingandair.com'},{mode:'production'},{mode:'disabled'}])assert.equal(fixture(settings).report(receipt),false);
});
test('storage failure fails closed and delivery failure can be retried',()=>{assert.equal(fixture({storage:{getItem(){throw Error('blocked')}}}).report(receipt),false);let fail=true;const f=fixture({emit:()=>{if(fail)throw Error('transport')}});assert.equal(f.report(receipt),false);fail=false;assert.equal(f.report(receipt),true);});
function schedulerEnv({href='https://mgiheatingandair.com/schedule-service/?gclid=TEST-MGI-CLICK&utm_source=google',choice='granted',cookie='',ready=Promise.resolve(),autoReady=true,referrer='',gpc=false}={}) {
 const snapshots=[],scripts=[],navigations=[],commands=[],help={hidden:true},values=new Map([['st-dni-parameters',JSON.stringify({gclid:'stale',email:'private'})]]);
 const location=new URL(href); location.assign=u=>navigations.push({href:String(u),kind:'assign'});
 const listeners={window:{},document:{}},nativeListeners={};
 const window={location,navigator:{globalPrivacyControl:gpc},sessionStorage:{getItem:k=>values.get(k),removeItem:k=>values.delete(k)},history:{state:null,replaceState:(s,t,url)=>{location.href=url;}},addEventListener:(type,fn)=>{listeners.window[type]=fn;}};
 function loadNative(script) {
  window._scheduler={addEventListener:(type,fn)=>{nativeListeners[type]=fn;},show:async options=>{commands.push(options);}};
  script.onload();
  if(autoReady)queueMicrotask(()=>nativeListeners.AppReady?.());
 }
 const document={cookie,referrer,body:{appendChild(){}},head:{appendChild:script=>{
  scripts.push(script);snapshots.push({src:script.src,url:location.href,dni:values.get('st-dni-parameters'),cookie:document.cookie});
  queueMicrotask(()=>loadNative(script));
 }},createElement:type=>({setAttribute(k,v){this[k]=v;},click(){navigations.push({href:this.href,kind:type,referrerPolicy:this.referrerPolicy,rel:this.rel});},remove(){}}),getElementById:id=>id==='scheduler-help'?help:null,addEventListener:(type,fn)=>{listeners.document[type]=fn;}};
 const policy={ready,state:{choice}};
 return{window,document,policy,snapshots,scripts,navigations,commands,help,values,nativeListeners,listeners};
}
const setup=(env,options={})=>installSchedulerTransport({...env,websiteUrl:'https://mgiheatingandair.com',...options});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('native init waits for policy and removes denied click data and stale DNI before loading',async()=>{
 let resolve;const env=schedulerEnv({choice:'denied',ready:new Promise(r=>resolve=r)});const scheduler=setup(env);
 assert.equal(env.snapshots.length,0);resolve();assert.equal(await scheduler.ready,true);
 assert.equal(env.snapshots.length,1);assert.equal(new URL(env.snapshots[0].url).searchParams.has('gclid'),false);
 assert.equal(env.snapshots[0].dni,undefined);assert.equal(await scheduler.open(),true);
 assert.deepEqual(env.commands,[{schedulerId:NATIVE_SCHEDULER_ID}]);
 assert.equal(env.scripts[0]['data-api-key'],NATIVE_SCHEDULER_API_KEY);
 assert.equal(env.scripts[0]['data-schedulerid'],NATIVE_SCHEDULER_ID);
 assert.equal(env.scripts[0].src,'https://embed.scheduler.servicetitan.com/scheduler-v1.js');
});
test('script load alone cannot open native scheduler before AppReady',async()=>{
 const env=schedulerEnv({autoReady:false});const scheduler=setup(env);let resolved=false;scheduler.ready.then(()=>{resolved=true;});
 await tick();assert.equal(env.scripts.length,1);assert.equal(resolved,false);assert.equal(env.commands.length,0);
 const opened=scheduler.open();await tick();assert.equal(env.commands.length,0);
 env.nativeListeners.AppReady();assert.equal(await opened,true);assert.equal(await scheduler.ready,true);assert.equal(env.commands.length,1);
});
test('native AppReady timeout exposes call fallback and late AppReady cannot reopen',async()=>{
 const env=schedulerEnv({autoReady:false});const scheduler=setup(env,{timeoutMs:5});
 assert.equal(await scheduler.ready,false);assert.equal(env.help.hidden,false);
 env.nativeListeners.AppReady();assert.equal(await scheduler.open(),false);assert.equal(env.commands.length,0);
});
test('one transport installs one native loader and refuses a preexisting legacy loader',async()=>{
 const env=schedulerEnv();const first=setup(env),second=setup(env);assert.equal(first,second);await first.ready;assert.equal(env.scripts.length,1);
 const legacy=schedulerEnv();legacy.window.STWidgetManager=()=>{};assert.equal(await setup(legacy).ready,false);assert.equal(legacy.scripts.length,0);assert.equal(legacy.help.hidden,false);
});
test('native sees permitted cookie attribution on the dedicated scheduler before initialization',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/',cookie:oldCookie});await setup(env).ready;assert.equal(new URL(env.snapshots[0].url).searchParams.get('gclid'),'old-click');
});
test('local/review/other hosts never load a provider or navigate into production',async()=>{
 for(const href of ['http://127.0.0.1:4346/?gclid=TEST-MGI-CLICK','https://mgi-review.invalid/','https://mgiheatingandair.com.evil.test/']){const env=schedulerEnv({href});const scheduler=setup(env);assert.equal(await scheduler.open('/schedule-service/?gclid=TEST-MGI-CLICK'),false);assert.equal(env.snapshots.length,0);assert.equal(env.navigations.length,0);assert.equal(env.help.hidden,false);}
});
test('ws-widget flag auto-opens after AppReady and script error exposes call fallback',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/?ws-widget=open'});await setup(env).ready;assert.deepEqual(env.commands,[{schedulerId:NATIVE_SCHEDULER_ID}]);
 const broken=schedulerEnv({autoReady:false});const scheduler=setup(broken);await tick();broken.scripts[0].onerror();assert.equal(await scheduler.ready,false);assert.equal(await scheduler.open(),false);assert.equal(broken.help.hidden,false);assert.equal(broken.commands.length,0);
});
test('contextual service links reach fresh hosting URL and schedule buttons retain context',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/'});const scheduler=setup(env);await scheduler.open('/schedule-service/?service=Furnace&town=Windsor&topic=Furnace');
 assert.equal(env.navigations.length,1);assert.equal(new URL(env.navigations[0].href).searchParams.get('town'),'Windsor');assert.equal(env.commands.length,0);await scheduler.ready;
 const scheduled=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/?service=Furnace&town=Windsor&topic=Furnace'});await setup(scheduled).open();assert.equal(scheduled.navigations.length,0);assert.deepEqual(scheduled.commands,[{schedulerId:NATIVE_SCHEDULER_ID}]);
});
test('same-tab consent changes require a fresh no-referrer document before native reuse',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/',choice:'denied',cookie:oldCookie});const scheduler=setup(env);await scheduler.ready;
 env.policy.refresh=()=>{env.policy.state.choice='granted';};assert.equal(await scheduler.open(),false);
 assert.equal(new URL(env.navigations[0].href).searchParams.get('gclid'),'old-click');assert.equal(env.navigations[0].referrerPolicy,'no-referrer');assert.equal(env.commands.length,0);
});
test('withdrawal through UI refresh discards cached native source and strips current click',async()=>{
 const env=schedulerEnv();const scheduler=setup(env);await scheduler.ready;env.policy.state.choice='denied';env.listeners.document.click();await tick();
 assert.equal(env.navigations.length,1);assert.equal(env.navigations[0].referrerPolicy,'no-referrer');assert.equal(new URL(env.navigations[0].href).searchParams.has('gclid'),false);
 assert.equal(await scheduler.open(),false);assert.equal(env.commands.length,0);
});
test('query and hash referrers cause no-referrer navigation before any native load',async()=>{
 for(const referrer of ['https://mgiheatingandair.com/?gclid=OLD','https://example.test/#private']){
  const env=schedulerEnv({referrer});assert.equal(await setup(env).ready,false);assert.equal(env.scripts.length,0);assert.equal(env.navigations.length,1);assert.equal(env.navigations[0].referrerPolicy,'no-referrer');
 }
});
test('denied and GPC native initialization strips unsupported and optional URL inputs',async()=>{
 for(const options of [{choice:'denied'},{choice:'unset'},{choice:'granted',gpc:true}]){
  const env=schedulerEnv({...options,href:'https://mgiheatingandair.com/schedule-service/?gclid=SECRET&fbclid=FB&clid=CL&se_action=ENCODED&se_custom_field_1=PRIVATE&email=PRIVATE&service=Furnace#private'});
  await setup(env).ready;const url=new URL(env.snapshots[0].url);assert.deepEqual([...url.searchParams.keys()],['service']);assert.equal(url.hash,'');assert.equal(env.snapshots[0].dni,undefined);assert.equal(env.document.cookie,'');
 }
});
test('direct permitted scheduler click is saved before native init and survives a clean thank-you URL',async()=>{
 const env=schedulerEnv();await setup(env).ready;assert.equal(attributionCookie(env.snapshots[0].cookie).gclid,'TEST-MGI-CLICK');assert.equal(attributionCookie(env.document.cookie).utm_source,'google');assert.equal(new URL('https://mgiheatingandair.com/booking-thank-you/').search,'');assert.equal(attributionCookie(env.document.cookie).gclid,'TEST-MGI-CLICK');assert.match(env.document.cookie,/Path=\/; SameSite=Lax; Secure/);
});
test('new organic touch replaces stale click attribution before native handoff',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/?utm_source=newsletter',cookie:oldCookie});await setup(env).ready;assert.deepEqual(attributionCookie(env.document.cookie),{utm_source:'newsletter'});
});
test('blocked attribution cookie storage does not break native scheduling',async()=>{
 const env=schedulerEnv();Object.defineProperty(env.document,'cookie',{get(){return '';},set(){throw Error('blocked');}});assert.equal(await setup(env).open(),true);assert.deepEqual(env.commands,[{schedulerId:NATIVE_SCHEDULER_ID}]);
});
test('inaccessible stale DNI storage fails closed before native init',async()=>{
 const env=schedulerEnv();env.window.sessionStorage.removeItem=()=>{throw Error('blocked');};assert.equal(await setup(env).ready,false);assert.equal(env.scripts.length,0);assert.equal(env.help.hidden,false);
});
test('opening during pending policy cannot erase an incoming click before resolution',async()=>{
 let resolve;const env=schedulerEnv({choice:'unset',ready:new Promise(r=>resolve=r)});const scheduler=setup(env);const opened=scheduler.open();await tick();
 assert.equal(env.window.location.searchParams.get('gclid'),'TEST-MGI-CLICK');assert.equal(env.snapshots.length,0);
 env.policy.state.choice='granted';resolve();assert.equal(await opened,true);assert.equal(attributionCookie(env.document.cookie).gclid,'TEST-MGI-CLICK');
});
test('native readiness and opening do not infer or emit a booking completion',async()=>{
 const env=schedulerEnv();env.window.dataLayer=[];await setup(env).open();assert.deepEqual(env.window.dataLayer,[]);assert.deepEqual(Object.keys(env.nativeListeners),['AppReady']);
});
test('a later linked attribution touch cannot reuse the native iframe initialized without it',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/'});const scheduler=setup(env);await scheduler.ready;
 assert.equal(await scheduler.open('/schedule-service/?gclid=FRESH&utm_source=google'),true);
 assert.equal(env.navigations.length,1);assert.equal(new URL(env.navigations[0].href).searchParams.get('gclid'),'FRESH');assert.equal(env.commands.length,0);
});
test('auto-open vendor rejection exposes fallback instead of rejecting readiness',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/?ws-widget=open',autoReady:false});const scheduler=setup(env);await tick();
 env.window._scheduler.show=async()=>{throw Error('provider unavailable');};env.nativeListeners.AppReady();
 assert.equal(await scheduler.ready,false);assert.equal(env.help.hidden,false);assert.equal(await scheduler.open(),false);
});
test('consent withdrawal during native startup prevents delayed automatic opening',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/?ws-widget=open&gclid=START',autoReady:false});const scheduler=setup(env);await tick();
 env.policy.state.choice='denied';env.nativeListeners.AppReady();assert.equal(await scheduler.ready,false);
 assert.equal(env.commands.length,0);assert.equal(env.navigations.length,1);assert.equal(env.navigations[0].referrerPolicy,'no-referrer');assert.equal(new URL(env.navigations[0].href).searchParams.has('gclid'),false);
});
test('referrer recovery anchor bypasses scheduler interception without preventing browser navigation',async()=>{
 const env=schedulerEnv({referrer:'https://mgiheatingandair.com/?gclid=OLD'});let generated,intercepted=false;
 const create=env.document.createElement;
 env.document.createElement=type=>{
  if(type!=='a')return create(type);
  const callbacks={};generated={setAttribute(){},addEventListener:(name,fn)=>{callbacks[name]=fn;},remove(){},click(){
   const event={propagationStopped:false,defaultPrevented:false,stopPropagation(){this.propagationStopped=true;},preventDefault(){this.defaultPrevented=true;}};
   callbacks.click?.(event);
   // Model the existing document-level scheduler-link interceptor.
   if(!event.propagationStopped){intercepted=true;event.preventDefault();}
   generated.event=event;
   if(!event.defaultPrevented)env.navigations.push({href:this.href,referrerPolicy:this.referrerPolicy});
  }};return generated;
 };
 assert.equal(await setup(env).ready,false);assert.equal(intercepted,false);assert.equal(generated.event.propagationStopped,true);assert.equal(generated.event.defaultPrevented,false);
 assert.equal(env.navigations.length,1);assert.equal(env.navigations[0].referrerPolicy,'no-referrer');assert.equal(env.scripts.length,0);
});

test('content-page installation and consent refresh leave search, hash, cookies, and DNI untouched',async()=>{
 const href='https://mgiheatingandair.com/answers/heating/?q=furnace&gclid=PAGE#results';
 const env=schedulerEnv({href,cookie:oldCookie,referrer:'https://mgiheatingandair.com/?gclid=REF'});const originalDni=env.values.get('st-dni-parameters');
 const scheduler=setup(env);assert.equal(await scheduler.ready,false);assert.equal(env.scripts.length,0);assert.equal(env.navigations.length,0);
 env.policy.state.choice='denied';env.listeners.document.click();env.listeners.window.focus();env.listeners.window.storage();await tick();
 assert.equal(env.window.location.href,href);assert.equal(env.values.get('st-dni-parameters'),originalDni);assert.equal(env.document.cookie,oldCookie);assert.equal(env.help.hidden,true);assert.equal(env.navigations.length,0);
});
for(const options of [{name:'permitted',choice:'granted',expectedClick:'PAGE'},{name:'denied',choice:'denied',expectedClick:null},{name:'GPC',choice:'granted',gpc:true,expectedClick:null}]){
 test(`${options.name} content-page booking transition uses a safe no-referrer destination without mutating content state`,async()=>{
  const href='https://mgiheatingandair.com/answers/heating/?q=furnace&gclid=PAGE&utm_source=google&email=PRIVATE#results';
  const env=schedulerEnv({...options,href,cookie:oldCookie});const originalDni=env.values.get('st-dni-parameters');const scheduler=setup(env);await scheduler.ready;
  assert.equal(await scheduler.open('/schedule-service/?service=Furnace&town=Windsor&email=PRIVATE&se_action=PRIVATE#private'),false);
  assert.equal(env.scripts.length,0);assert.equal(env.commands.length,0);assert.equal(env.navigations.length,1);
  const destination=new URL(env.navigations[0].href);assert.equal(destination.pathname,'/schedule-service/');assert.equal(destination.searchParams.get('service'),'Furnace');assert.equal(destination.searchParams.get('town'),'Windsor');assert.equal(destination.searchParams.get('ws-widget'),'open');assert.equal(destination.searchParams.get('gclid'),options.expectedClick);
  assert.equal(destination.searchParams.get('utm_source'),options.expectedClick?'google':null);assert.equal(destination.hash,'');
  for(const key of ['q','email','se_action'])assert.equal(destination.searchParams.has(key),false);
  assert.equal(env.navigations[0].referrerPolicy,'no-referrer');assert.equal(env.window.location.href,href);assert.equal(env.values.get('st-dni-parameters'),originalDni);assert.equal(env.document.cookie,oldCookie);assert.equal(env.help.hidden,true);
 });
}
test('content-page transition waits for policy before choosing permitted attribution',async()=>{
 let resolve;const env=schedulerEnv({href:'https://mgiheatingandair.com/answers/?q=furnace&gclid=WAIT#results',choice:'unset',ready:new Promise(r=>resolve=r)});const scheduler=setup(env);const opening=scheduler.open();await tick();assert.equal(env.navigations.length,0);assert.equal(env.scripts.length,0);
 env.policy.state.choice='granted';resolve();assert.equal(await opening,false);assert.equal(new URL(env.navigations[0].href).searchParams.get('gclid'),'WAIT');assert.equal(env.window.location.hash,'#results');assert.equal(env.window.location.searchParams.get('q'),'furnace');
});
