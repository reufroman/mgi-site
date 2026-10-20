import {productionOrigin,assertRenderDependencies} from '../src/data/seo-policy.mjs';
import {assertProductionIntegrations} from '../src/data/production-integrations.mjs';
import {libraryAnswerById,generatedRoutes} from '../src/data/answer-library.mjs';
import {imageReuseErrors} from '../src/data/image-reuse-policy.mjs';
import {renderFingerprint,assertRenderApproval} from '../src/data/render-fingerprint.mjs';
import fs from 'node:fs/promises';import crypto from 'node:crypto';import {z} from 'zod';import site from '../src/data/site.json' with {type:'json'};import {isApproved} from '../src/data/release.mjs';import {contentFor} from '../src/data/catalog.mjs';import {guideById} from '../src/data/homeowner-guides.mjs';
const read=async p=>JSON.parse(await fs.readFile(`src/data/${p}.json`,'utf8'));
const [routes,editorial,placements,images,approvals]=await Promise.all(['routes','editorial','placements','image-manifest','approvals'].map(read));
const schema=z.object({eyebrow:z.string().min(1),title:z.string().min(1),summary:z.string().min(1),answer:z.string().min(1),sections:z.array(z.object({heading:z.string(),body:z.string(),bullets:z.array(z.string()).optional()})),faqs:z.array(z.object({question:z.string(),answer:z.string()})),ctaLabel:z.string(),reviewNotes:z.array(z.string()),sources:z.array(z.string()).min(1)});
if(routes.length!==749||new Set(routes.map(r=>r.canonical_route)).size!==749)throw Error('Route coverage drift');
for(const route of routes.filter(r=>r.family!=='Service-town candidate')){schema.parse(contentFor(route));if(JSON.stringify(contentFor(route)).includes('\u2014'))throw Error(`Em dash ${route.page_id}`);}
const articleCounts=routes.filter(r=>r.family==='Article'&&!r.source_answer_id).map(r=>({id:r.page_id,words:editorial[r.page_id].sections.flatMap(s=>[s.body,...s.bullets||[]]).join(' ').trim().split(/\s+/).filter(Boolean).length}));
if(articleCounts.length<8||articleCounts.some(a=>a.words<800))throw Error('Article completeness blocked: require eight substantive 800-word bodies; '+JSON.stringify(articleCounts));
const uses=new Map(),pairs=new Set();for(const p of placements){uses.set(p.picture_id,(uses.get(p.picture_id)||0)+1);const pair=p.page_id+'|'+p.picture_id;if(pairs.has(pair))throw Error('Same-page photo repeat');pairs.add(pair);if(!images.some(i=>i.picture_id===p.picture_id))throw Error('Unknown picture');}const reuseErrors=imageReuseErrors(placements,routes);if(reuseErrors.length)throw Error(reuseErrors.join('\n'));
for(const r of generatedRoutes)if(!routes.some(x=>x.page_id===r.page_id&&x.canonical_route===r.canonical_route&&x.source_answer_id===r.source_answer_id))throw Error('Answer route registry drift '+r.page_id);
const sourceReviewReady=g=>!!g&&g.reviewState.decision==='Approved for the stated application'&&!!g.reviewState.reviewer_name&&!!g.reviewState.reviewer_qualifications&&!!g.reviewState.review_date&&g.reviewState.public_use_status==='Approved'&&g.reviewState.reviewed_sha256===(g.sha256||g.sourceHash)&&g.reviewState.approved_sha256===(g.sha256||g.sourceHash);
if(process.env.MGI_BUILD_MODE==='release'){
 const selected=routes.filter(r=>isApproved(r,approvals.pages[r.page_id],approvals.integrations));
 if(!selected.length)throw Error('Release blocked: no pages have cleared evidence and exact Jesse approval');
 const approvedOrigin=productionOrigin(process.env.MGI_SITE_URL);
 if(approvals.integrations.canonicalOrigin!==approvedOrigin||approvals.integrations.seoMigrationReviewed!==true)throw Error('Release blocked: exact canonical origin and reviewed SEO migration map required');
 assertRenderDependencies(selected);
 const currentRenderSourceHash=renderFingerprint().hash;
 for(const r of selected)assertRenderApproval(approvals.pages[r.page_id],currentRenderSourceHash,r.page_id);
 for(const r of selected){if(r.source_answer_id&&!sourceReviewReady(guideById[r.page_id]||libraryAnswerById[r.page_id]))throw Error('Release blocked: exact qualified/public source review missing '+r.page_id);const hash=crypto.createHash('sha256').update(JSON.stringify(contentFor(r))).digest('hex');if(approvals.pages[r.page_id].contentHash!==hash)throw Error('Content changed since approval: '+r.page_id);if(placements.filter(p=>p.page_id===r.page_id).some(p=>!images.find(i=>i.picture_id===p.picture_id)?.src||approvals.images[p.picture_id]?.approvedBy!=='Jessica Hoeye'))throw Error('Unapproved image '+r.page_id);}
 for(const p of placements.filter(p=>selected.some(r=>r.page_id===p.page_id))){const image=images.find(i=>i.picture_id===p.picture_id);const hash=crypto.createHash('sha256').update(await fs.readFile(image.source_file)).digest('hex');if(approvals.images[p.picture_id].sourceHash!==hash)throw Error('Image changed since approval: '+p.picture_id);}
 if(!selected.some(r=>r.page_id==='ST-001')||!selected.some(r=>r.page_id==='ST-004'))throw Error('Release needs approved Home and request destination');
 assertProductionIntegrations(site,approvals.integrations);
 if(approvals.integrations.domainVerified!==true||!site.phone||!site.phoneApproval)throw Error('Release blocked: approved phone and domain must be verified');
 for(const r of selected.filter(r=>r.family==='Service-town candidate'))if(approvals.pages[r.page_id].evidence.renderedLocalContentReviewed!==true)throw Error('Release blocked: rendered local content needs documented final review '+r.page_id);
}
console.log(`Content schema passed: ${routes.filter(r=>r.family!=='Service-town candidate').length} base pages; ${routes.length} routes; ${placements.length} planned image placements; max ${Math.max(...uses.values())} uses`);

if(process.env.MGI_BUILD_MODE==='public'){
 const {readPublication,assertPublication,publicationAudit}=await import('../src/data/publication.mjs');
 const {publicationInputs}=await import('./publication-inputs.mjs');
 const origin=productionOrigin(process.env.MGI_SITE_URL);
 const expected=await publicationInputs(origin);
 assertPublication(readPublication(),expected);
 assertRenderDependencies(routes);
 await fs.mkdir('evidence',{recursive:true});
 await fs.writeFile('evidence/publication-audit.json',JSON.stringify(publicationAudit(readPublication(),expected),null,2)+'\n');
}
