import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKING_ACTION, BOOKING_SCHEDULER, nativeAppointmentReceipt, createNativeBookingReporter, installNativeBookingObserver, installNativeBookingMeasurement, isKnownTestTouch } from '../src/data/native-booking-completion.mjs';

// Exact natural completion shape observed for provider appointment 76346705.
// This is an offline payload fixture, never a click or provider request.
const natural = { event: 'BookingBooked', event_category: 'Scheduling Pro - Booking', event_label: 'Appointment id', schedulerName: BOOKING_SCHEDULER, value: '76346705', uniqueEventId: 'fixture-natural-event', sid: 'fixture-session' };
function memoryStorage() {
 const values=new Map();
 return { values, getItem:key=>values.has(key)?values.get(key):null, setItem:(key,value)=>values.set(key,String(value)) };
}
function harness(options={}) {
 const storage=options.storage||memoryStorage(),emitted=[];
 const report=createNativeBookingReporter({enabled:true,consent:()=>true,storage,emit:event=>emitted.push(event),...options});
 return {storage,emitted,report};
}
const key=id=>`mgi-native-conversion-v1:${BOOKING_ACTION}:${id}`;

test('exact natural provider payload yields a request receipt with string appointment ID',()=>{
 assert.deepEqual(nativeAppointmentReceipt(natural),{provider:'servicetitan-scheduling-pro',kind:'request',id:'76346705'});
});
test('receipt parsing requires the exact completion action, category, scheduler, and appointment label',()=>{
 for(const event of [null,{}, {...natural,event:'BookingStarted'}, {...natural,event:'mgi_booking_request_confirmed'}, {...natural,event_category:'Booking'}, {...natural,schedulerName:'another-scheduler'}, {...natural,event_label:'Price'}])assert.equal(nativeAppointmentReceipt(event),null);
});
test('appointment IDs are canonical positive decimal strings, never numeric amounts or unsafe input',()=>{
 for(const value of [76346705,0,null,undefined,'','0','01','-1','1.5','1e5',' 76346705','76346705 ','abc','1'.repeat(21),'<script>'])assert.equal(nativeAppointmentReceipt({...natural,value}),null);
 assert.equal(nativeAppointmentReceipt({...natural,value:'9'.repeat(20)}).id,'9'.repeat(20));
});
test('report emits only allowlisted non-PII receipt fields and never treats appointment ID as money',()=>{
 const h=harness();assert.deepEqual(h.report({...natural,email:'private@example.test',phone:'PRIVATE',address:'PRIVATE',customer:{name:'PRIVATE'}}),{sent:true,transactionId:'mgi-sp-request-76346705'});
 assert.deepEqual(h.emitted,[{event:'mgi_booking_request_confirmed',mgi_appointment_id:'76346705',transaction_id:'mgi-sp-request-76346705',mgi_conversion_action:BOOKING_ACTION,mgi_provider:'servicetitan-scheduling-pro'}]);
 assert.equal('value' in h.emitted[0],false);assert.equal('currency' in h.emitted[0],false);assert.equal(JSON.stringify(h.emitted).includes('PRIVATE'),false);
});
test('same-document duplicate natural deliveries emit exactly once',()=>{
 const h=harness();assert.equal(h.report(natural).sent,true);assert.equal(h.report({...natural,uniqueEventId:'another-event'}).reason,'duplicate');assert.equal(h.emitted.length,1);assert.equal(h.storage.getItem(key(natural.value)),'attempted');
});
test('reload or independent reporter sharing storage cannot replay an attempted appointment',()=>{
 const first=harness();first.report(natural);const reload=harness({storage:first.storage});assert.equal(reload.report(natural).reason,'duplicate');assert.equal(reload.emitted.length,0);
});
test('durable reservation occurs before emit and blocks reentrant delivery',()=>{
 const storage=memoryStorage();let report,reentrant,calls=0;
 report=createNativeBookingReporter({enabled:true,consent:()=>true,storage,emit:()=>{calls++;assert.equal(storage.getItem(key(natural.value)),'attempted');reentrant=report(natural);}});
 assert.equal(report(natural).sent,true);assert.equal(reentrant.reason,'duplicate');assert.equal(calls,1);
});
test('distinct appointment IDs remain separate conversion transactions',()=>{
 const h=harness();const first=h.report(natural),second=h.report({...natural,value:'76346706'});assert.equal(first.sent,true);assert.equal(second.sent,true);assert.notEqual(first.transactionId,second.transactionId);assert.equal(h.emitted.length,2);
});
test('missing storage, storage-read failure, and storage-write failure prevent dispatch',()=>{
 for(const storage of [undefined,{}, {getItem(){throw Error('blocked');}}, {getItem:()=>null,setItem(){throw Error('blocked');}}]){
  const emitted=[];const report=createNativeBookingReporter({enabled:true,consent:()=>true,storage,emit:event=>emitted.push(event)});assert.equal(report(natural).reason,'storage-unavailable');assert.equal(emitted.length,0);
 }
});
test('failed durable reservation readback prevents dispatch',()=>{
 const h=harness({storage:{getItem:()=>null,setItem(){}}});assert.equal(h.report(natural).reason,'storage-unavailable');assert.equal(h.emitted.length,0);
});
test('uncertain emit attempt is never retried in this document or after reload',()=>{
 const storage=memoryStorage();let calls=0;
 const report=createNativeBookingReporter({enabled:true,consent:()=>true,storage,emit:()=>{calls++;throw Error('callback threw after possible delivery');}});
 assert.equal(report(natural).reason,'delivery-uncertain');assert.equal(report(natural).reason,'duplicate');assert.equal(calls,1);
 const reload=harness({storage});assert.equal(reload.report(natural).reason,'duplicate');assert.equal(reload.emitted.length,0);
});
test('disabled and explicitly excluded tests do not reserve or emit',()=>{
 for(const settings of [{enabled:false},{test:true}]){const h=harness(settings);assert.equal(h.report(natural).reason,'ineligible');assert.equal(h.storage.values.size,0);assert.equal(h.emitted.length,0);}
 const h=harness();assert.equal(h.report({event:'page_view',page_location:'/booking-thank-you/'}).reason,'ineligible');assert.equal(h.report({url:'/booking-thank-you/',confirmed:true,id:'76346705'}).reason,'ineligible');assert.equal(h.emitted.length,0);
});
test('consent callback must explicitly allow, and denied completions cannot replay after later consent in the same document',()=>{
 for(const initial of [false,undefined,'granted',1]){
  let consent=initial;const h=harness({consent:()=>consent});assert.equal(h.report(natural).reason,'consent-denied');consent=true;assert.equal(h.report(natural).reason,'originally-denied');assert.equal(h.emitted.length,0);
 }
});
test('GPC denial supplied by policy callback prevents completion and later policy replay',()=>{
 let gpc=true;const h=harness({consent:()=>!gpc});assert.equal(h.report(natural).reason,'consent-denied');gpc=false;assert.equal(h.report(natural).reason,'originally-denied');assert.equal(h.emitted.length,0);
});
test('throwing consent lookup fails closed and cannot replay after lookup recovery',()=>{
 let unavailable=true;const h=harness({consent:()=>{if(unavailable)throw Error('policy unavailable');return true;}});assert.equal(h.report(natural).reason,'consent-denied');unavailable=false;assert.equal(h.report(natural).reason,'originally-denied');assert.equal(h.emitted.length,0);
});
function observerHarness(options={}) {
 const listeners=new Map(),reports=[],frameWindow={},frame={contentWindow:frameWindow};
 const window={dataLayer:options.backlog||[],addEventListener:(name,listener)=>listeners.set(name,listener),removeEventListener:(name,listener)=>{if(listeners.get(name)===listener)listeners.delete(name);}};
 let currentFrame=frame;const document={getElementById:id=>id==='se-widget-iframe'?currentFrame:null};
 const dispose=installNativeBookingObserver({window,document,consent:()=>true,report:event=>reports.push(event),...options});
 const message={origin:'https://scheduler.servicetitan.com',source:frameWindow,data:{type:'se-send-client-google-analytics',ga:{action:'BookingBooked',category:'Scheduling Pro - Booking',label:'Appointment id',schedulerName:BOOKING_SCHEDULER,value:'76346705',email:'PRIVATE'}}};
 const started={...message,data:{...message.data,ga:{...message.data.ga,action:'BookingProcessStarted'}}};
 return{listeners,reports,dispose,message,started,setFrame:value=>{currentFrame=value;}};
}
test('observer requires a fresh trusted permitted interaction before mapping a completion',()=>{
 const h=observerHarness();const listener=h.listeners.get('message');listener(h.message);assert.equal(h.reports.length,0);
 listener(h.started);listener(h.message);assert.deepEqual(h.reports,[{event:'BookingBooked',event_category:'Scheduling Pro - Booking',event_label:'Appointment id',schedulerName:BOOKING_SCHEDULER,value:'76346705'}]);assert.equal(JSON.stringify(h.reports).includes('PRIVATE'),false);
});
test('observer rejects wrong origins, sibling-frame sources, wrong types, and missing payload',()=>{
 const h=observerHarness();const listener=h.listeners.get('message');listener(h.started);
 for(const message of [{...h.message,origin:'http://scheduler.servicetitan.com'},{...h.message,origin:'https://scheduler.servicetitan.com.attacker.test'},{...h.message,origin:'https://mgiheatingandair.com'},{...h.message,source:{}},{...h.message,data:{type:'se-event',ga:h.message.data.ga}},{...h.message,data:{type:'se-send-client-google-analytics'}},{...h.message,data:null}])listener(message);
 h.setFrame(null);listener(h.message);assert.equal(h.reports.length,0);
});
test('untrusted or wrong-scheduler ProcessStarted cannot arm completion',()=>{
 for(const mutate of [message=>({...message,origin:'https://attacker.test'}),message=>({...message,source:{}}),message=>({...message,data:{...message.data,type:'se-event'}}),message=>({...message,data:{...message.data,ga:{...message.data.ga,schedulerName:'another-scheduler'}}}),message=>({...message,data:{...message.data,ga:{...message.data.ga,action:'BookingStarted'}}})]){
  const h=observerHarness();const listener=h.listeners.get('message');listener(mutate(h.started));listener(h.message);assert.equal(h.reports.length,0);
 }
});
test('fresh observer suppresses Booked-only restoration and never reads a historical dataLayer backlog',()=>{
 const h=observerHarness({backlog:[{...natural,event:'BookingProcessStarted'},natural]});assert.equal(h.reports.length,0);h.listeners.get('message')(h.message);assert.equal(h.reports.length,0);
});
function integratedObserver(consent) {
 const storage=memoryStorage(),emitted=[],outcomes=[];let reads=0,writes=0;
 const trackedStorage={getItem:key=>{reads++;return storage.getItem(key);},setItem:(key,value)=>{writes++;storage.setItem(key,value);}};
 const report=createNativeBookingReporter({enabled:true,consent,storage:trackedStorage,emit:event=>emitted.push(event)});
 const h=observerHarness({consent,report:event=>outcomes.push(report(event))});
 return {...h,storage,emitted,outcomes,counts:()=>({reads,writes})};
}
test('denied receipt reaches the real reporter without storage or emission, and cannot replay after fresh permitted participation',()=>{
 let allowed=false;const h=integratedObserver(()=>allowed);const listener=h.listeners.get('message');listener(h.started);listener(h.message);
 assert.deepEqual(h.outcomes,[{sent:false,reason:'consent-denied'}]);assert.deepEqual(h.counts(),{reads:0,writes:0});assert.equal(h.emitted.length,0);assert.equal(h.storage.values.size,0);
 allowed=true;listener(h.message);assert.equal(h.outcomes.length,1);listener(h.started);listener(h.message);
 assert.equal(h.outcomes.at(-1).reason,'originally-denied');assert.equal(h.emitted.length,0);assert.equal(h.storage.values.size,0);
 const later={...h.message,data:{...h.message.data,ga:{...h.message.data.ga,value:'76346706'}}};listener(h.started);listener(later);
 assert.equal(h.outcomes.at(-1).sent,true);assert.equal(h.emitted.length,1);assert.equal(h.emitted[0].mgi_appointment_id,'76346706');
});
test('denial observed after arming clears participation and permanently refuses that receipt within this document',()=>{
 let allowed=true;const h=integratedObserver(()=>allowed);const listener=h.listeners.get('message');listener(h.started);
 allowed=false;listener(h.message);assert.equal(h.outcomes.at(-1).reason,'consent-denied');allowed=true;listener(h.message);assert.equal(h.outcomes.length,1);assert.equal(h.emitted.length,0);
 listener(h.started);listener(h.message);assert.equal(h.outcomes.at(-1).reason,'originally-denied');assert.equal(h.emitted.length,0);assert.deepEqual(h.counts(),{reads:0,writes:0});
});
test('missing, throwing, or non-boolean observer consent fails closed through the real reporter',()=>{
 for(const consent of [undefined,()=>{throw Error('unavailable');},()=>undefined,()=>1,()=> 'granted']){
  const h=integratedObserver(consent);h.listeners.get('message')(h.started);h.listeners.get('message')(h.message);
  assert.deepEqual(h.outcomes,[{sent:false,reason:'consent-denied'}]);assert.equal(h.emitted.length,0);assert.deepEqual(h.counts(),{reads:0,writes:0});
 }
});
test('untrusted denied completion cannot poison the refusal set for a later trusted receipt',()=>{
 let allowed=false;const h=integratedObserver(()=>allowed);const listener=h.listeners.get('message');listener({...h.message,origin:'https://attacker.test'});assert.equal(h.outcomes.length,0);
 allowed=true;listener(h.started);listener(h.message);assert.equal(h.outcomes.at(-1).sent,true);assert.equal(h.emitted.length,1);
});
test('iframe replacement invalidates previous participation until the new iframe supplies ProcessStarted',()=>{
 const h=observerHarness();const listener=h.listeners.get('message');listener(h.started);const replacement={contentWindow:{}};h.setFrame(replacement);
 listener(h.message);listener({...h.message,source:replacement.contentWindow});assert.equal(h.reports.length,0);
 listener({...h.started,source:replacement.contentWindow});listener({...h.message,source:replacement.contentWindow});assert.equal(h.reports.length,1);
});
test('new document observer does not inherit participation from an earlier completed or refused document',()=>{
 const earlier=observerHarness();earlier.listeners.get('message')(earlier.started);earlier.listeners.get('message')(earlier.message);assert.equal(earlier.reports.length,1);earlier.dispose();
 const later=observerHarness();later.listeners.get('message')(later.message);assert.equal(later.reports.length,0);
});
test('observer disposal removes the exact registered message listener',()=>{
 const h=observerHarness();assert.equal(h.listeners.has('message'),true);h.dispose();assert.equal(h.listeners.has('message'),false);
});
test('denied receipt handling writes and reads no durable measurement storage',()=>{
 let reads=0,writes=0;const storage={getItem(){reads++;return null;},setItem(){writes++;}};
 const h=harness({storage,consent:()=>false});assert.equal(h.report(natural).reason,'consent-denied');assert.equal(reads,0);assert.equal(writes,0);assert.equal(h.emitted.length,0);
});

function installerHarness({href='https://mgiheatingandair.com/schedule-service/',choice='granted',gpc=false,cookie='',runtime=true,enabled=true}={}) {
 const location=new URL(href),listeners=new Map(),store=memoryStorage(),counts={cookieReads:0,storageReads:0,storageWrites:0,refreshes:0,listenerAdds:0};
 const frameWindow={},frame={contentWindow:frameWindow};
 const window={location,navigator:{globalPrivacyControl:gpc},dataLayer:[],google_tag_manager:runtime?{'GTM-5NWW55ZN':{}}:{},localStorage:{getItem:key=>{counts.storageReads++;return store.getItem(key);},setItem:(key,value)=>{counts.storageWrites++;store.setItem(key,value);}},addEventListener:(name,listener)=>{counts.listenerAdds++;listeners.set(name,listener);},removeEventListener:(name,listener)=>{if(listeners.get(name)===listener)listeners.delete(name);}};
 const document={get cookie(){counts.cookieReads++;return cookie;},getElementById:id=>id==='se-widget-iframe'?frame:null};
 const policy={state:{choice},refresh(){counts.refreshes++;}};
 const controller=installNativeBookingMeasurement({window,document,policy,enabled});
 function send(action='BookingBooked',id='76346706') {
  listeners.get('message')?.({origin:'https://scheduler.servicetitan.com',source:frameWindow,data:{type:'se-send-client-google-analytics',ga:{action,category:'Scheduling Pro - Booking',label:'Appointment id',schedulerName:BOOKING_SCHEDULER,value:id}}});
 }
 return{window,document,policy,controller,listeners,store,counts,send};
}
test('measurement installer defaults disabled and only enables the exact HTTPS production scheduler host/path',()=>{
 for(const settings of [{enabled:false},{href:'http://mgiheatingandair.com/schedule-service/'},{href:'https://mgiheatingandair.com.attacker.test/schedule-service/'},{href:'https://other.test/schedule-service/'},{href:'https://mgiheatingandair.com/booking-thank-you/'},{href:'https://mgiheatingandair.com/'},{href:'http://127.0.0.1:4321/schedule-service/'}]){
  const h=installerHarness(settings);assert.equal(h.controller.status,'disabled');assert.equal(h.listeners.size,0);assert.equal(h.counts.cookieReads,0);assert.equal(h.counts.storageReads,0);assert.equal(h.counts.storageWrites,0);
 }
 const h=installerHarness({enabled:undefined});assert.equal(installNativeBookingMeasurement({window:h.window,document:h.document,policy:h.policy}).status,'disabled');
});
test('measurement installer is idempotent and trusted new participation emits one durable conversion signal',()=>{
 const h=installerHarness();const again=installNativeBookingMeasurement({window:h.window,document:h.document,policy:h.policy,enabled:true});assert.equal(again,h.controller);assert.equal(h.counts.listenerAdds,1);
 h.send();assert.equal(h.window.dataLayer.length,0);h.send('BookingProcessStarted');h.send();h.send();
 assert.equal(h.window.dataLayer.length,1);assert.equal(h.window.dataLayer[0].transaction_id,'mgi-sp-request-76346706');assert.equal(h.store.getItem(key('76346706')),'attempted');
});
test('loader request or a different GTM runtime cannot reserve a receipt before the exact container is ready',()=>{
 for(const configure of [h=>{h.window.dataLayer.push({'gtm.start':1,event:'gtm.js'});},h=>{h.window.google_tag_manager={'GTM-OTHER':{}};}]){
  const h=installerHarness({runtime:false});configure(h);h.send('BookingProcessStarted');h.send();assert.equal(h.counts.storageWrites,0);assert.equal(h.store.values.size,0);
  h.window.google_tag_manager['GTM-5NWW55ZN']={};h.send();assert.equal(h.store.getItem(key('76346706')),'attempted');assert.equal(h.window.dataLayer.filter(event=>event.event==='mgi_booking_request_confirmed').length,1);
 }
});
test('missing array dataLayer prevents receipt reservation even if the exact GTM container exists',()=>{
 const h=installerHarness();h.window.dataLayer={push(){throw Error('must not dispatch');}};h.send('BookingProcessStarted');h.send();assert.equal(h.store.values.size,0);assert.equal(h.counts.storageWrites,0);
});
test('effective measurement policy refresh and GPC override both prevent attribution and storage access under denial',()=>{
 for(const settings of [{choice:'denied'},{choice:'granted',gpc:true},{choice:'unset'}]){
  const h=installerHarness({...settings,runtime:false});h.send('BookingProcessStarted');h.send();assert.ok(h.counts.refreshes>0);assert.equal(h.counts.cookieReads,0);assert.equal(h.counts.storageReads,0);assert.equal(h.counts.storageWrites,0);assert.equal(h.window.dataLayer.length,0);
  h.policy.state.choice='granted';h.window.navigator.globalPrivacyControl=false;h.window.google_tag_manager={'GTM-5NWW55ZN':{}};h.send('BookingProcessStarted');h.send();assert.equal(h.window.dataLayer.length,0);assert.equal(h.counts.storageWrites,0);
 }
});
test('policy refresh is used before arming, so a stale granted snapshot cannot override effective denial',()=>{
 const h=installerHarness();h.policy.refresh=()=>{h.counts.refreshes++;h.policy.state.choice='denied';};h.send('BookingProcessStarted');h.send();assert.equal(h.window.dataLayer.length,0);assert.equal(h.counts.cookieReads,0);assert.equal(h.counts.storageWrites,0);
});
test('known synthetic touches in URL or saved click cookie are excluded without reserving receipts',()=>{
 for(const field of ['gclid','gbraid','wbraid','utm_campaign'])for(const value of ['TEST_CODEX_20261030','TESTCODEXPPC20261030VERIFIED','TEST-MGI-FIXTURE']){
  for(const settings of [{href:`https://mgiheatingandair.com/schedule-service/?${field}=${value}`},{cookie:'mgi_click='+encodeURIComponent(JSON.stringify({[field]:value}))}]){
   const h=installerHarness(settings);h.send('BookingProcessStarted');h.send();assert.equal(h.window.dataLayer.length,0);assert.equal(h.counts.storageWrites,0);assert.equal(h.store.values.size,0);
  }
 }
});
test('exact known test appointment is excluded before reading optional attribution or reserving storage',()=>{
 const h=installerHarness();h.send('BookingProcessStarted');h.send('BookingBooked','76346705');assert.equal(h.counts.cookieReads,0);assert.equal(h.counts.storageReads,0);assert.equal(h.counts.storageWrites,0);assert.equal(h.window.dataLayer.length,0);
});
test('malformed saved touch fails closed and prevents measurement reservation',()=>{
 for(const cookie of ['mgi_click=%bad','mgi_click=not-json','mgi_click='+encodeURIComponent('{invalid')]){
  const h=installerHarness({cookie});h.send('BookingProcessStarted');h.send();assert.equal(h.window.dataLayer.length,0);assert.equal(h.counts.storageWrites,0);assert.equal(isKnownTestTouch({href:h.window.location.href,cookie}),true);
 }
});
test('unreadable attribution cookie fails closed without receipt reservation',()=>{
 const h=installerHarness();Object.defineProperty(h.document,'cookie',{get(){throw Error('blocked');}});h.send('BookingProcessStarted');h.send();assert.equal(h.window.dataLayer.length,0);assert.equal(h.counts.storageWrites,0);
});
test('ordinary production touch is not excluded merely for containing a non-prefix test fragment',()=>{
 assert.equal(isKnownTestTouch({href:'https://mgiheatingandair.com/schedule-service/?utm_campaign=latest-maintenance',cookie:'mgi_click='+encodeURIComponent(JSON.stringify({gclid:'ordinary-real-click'}))}),false);
});
test('saved attribution with invalid JSON schema fails closed before reserving a receipt',()=>{
 for(const parsed of [null,[],42,'TEST_CODEX',true,{gclid:123},{utm_campaign:['TEST_CODEX']}]){
  const cookie='mgi_click='+encodeURIComponent(JSON.stringify(parsed));const h=installerHarness({cookie});h.send('BookingProcessStarted');h.send();
  assert.equal(isKnownTestTouch({href:h.window.location.href,cookie}),true,JSON.stringify(parsed));assert.equal(h.window.dataLayer.length,0);assert.equal(h.counts.storageWrites,0);
 }
});
