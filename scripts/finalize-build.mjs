import {migrationRules} from '../src/data/migration-redirects.mjs';
import {productionOrigin, sitemapXml, assertReleaseLinkClosure, breadcrumbSchemaFromHtml} from '../src/data/seo-policy.mjs';
import fs from 'node:fs/promises';
const mode=process.env.MGI_BUILD_MODE||'review';const out=`dist-${mode}`;
const origin=mode!=='review'?productionOrigin(process.env.MGI_SITE_URL):process.env.MGI_SITE_URL||'https://mgi-review.invalid';
const {allRoutes,pages:routes}=await import('../src/data/catalog.mjs');
for(const route of routes){const file=`${out}/${route.canonical_route==='/'?'':route.canonical_route.slice(1)}index.html`;const html=await fs.readFile(file,'utf8');const breadcrumb=breadcrumbSchemaFromHtml(html,route,origin);if(breadcrumb)await fs.writeFile(file,html.replace('</head>',`<script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g,'\\u003c')}</script></head>`));}
const manifest={mode,builtAt:new Date().toISOString(),routes:routes.map(r=>({page_id:r.page_id,route:r.canonical_route,family:r.family})),counts:{base:routes.filter(r=>r.family!=='Service-town candidate').length,localCandidates:routes.filter(r=>r.family==='Service-town candidate').length,total:routes.length}};
if(mode!=='review'){const documents=await Promise.all(routes.map(async r=>[r.page_id,await fs.readFile(`${out}/${r.canonical_route==='/'?'':r.canonical_route.slice(1)}index.html`,'utf8')]));assertReleaseLinkClosure(documents,allRoutes,routes);}
await fs.mkdir('evidence',{recursive:true});await fs.writeFile('evidence/build-manifest.json',JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(`${out}/robots.txt`,mode==='review'?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await fs.writeFile(`${out}/_headers`,(mode==='review'?'/*\n  X-Robots-Tag: noindex, nofollow\n':'/*\n')+'  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n'+(mode==='review'?'':'/404/*\n  X-Robots-Tag: noindex, follow\n/404.html\n  X-Robots-Tag: noindex, follow\n/request-received/*\n  X-Robots-Tag: noindex, follow\n'));
if(routes.some(r=>r.page_id==='ST-019'))await fs.copyFile(`${out}/404/index.html`,`${out}/404.html`);
await fs.writeFile(`${out}/_redirects`,migrationRules(routes));
await fs.writeFile(`${out}/sitemap.xml`,sitemapXml(routes,origin,mode==='review'));
console.log(`Finalized ${mode}: ${routes.length} governed routes, sitemap and 404 behavior`);
