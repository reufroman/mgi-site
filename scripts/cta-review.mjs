import fs from 'node:fs';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import routes from '../src/data/routes.json' with {type:'json'};
const base=process.env.MGI_TEST_URL||'http://127.0.0.1:4324';const hosted=base.startsWith('https:');
const folder='evidence/elite-review/cta-placement';fs.mkdirSync(folder,{recursive:true});
const errors=[],results=[];const assert=(ok,m)=>{if(!ok)errors.push(m)};
// Inspect emitted site markup only, without opening or inspecting intake pages.
let affected=0;const excluded=new Set(['ST-003','ST-004','ST-018']);
for(const r of routes.filter(r=>!excluded.has(r.page_id))){const file='dist-review'+(r.canonical_route==='/'?'/index.html':r.canonical_route+'index.html');const html=fs.readFileSync(file,'utf8');const count=(html.match(/data-context-cta/g)||[]).length;const expected=!['ST-001','ST-014','ST-015','ST-016','ST-017','ST-019'].includes(r.page_id);assert(count===(expected?1:0),'Unexpected body CTA count '+r.page_id);if(count)affected++;}
results.push({check:'emitted-contextual-actions',pages:affected,excludedIntake:[...excluded]});
const selected=[
 ['ST-059',2,'/schedule-service/','Furnace Repair'],['ST-060',2,'/schedule-service/','Furnace Replacement'],
 ['ST-029',1,'/schedule-service/',''],['SL-GRE-FUR-REP',2,'/schedule-service/','Furnace Repair'],
 ['ST-007',1,'/schedule-service/',''],['ST-008',1,'/schedule-service/',''],
 ['ST-045',1,'/services/furnace/'],['ST-051',4,'/services/ac-repair/'],['ST-052',4,'/rebates/'],['ST-054',4,'/services/furnace-repair/'],
 ['ST-079',2,'tel:+19702871673'],['ST-071',2,'/schedule-service/','Heat-Pump Water Heater Repair'],
];
const browser=await chromium.launch();
try{for(const width of [320,393,820,1440]){const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
for(const [id,after,path,service] of selected){const route=routes.find(r=>r.page_id===id);assert(!!route,'Unknown test route '+id);if(!route)continue;await page.goto(base+route.canonical_route,{waitUntil:'networkidle'});const cta=page.locator('[data-context-cta]');assert(await cta.count()===1,'CTA count '+id);await cta.scrollIntoViewIfNeeded();assert(await cta.isVisible(),'CTA hidden '+id);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Overflow '+id+'@'+width);
const href=await cta.locator('a.button').getAttribute('href');if(path.startsWith('tel:'))assert(href===path,'Urgent dial link');else{const dest=new URL(href,base);assert(dest.pathname===path,'Wrong next step '+id);if(service)assert(dest.searchParams.get('service')===service,'Lost service '+id);if(['ST-029','SL-GRE-FUR-REP'].includes(id))assert(dest.searchParams.get('town')==='Greeley','Lost Greeley '+id);}
assert(await cta.evaluate((e,i)=>{const heading=document.getElementById('section-'+(i+1));return !!heading&&!!(heading.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING)},after),'Action before decision content '+id);
assert(await cta.locator('.decision-proof').count()===1,'Missing proof '+id);
if(width===393&&['ST-059','ST-007','ST-051','ST-054'].includes(id)){const axe=await new AxeBuilder({page}).include('[data-context-cta]').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert(!axe.violations.length,'CTA accessibility '+id+': '+axe.violations.map(v=>v.id));}
if(width!==820&&['ST-059','ST-007','ST-051'].includes(id))await cta.screenshot({path:`${folder}/${hosted?'live':'local'}-${id}-${width}.png`});
results.push({check:'rendered-next-step',id,width,href});}
await context.close();}}finally{await browser.close();fs.writeFileSync(`${folder}/${hosted?'live':'local'}-checks.json`,JSON.stringify({base,formInspected:false,errors,results},null,2)+'\n');}
console.log(JSON.stringify({groups:results.length,affected,errors}));if(errors.length)process.exitCode=1;
