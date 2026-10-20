import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '@playwright/test';

const base=process.env.MGI_TEST_URL||'http://127.0.0.1:4323';
const routes=JSON.parse(fs.readFileSync('src/data/routes.json','utf8'));
const editorial=JSON.parse(fs.readFileSync('src/data/editorial.json','utf8'));
const errors=[],results=[];
const assert=(condition,message)=>{if(!condition)errors.push(message)};
const decode=value=>value.replaceAll('&amp;','&');
const htmlFor=route=>fs.readFileSync(path.join('dist-review',route.canonical_route,'index.html'),'utf8');
const hrefs=html=>[...html.matchAll(/href="([^"]+)"/g)].map(m=>decode(m[1])).filter(h=>h.startsWith('/schedule-service/'));
const expectedContext=route=>{
 if(route.family==='Service')return {service:route.name};
 if(route.family==='Area')return {town:route.name.replace('HVAC Services in ','')};
 const tail=route.canonical_route.split('/').filter(Boolean).at(-1);
 const area=routes.find(r=>r.family==='Area'&&tail.startsWith(r.canonical_route.split('/').filter(Boolean).at(-1)+'-'));
 const areaSlug=area.canonical_route.split('/').filter(Boolean).at(-1);
 const service=routes.find(r=>r.family==='Service'&&r.canonical_route===`/services/${tail.slice(areaSlug.length+1)}/`);
 return {service:service.name,town:area.name.replace('HVAC Services in ','')};
};

// Inspect every emitted shared-template route, avoiding hundreds of redundant browser loads.
for(const route of routes.filter(r=>['Service','Area','Service-town candidate','Article'].includes(r.family))){
 const html=htmlFor(route);
 const hero=html.match(/<section class="hero[^]*?<\/section>/)?.[0]||'';
 const closing=html.match(/<section class="closing[^]*?<\/section>/)?.[0]||'';
 const links=route.family==='Article'?[...hrefs(hero),...hrefs(html.match(/id="article-detail"[^]*?(?=<section class="closing)/)?.[0]||'')]:hrefs(hero);
 if(route.family==='Article'){
  const content=editorial[route.page_id];
  const body=content.sections.flatMap(section=>[section.body,...section.bullets||[]]).join(' ');
  const wordCount=body.trim().split(/\s+/).length;
  assert(wordCount>=800,`${route.page_id}: article body has ${wordCount} words, minimum 800 (excludes title, summary, answer, headings and FAQs)`);
 }
 assert(links.length>0,`${route.page_id}: missing primary request action`);
 const closingLinks=hrefs(closing);
 assert(closingLinks.length>0,`${route.page_id}: missing closing request action`);
 for(const href of [...links,...closingLinks]){
  const params=new URL(href,base).searchParams;
  if(route.family==='Article')assert(Boolean(params.get('topic')||params.get('service')),`${route.page_id}: article request loses topic/service: ${href}`);
  else for(const [key,value] of Object.entries(expectedContext(route)))assert(params.get(key)===value,`${route.page_id}: ${key} should be ${value}: ${href}`);
 }
}
results.push({check:'all-emitted-request-context',count:routes.filter(r=>['Service','Area','Service-town candidate','Article'].includes(r.family)).length});

const luminance=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();
 const page=await context.newPage();
 const response=await page.goto(base+'/',{waitUntil:'networkidle'});
 assert(response.status()===200&&await page.locator('body').getAttribute('data-page-id')==='ST-001','Wrong preview identity');
 page.on('pageerror',error=>errors.push(error.message));
 for(const width of [767,768,820,1024,1100,1101]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'/');
  const menu=page.locator('.mobile-menu');if(await menu.locator('summary').isVisible())await menu.locator('summary').click();
  for(const label of ['Services','Service areas','Homeowner help','About']){
   const available=await page.locator('header a').filter({hasText:new RegExp('^'+label+'$')}).evaluateAll(es=>es.some(e=>e.checkVisibility()&&e.getBoundingClientRect().width>0));
   assert(available,`Navigation ${label} unreachable at ${width}px`);
  }
 }
 results.push({check:'navigation-six-breakpoints'});
 await page.setViewportSize({width:393,height:1000});await page.goto(base+'/schedule-service/',{waitUntil:'networkidle'});
 const firstFieldTop=await page.locator('#request-name').evaluate(e=>e.getBoundingClientRect().top);
 assert(firstFieldTop<900,`First request field begins ${firstFieldTop}px down at 393px`);
 results.push({check:'request-first-field',top:firstFieldTop});
 await page.goto(base+'/');await page.keyboard.press('Tab');await page.keyboard.press('Tab');
 const focus=await page.locator('.review-bar a').evaluate(e=>({focused:e===document.activeElement,outline:getComputedStyle(e).outlineColor,background:getComputedStyle(e.parentElement).backgroundColor,style:getComputedStyle(e).outlineStyle}));
 const outline=luminance(focus.outline.match(/[\d.]+/g).slice(0,3).map(Number)),background=luminance(focus.background.match(/[\d.]+/g).slice(0,3).map(Number));
 const contrast=(Math.max(outline,background)+.05)/(Math.min(outline,background)+.05);
 assert(focus.focused&&focus.style!=='none'&&contrast>=3,`Review-bar focus inadequate: ${JSON.stringify({...focus,contrast})}`);
 results.push({check:'review-focus',contrast});
 const choicesFirst=await page.evaluate(()=>{const choices=document.querySelector('a[href*="need=repair"]')?.closest('section');const rebates=document.querySelector('a[href="/rebates/"]')?.closest('section');return !!choices&&!!rebates&&!!(choices.compareDocumentPosition(rebates)&Node.DOCUMENT_POSITION_FOLLOWING)});
 assert(choicesFirst,'Home concern choices must precede rebate band');
 for(const id of ['ST-059','SL-BER-FUR-REP','ST-079']){
  await page.goto(base+routes.find(r=>r.page_id===id).canonical_route);
  const safety=await page.evaluate(()=>{const notice=document.querySelector('.hero .notice');const action=document.querySelector('.hero .actions a');return !!notice&&!!action&&/gas|carbon monoxide/i.test(notice.textContent)&&!!(notice.compareDocumentPosition(action)&Node.DOCUMENT_POSITION_FOLLOWING)});
  assert(safety,`${id}: gas/CO safety must precede primary action`);
 }
 for(const id of ['ST-054','ST-055','ST-058']){
  await page.goto(base+routes.find(r=>r.page_id===id).canonical_route);
  assert(await page.locator('.direct-answer').evaluate(e=>getComputedStyle(e).textAlign)==='left',`${id}: direct answer must be left aligned`);
 }
 await page.goto(base+routes.find(r=>r.page_id==='ST-054').canonical_route);
 const safeImageOrder=await page.evaluate(()=>{const body=document.querySelector('#article-detail');const image=document.querySelector('.article-photo');const sections=[...document.querySelectorAll('#article-detail .reading[data-reveal]')];return !!body&&sections.length>0&&(!image||sections.every(section=>!!(section.compareDocumentPosition(image)&Node.DOCUMENT_POSITION_FOLLOWING)))});
 assert(safeImageOrder,'Furnace safety article photo precedes practical body');
 results.push({check:'safety-and-answer-order'});
 // Exercise the prominent path a homeowner actually chooses, including an intermediate service page.
 await page.goto(base+'/service-area/greeley/',{waitUntil:'networkidle'});
 await page.locator('a.link-card').filter({has:page.locator('h3',{hasText:/^Furnace Repair$/})}).click();
 assert(new URL(page.url()).searchParams.get('town')==='Greeley','Greeley service card drops town');
 const relatedHref=await page.locator('a.link-card[href^="/services/"]').first().getAttribute('href');
 assert(new URL(relatedHref,base).searchParams.get('town')==='Greeley','Related service link drops Greeley');
 await page.locator('.hero .button').click();
 assert(await page.locator('[name="town"]').inputValue()==='Greeley','Prominent Greeley path loses request town');
 assert(await page.locator('[name="service"]').inputValue()==='Furnace Repair','Prominent Greeley path loses request service');
 await page.goto(new URL(relatedHref,base).href,{waitUntil:'networkidle'});
 await page.locator('.hero .button').click();
 assert(await page.locator('[name="town"]').inputValue()==='Greeley','Related service onward request loses Greeley');
 await page.goto(base+'/services/furnace-repair/?town=InvalidExampleTown',{waitUntil:'networkidle'});
 const invalidLinks=await page.locator('a[href^="/schedule-service/"],a[href^="/services/"]').evaluateAll(es=>es.map(e=>e.href));
 assert(invalidLinks.every(h=>new URL(h).searchParams.get('town')!=='InvalidExampleTown'),'Unrecognized town propagates to service/request links');
 await page.locator('.hero .button').click();
 assert(await page.locator('[name="town"]').inputValue()==='','Unrecognized town prefills request');
 results.push({check:'area-service-request-and-related-context',town:'Greeley',service:'Furnace Repair',invalidTownIgnored:true});
 for(const route of routes.filter(r=>r.family==='Article')){
  await page.goto(base+route.canonical_route);
  const labels=await page.locator('.source-list a[rel="noopener noreferrer"]').allTextContents();
  const normalized=labels.map(label=>label.trim());
  assert(normalized.length>0,`${route.page_id}: article has no public source labels`);
  assert(new Set(normalized).size===normalized.length,`${route.page_id}: duplicate source link labels: ${JSON.stringify(normalized)}`);
  assert(normalized.every(label=>label&&!/\breference\b/i.test(label)&&!/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\s*:?\s*(?:official guidance)?$/i.test(label)),`${route.page_id}: generic source label: ${JSON.stringify(normalized)}`);
 }
 results.push({check:'eight-article-descriptive-source-labels',count:8});
 await context.close();
}catch(error){errors.push(error.stack||String(error))}finally{
 await browser.close();
 const result={base,errors,results};fs.writeFileSync('/private/tmp/mgi-elite-review-results.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({groups:results.length,errors:errors.length}));if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
}
