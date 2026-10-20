import fs from 'node:fs';
import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {libraryAnswers} from '../src/data/answer-library.mjs';
import {execFileSync} from 'node:child_process';
const base='http://127.0.0.1:4328',out='evidence/answers',checks=[],errors=[];
const check=(value,label)=>{checks.push({label,pass:!!value});if(!value)errors.push(label)};
const browser=await chromium.launch();const context=await browser.newContext();const page=await context.newPage();
try{
 await page.goto(base+'/answers/',{waitUntil:'networkidle'});
 check(await page.locator('[data-hub-card]').count()===300,'300 source-backed result links');
 check(await page.locator('[data-hub-card]:visible').count()===12,'12 initial results');
 for(const [topic,total] of [['heating',100],['air-conditioning',35],['heat-pumps',35],['mini-splits',30],['water-heaters',40],['heat-pump-water-heaters',35],['indoor-air-quality',25]]){
  await page.locator(`[data-topic="${topic}"]`).click();check((await page.locator('#hub-result-count').innerText())===`Showing 12 of ${total} answers`,topic+' count');check(await page.locator('[data-hub-card]:visible').evaluateAll((es,t)=>es.every(e=>e.dataset.topicId===t),topic),topic+' results');
 }
 await page.locator('[data-hub-clear]').first().click();await page.locator('[data-hub-more]').click();check(await page.locator('[data-hub-card]:visible').count()===24,'Show more adds 12');
 const destination=await page.locator('[data-hub-card]:visible a').last().getAttribute('href');await page.locator(`[data-hub-card] a[href="${destination}"]`).click();await page.goBack();check(await page.locator('[data-hub-card]:visible').count()===24,'Back retains expanded results');
 await page.goto(base+'/answers/?topic=heat-pump-water-heaters&q=noise');check((await page.locator('#hub-query').inputValue())==='noise','query restored');check(await page.locator('[data-topic="heat-pump-water-heaters"]').getAttribute('aria-pressed')==='true','topic restored');check(await page.locator('[data-hub-card]:visible').count()>0,'combined search has results');
 await page.locator('#hub-query').fill('zzzznomatch');check(await page.locator('[data-hub-no-match]').isVisible(),'no-match recovery visible');await page.locator('[data-hub-no-match] [data-hub-clear]').click();check(await page.locator('[data-hub-card]:visible').count()===12,'recovery resets both filters');
 const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();await staticPage.goto(base+'/answers/');check(await staticPage.locator('[data-hub-card] a').count()===300,'all 300 links without JavaScript');await nojs.close();
 let served=0;for(let i=0;i<libraryAnswers.length;i+=15){const batch=await Promise.all(libraryAnswers.slice(i,i+15).map(async a=>{const r=await context.request.get(base+a.route);return {id:a.sourceId,status:r.status(),html:await r.text()}}));for(const row of batch){check(row.status===200,row.id+' HTTP 200');if(row.status===200)served++;}}
 check(served===300,'all 300 routes served');
 const norm=s=>s.replace(/\s+/g,' ').trim();
 const plain=s=>norm(s.split('\n').filter(l=>!/^\|\s*:?-+/.test(l)).map(l=>l.replace(/^#{1,2} /,'').replace(/^- /,'').replace(/^\||\|$/g,'').replaceAll('|',' ')).join('\n').replace(/\[([^\]]+)\]\(https:\/\/(?:[^\s()]|\([^\s()]*\))+\)/g,'$1').replaceAll('**',''));
 let parity=0;
 for(const a of libraryAnswers){const html=fs.readFileSync('dist-review'+a.route+'index.html','utf8');check(html.includes('data-context-cta'),a.sourceId+' contextual CTA');const result=await page.evaluate(html=>{const d=new DOMParser().parseFromString(html,'text/html'),article=d.querySelector('[data-library-answer]');return {hash:article?.getAttribute('data-source-hash'),text:[article?.querySelector('h1')?.textContent,...[...article.querySelectorAll('.answer-source h2,.answer-source p,.answer-source li,.answer-source th,.answer-source td')].map(e=>e.textContent)].join(' '),robots:d.querySelector('meta[name="robots"]')?.getAttribute('content')}},html);check(result.hash===a.sourceHash,a.sourceId+' exact hash');check(norm(result.text)===plain(a.sourceMarkdown),a.sourceId+' full rendered source parity');check(result.robots==='noindex, nofollow',a.sourceId+' noindex');if(norm(result.text)===plain(a.sourceMarkdown))parity++;}
 const release=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',"import {pages,byId} from './src/data/catalog.mjs'; console.log(JSON.stringify({pages:pages.length,answers:pages.filter(p=>p.source_answer_id).length,example:!!byId('ANSWER-MGI-001')}))"],{env:{...process.env,MGI_BUILD_MODE:'release'}}));check(release.answers===0&&!release.example,'unapproved answers excluded from release catalog');
 const samples=['MGI-001','MGI-043','MGI-101','MGI-180','MGI-300'];
 for(const width of [393,1440])for(const id of samples){const a=libraryAnswers.find(a=>a.sourceId===id);await page.setViewportSize({width,height:1000});await page.goto(base+a.route,{waitUntil:'networkidle'});check(await page.locator('h1').count()===1,id+' one H1 '+width);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' no overflow '+width);const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();check(axe.violations.length===0,id+' axe '+width);await page.screenshot({path:`${out}/${id}-${width}.png`,fullPage:true});}
 fs.writeFileSync(out+'/library-verification.json',JSON.stringify({checks,errors,served,parity,release,samples},null,2));console.log(JSON.stringify({checks:checks.length,errors,served,parity,release,samples}));
}finally{await browser.close()}
if(errors.length)process.exit(1);
