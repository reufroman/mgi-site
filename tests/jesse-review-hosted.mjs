import fs from 'node:fs';
import crypto from 'node:crypto';
import {chromium} from '@playwright/test';
import {pages} from '../src/data/catalog.mjs';
const host='https://mgi.localnerds.co';
const evidenceDir=process.argv.find(x=>x.startsWith('--evidence-dir='))?.split('=').slice(1).join('=')||'evidence';
const out=process.argv.find(x=>x.startsWith('--output-dir='))?.split('=').slice(1).join('=')||'evidence/jesse-review-deploy';
fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const errors=[],routes=[];let next=0;
if(process.argv.includes('--visual-recheck')){const checkpoint=JSON.parse(fs.readFileSync(`${out}/hosted-routes-checkpoint.json`));if(checkpoint.routes.length!==739||checkpoint.errors.length)throw Error('Invalid route checkpoint');routes.push(...checkpoint.routes);}else await Promise.all(Array.from({length:8},async()=>{
 while(next<pages.length){
  const p=pages[next++];
  try{
   const res=await fetch(host+p.canonical_route,{signal:AbortSignal.timeout(30000)});
   const body=await res.text();
   const local=fs.readFileSync('dist-review'+p.canonical_route+'index.html','utf8');
   const row={id:p.page_id,route:p.canonical_route,status:res.status,noindex:res.headers.get('x-robots-tag'),identity:body.includes(`data-page-id="${p.page_id}"`),htmlMatches:sha(body)===sha(local)};
   routes.push(row);
   if(row.status!==200||!row.identity||!row.htmlMatches||row.noindex!=='noindex, nofollow')errors.push(row);
  }catch(e){errors.push({id:p.page_id,error:e.message});}
 }
}));
console.log(JSON.stringify({checkpoint:'routes',checked:routes.length,errors:errors.length}));
fs.writeFileSync(`${out}/hosted-routes-checkpoint.json`,JSON.stringify({routes,errors},null,2)+'\n');
const denied=(r)=>r.status===403||([302,303,307].includes(r.status)&&new URL(r.headers.get('location')).hostname.endsWith('.cloudflareaccess.com'));
const controls=[];
for(const route of ['/robots.txt','/sitemap.xml','/mgi-audit-unknown-route/','/brandguide/','/marbudget/','/marbudget/api/plan']){
 const r=await fetch(host+route,{redirect:'manual',signal:AbortSignal.timeout(30000)}),body=await r.text();
 const row={route,status:r.status,location:r.headers.get('location')?.split('?')[0],noindex:r.headers.get('x-robots-tag')};controls.push(row);
 if(route==='/robots.txt'&&(r.status!==200||!body.includes('Disallow: /')))errors.push({route,issue:'robots'});
 if(route==='/sitemap.xml'&&(r.status!==200||body.includes('<loc>')))errors.push({route,issue:'sitemap'});
 if(route==='/mgi-audit-unknown-route/'&&r.status!==404)errors.push({route,issue:'404'});
 if(route==='/brandguide/'&&r.status!==200)errors.push({route,issue:'brand guide'});
 if(route.startsWith('/marbudget')&&!denied(r))errors.push({route,issue:'budget unprotected'});
}
const created=JSON.parse(fs.readFileSync(`${evidenceDir}/demo-deployment-created.json`));
for(const route of ['/marbudget/','/marbudget/api/plan']){
 const r=await fetch(created.url+route,{redirect:'manual',signal:AbortSignal.timeout(30000)});
 controls.push({host:created.url,route,status:r.status,location:r.headers.get('location')?.split('?')[0]});
 if(!denied(r))errors.push({route,issue:'alternate hostname budget unprotected',status:r.status});
}
console.log(JSON.stringify({checkpoint:'controls',checked:controls.length,errors:errors.length}));
const browser=await chromium.launch();const visual=[];
try{
 for(const width of [1440,393]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  for(const route of ['/','/services/ac-repair/','/service-area/windsor/','/blog/','/blog/what-is-a-manual-j-calculation-and-why-is-it-important/','/answers/']){
   const page=await context.newPage();const runtime=[];page.on('pageerror',e=>runtime.push(e.message));
   await page.goto(host+route,{waitUntil:'networkidle'});
   await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width).map(i=>i.decode().catch(()=>{})));});
   const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,brokenImages:[...document.images].filter(i=>i.getBoundingClientRect().width&&!i.naturalWidth).length,reviewBanner:document.body.innerText.includes('Private review'),h1:document.querySelectorAll('main h1').length}));
   const name=route==='/'?'home':route.split('/').filter(Boolean).pop();
   const screenshot=`${out}/hosted-${name}-${width}.png`;await page.screenshot({path:screenshot});
   visual.push({route,width,...state,runtime,screenshot});console.log(JSON.stringify({checkpoint:'viewport',route,width}));
   if(state.overflow||state.brokenImages||state.h1!==1||runtime.length)errors.push({route,width,...state,runtime});
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close();}
fs.writeFileSync(`${out}/hosted-verification.json`,JSON.stringify({host,deployment:created.id,routes:routes.sort((a,b)=>a.route.localeCompare(b.route)),controls,visual,errors,realRequestsSubmitted:0,realCalls:0},null,2)+'\n');
console.log(JSON.stringify({routes:routes.length,exactHtmlMatches:routes.filter(r=>r.htmlMatches).length,visualChecks:visual.length,errors:errors.length}));
if(errors.length){console.error(JSON.stringify(errors));process.exitCode=1;}
