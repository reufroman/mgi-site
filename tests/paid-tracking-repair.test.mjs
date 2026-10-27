import test from 'node:test';
import assert from 'node:assert/strict';
import { attributionFrom, schedulerDestination, createReceiptReporter, installSchedulerTransport } from '../src/data/paid-tracking-repair.mjs';
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
function schedulerEnv({href='https://mgiheatingandair.com/schedule-service/?gclid=TEST-MGI-CLICK&utm_source=google',choice='granted',cookie='',ready=Promise.resolve()}={}){
 const snapshots=[],scripts=[],navigations=[],commands=[],help={hidden:true};const location=new URL(href);location.assign=u=>navigations.push(String(u));
 const window={location,history:{state:null,replaceState:(s,t,url)=>{location.href=url;}},STWidgetManager:(...args)=>commands.push(args)};
 const document={cookie,head:{appendChild:script=>{scripts.push(script);snapshots.push({src:script.src,url:location.href});}},createElement:()=>({}),getElementById:()=>help};
 const policy={ready,state:{choice}};return{window,document,policy,snapshots,scripts,navigations,commands,help};
}
const setup=env=>installSchedulerTransport({...env,widgetId:'73995714-0241-4b8a-a89d-e81f8b1dfef6',websiteUrl:'https://mgiheatingandair.com'});
test('actual shim init waits for policy, removes denied click data before load, and keeps booking functional',async()=>{
 let resolve;const env=schedulerEnv({choice:'denied',ready:new Promise(r=>resolve=r)});const scheduler=setup(env);assert.equal(env.snapshots.length,0);resolve();await scheduler.ready;assert.equal(env.snapshots.length,1);assert.equal(new URL(env.snapshots[0].url).searchParams.has('gclid'),false);await scheduler.open();assert.equal(env.commands.at(-1)[0],'ws-open');
});
test('actual shim sees cookie attribution on schedule pages and main pages before initialization',async()=>{
 for(const path of ['/schedule-service/','/contact/']){const env=schedulerEnv({href:'https://mgiheatingandair.com'+path,cookie:oldCookie});await setup(env).ready;assert.equal(new URL(env.snapshots[0].url).searchParams.get('gclid'),'old-click');}
});
test('local/review/other hosts never load a real provider or navigate into production',async()=>{
 for(const href of ['http://127.0.0.1:4346/?gclid=TEST-MGI-CLICK','https://mgi-review.invalid/','https://mgiheatingandair.com.evil.test/']){const env=schedulerEnv({href});const scheduler=setup(env);assert.equal(await scheduler.open('/schedule-service/?gclid=TEST-MGI-CLICK'),false);assert.equal(env.snapshots.length,0);assert.equal(env.navigations.length,0);assert.equal(env.help.hidden,false);}
});
test('ws-widget flag auto-opens once after init and shim failure exposes the call fallback',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/?ws-widget=open'});await setup(env).ready;assert.deepEqual(env.commands.map(c=>c[0]),['init','ws-open']);
 const broken=schedulerEnv();const scheduler=setup(broken);await scheduler.ready;broken.scripts[0].onerror();assert.equal(await scheduler.open(),false);assert.equal(broken.help.hidden,false);assert.deepEqual(broken.commands.map(c=>c[0]),['init']);
});
test('contextual service links reach a fresh hosting URL and schedule-page buttons retain that context',async()=>{
 const env=schedulerEnv({href:'https://mgiheatingandair.com/'});const scheduler=setup(env);await scheduler.open('/schedule-service/?service=Furnace&town=Windsor&topic=Furnace');assert.equal(env.navigations.length,1);assert.equal(new URL(env.navigations[0]).searchParams.get('town'),'Windsor');assert.deepEqual(env.commands.map(c=>c[0]),['init']);
 const scheduled=schedulerEnv({href:'https://mgiheatingandair.com/schedule-service/?service=Furnace&town=Windsor&topic=Furnace'});await setup(scheduled).open();assert.equal(scheduled.navigations.length,0);assert.equal(scheduled.commands.at(-1)[0],'ws-open');
});
