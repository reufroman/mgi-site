import test from 'node:test';
import assert from 'node:assert/strict';
import { installTagManager } from '../src/data/tag-manager.mjs';
import { installCallMeasurement, CALL_CONSENT_KEY, LEGACY_CONSENT_KEY } from '../src/data/landing-call-measurement.mjs';
import config from '../src/data/tag-manager.json' with { type: 'json' };
import calls from '../src/data/landing-call-measurement.json' with { type: 'json' };
function environment({ consent, host='mgiheatingandair.com', protocol='https:', pathname='/' }={}) {
 const values=new Map(consent ? [[CALL_CONSENT_KEY,consent]] : []), listeners=[], scripts=[], commands=[], reloads=[];
 const window={ location:{hostname:host,protocol,pathname,reload:()=>reloads.push(true)}, localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)}, gtag:(...args)=>commands.push(args), addEventListener:(type,fn)=>listeners.push([type,fn]), removeEventListener:()=>{} };
 const document={head:{appendChild:script=>scripts.push(script)},createElement:()=>({}),querySelectorAll:()=>[]};
 return {window,document,values,scripts,commands,reloads,storage(key){for(const [type,fn] of listeners)if(type==='storage')fn({key});}};
}
test('unset, denied, and legacy denial load no GTM or Google commands',()=>{
 for(const consent of [undefined,'denied']){const env=environment({consent});installTagManager(config,env);assert.equal(env.scripts.length,0);assert.equal(env.commands.length,0);}
 const env=environment({consent:'granted'});env.values.set(LEGACY_CONSENT_KEY,'off');installTagManager(config,env);assert.equal(env.scripts.length,0);
});
test('affirmative consent queues denied defaults then analytics only, one GTM loader across repeated installs',()=>{
 const env=environment();const manager=installTagManager(config,env);manager.grant();manager.grant();assert.equal(installTagManager(config,env),manager);assert.equal(env.scripts.length,1);assert.equal(env.scripts[0].src,'https://www.googletagmanager.com/gtm.js?id=GTM-5NWW55ZN');assert.equal(env.commands[0][2].analytics_storage,'denied');assert.equal(env.commands[1][2].analytics_storage,'granted');assert.equal(env.commands[1][2].ad_storage,'denied');assert.deepEqual(env.window.dataLayer.map(row=>row.event),['gtm.js']);
});
test('wrong host, localhost, HTTP, malformed ID, and privacy choices never load GTM',()=>{
 for(const settings of [{host:'localhost'},{host:'mgi.localnerds.co'},{host:'www.mgiheatingandair.com'},{host:'mgiheatingandair.com.evil.test'},{protocol:'http:'},{pathname:'/privacy-choices/'},{pathname:'/privacy-choices'}]){const env=environment({consent:'granted',...settings});installTagManager(config,env).grant();assert.equal(env.scripts.length,0);}
 const env=environment({consent:'granted'});installTagManager({...config,containerId:'bad<script>'},env);assert.equal(env.scripts.length,0);
});
test('privacy choices persist grant and denial, load zero tags, and other tabs withdraw once',()=>{
 const tab=environment({consent:'granted'}), choice=environment({pathname:'/privacy-choices/'});const manager=installTagManager(config,tab);const choices=installTagManager(config,{...choice,choicesOnly:true});choices.grant();choices.deny();assert.equal(choice.scripts.length,0);assert.equal(choice.values.get(LEGACY_CONSENT_KEY),'off');tab.values.set(LEGACY_CONSENT_KEY,'off');tab.storage(LEGACY_CONSENT_KEY);tab.storage(CALL_CONSENT_KEY);manager.deny();assert.equal(tab.reloads.length,1);assert.equal(tab.commands.at(-1)[2].analytics_storage,'denied');
});
test('landing delegates GA4 to GTM while preserving Ads config without the removed call-swap destination, and one extra GTM loader without competing consent',()=>{
 const env=environment({pathname:'/lp/furnace-repair/'});let manager;const call=installCallMeasurement(calls,{...env,onChange:choice=>manager?.sync(choice)});manager=installTagManager(config,{...env,manageConsent:false,reloadOnWithdrawal:false});call.grant();call.grant();assert.equal(env.scripts.length,2);assert.equal(env.scripts.filter(script=>script.src===`https://www.googletagmanager.com/gtag/js?id=${calls.googleAdsId}`).length,1);assert.equal(env.scripts.filter(script=>script.src.includes('/gtm.js')).length,1);assert.equal(env.commands.filter(args=>args[0]==='config'&&args[1]===calls.googleAnalyticsId).length,0);assert.equal(env.commands.filter(args=>args[0]==='consent'&&args[1]==='default').length,1);// 2026-10-19 (Reu Yep): Google Ads forwarding-number swap removed; ServiceTitan DNI owns the /lp/ number. Ads config stays, swap config must not be sent.
assert.equal(env.commands.some(args=>args[1]===`${calls.googleAdsId}/${calls.callConversionLabel}`),false);assert.ok(env.commands.some(args=>args[0]==='config'&&args[1]===calls.googleAdsId));call.deny();assert.equal(env.reloads.length,1);assert.equal(env.commands.at(-1)[2].ad_storage,'denied');
});
test('granted saved preference starts once and cross-tab grant honors legacy denial precedence',()=>{
 const env=environment({consent:'granted'});installTagManager(config,env);assert.equal(env.scripts.length,1);env.storage(CALL_CONSENT_KEY);assert.equal(env.scripts.length,1);
 const other=environment();installTagManager(config,other);other.values.set(CALL_CONSENT_KEY,'granted');other.values.set(LEGACY_CONSENT_KEY,'off');other.storage(CALL_CONSENT_KEY);assert.equal(other.scripts.length,0);other.values.set(LEGACY_CONSENT_KEY,'on');other.storage(LEGACY_CONSENT_KEY);assert.equal(other.scripts.length,1);
});
test('GTM Page URL trigger includes landing routes and excludes privacy choices and every other host',()=>{
 const trigger = /^https:\/\/mgiheatingandair\.com\/(?!privacy-choices(?:[/?#]|$))/;
 for(const url of ['https://mgiheatingandair.com/','https://mgiheatingandair.com/ac-repair/?utm_source=test','https://mgiheatingandair.com/privacy-policy/','https://mgiheatingandair.com/lp','https://mgiheatingandair.com/lp/','https://mgiheatingandair.com/lp?x=1','https://mgiheatingandair.com/lp/furnace-repair/'])assert.equal(trigger.test(url),true,url);
 for(const url of ['https://mgiheatingandair.com/privacy-choices','https://mgiheatingandair.com/privacy-choices/','https://mgiheatingandair.com/privacy-choices?x=1','https://mgiheatingandair.com/privacy-choices#choice','https://www.mgiheatingandair.com/','https://mgiheatingandair.com.evil.test/','http://mgiheatingandair.com/','http://localhost:4321/'])assert.equal(trigger.test(url),false,url);
});
test('blocked storage still permits explicit current-page choice and withdrawal',()=>{
 const env=environment();env.window.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};const manager=installTagManager(config,env);assert.equal(env.scripts.length,0);manager.grant();assert.equal(env.scripts.length,1);manager.deny();assert.equal(env.reloads.length,1);assert.equal(manager.consent,'denied');
});
