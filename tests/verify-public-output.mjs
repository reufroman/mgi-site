import fs from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import routes from '../src/data/routes.json' with {type:'json'};
import {robotsDirective,canonicalUrl,assertReleaseLinkClosure} from '../src/data/seo-policy.mjs';
import {readPublication} from '../src/data/publication.mjs';
const out='dist-public',origin='https://mgiheatingandair.com';
const documents=[];const errors=[];
for(const r of routes){
 const html=await fs.readFile(`${out}${r.canonical_route}index.html`,'utf8');documents.push([r.page_id,html]);
 const visible=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 assert.ok(html.includes(`data-page-id="${r.page_id}"`),r.page_id);
 assert.ok(html.includes('data-build-mode="public"'),r.page_id);
 assert.ok(html.includes(`name="robots" content="${robotsDirective(r,false)}"`),r.page_id);
 assert.ok(html.includes(`rel="canonical" href="${canonicalUrl(r,origin)}"`),r.page_id);
 assert.doesNotMatch(visible,/private review|client review draft|internal review|editorial draft|publication gate|final policy must|verified contact route|review candidates|before public use/i,r.page_id);
 for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const url=m[1].replaceAll('&amp;','&');if(!url.startsWith('/')||url.startsWith('//'))continue;
  const path=new URL(url,origin).pathname;
  const file=path.endsWith('/')?`${out}${path}index.html`:`${out}${path}`;
  if(!existsSync(file))errors.push({page:r.page_id,url});
 }
 assert.ok(!html.includes('3a4d0205-8ffe-416b-aeeb-84ddc231b1b9'));
 assert.ok(html.includes('73995714-0241-4b8a-a89d-e81f8b1dfef6'),r.page_id);
}
assert.deepEqual(errors,[]);assertReleaseLinkClosure(documents,routes,routes);
assert.ok(!existsSync(`${out}/review/index.html`));assert.ok(!existsSync(`${out}/lp`));
assert.equal(readFileSync(`${out}/404.html`,'utf8'),readFileSync(`${out}/404/index.html`,'utf8'));
assert.doesNotMatch(readFileSync(`${out}/_headers`,'utf8'),/^\/\*\n\s+X-Robots-Tag/);
assert.ok(readFileSync(`${out}/robots.txt`,'utf8').includes(`Sitemap: ${origin}/sitemap.xml`));
assert.equal((readFileSync(`${out}/sitemap.xml`,'utf8').match(/<loc>/g)||[]).length,738);
const reviewHeaders=readFileSync('dist-review/_headers','utf8');assert.match(reviewHeaders,/\/\*\n\s+X-Robots-Tag: noindex, nofollow/);
assert.match(readFileSync('dist-review/robots.txt','utf8'),/Disallow: \//);assert.doesNotMatch(readFileSync('dist-review/sitemap.xml','utf8'),/<loc>/);
const result={status:'pass',routes:routes.length,indexable:738,linksAndAssets:'all same-origin src/href references resolve',reviewDirectory:'absent',adsDrafts:'absent',schedulerWidget:readPublication().scheduler.widgetId,internalAuthoringText:'absent',reviewProtections:'retained',ordinary404:'identical fallback file; actual hosted status owned by lead',assurances:'unverified, separately recorded'};
await fs.writeFile('evidence/public-output-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
