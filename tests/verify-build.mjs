import {imageReuseErrors} from '../src/data/image-reuse-policy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {isApproved} from '../src/data/release.mjs';
const read=n=>JSON.parse(fs.readFileSync(`src/data/${n}.json`,'utf8'));
const routes=read('routes'),pictures=read('image-manifest'),placements=read('placements'),approvals=read('approvals');
const mode=process.env.MGI_BUILD_MODE==='release'?'release':'review',out=`dist-${mode}`,errors=[],checks=[];
const fail=(message)=>errors.push(message),assert=(condition,message)=>{if(!condition)fail(message)};
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)=["']([^"']*)["']/g)].map(m=>[m[1],decode(m[2])]));
const files=[];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else files.push(f)}}
assert(fs.existsSync(out),`${out} missing`);if(!fs.existsSync(out))throw Error(errors.join('\n'));walk(out);
const html=files.filter(f=>f.endsWith('.html')),byId=new Map(routes.map(r=>[r.page_id,r])),seen=new Map(),used=new Map(),renderedPlacements=new Set(),hashIds=new Map();
// Inventory is 749 governed routes: the count enforced by scripts/validate-content.mjs and shipped in the
// live public release (749 routes, 738 sitemap URLs). The earlier 739 predates the final route additions.
const INVENTORY=749;
assert(routes.length===INVENTORY,`Expected ${INVENTORY} inventory records`);assert(byId.size===INVENTORY,'Duplicate inventory IDs');assert(new Set(routes.map(r=>r.canonical_route)).size===INVENTORY,'Duplicate canonical routes');
for(const p of pictures){if(!p.src)continue;const f=path.join(out,p.src);assert(fs.existsSync(f),`Missing picture ${p.picture_id}: ${p.src}`);if(fs.existsSync(f)){const hash=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');const old=hashIds.get(hash);assert(!old||old===p.picture_id,`Same output picture bytes assigned ${old} and ${p.picture_id}`);hashIds.set(hash,p.picture_id)}assert(!p.source_file||fs.existsSync(path.resolve('../..',p.source_file)),`Missing origin ${p.picture_id}`)}
for(const f of html){const source=fs.readFileSync(f,'utf8'),body=attrs(source.match(/<body\b[^>]*>/)?.[0]||''),id=body['data-page-id'],r=byId.get(id);
 if(!r){assert(!id||['review-directory','REVIEW'].includes(id),`Unknown emitted page ID ${id}`);continue}
 assert(!seen.has(id)||id==='ST-019'&&f===path.join(out,'404.html'),`Multiple emitted files for ${id}`);seen.set(id,f);assert(body['data-build-mode']===mode,`Mode mismatch ${id}`);
 assert((source.match(/<h1\b/g)||[]).length===1,`Expected one H1 ${id}`);assert(/<title>[^<]+<\/title>/.test(source),`Missing title ${id}`);
 assert(/<meta\b[^>]*name="description"[^>]*content="[^"]+"/.test(source),`Missing description ${id}`);
 const canonical=[...source.matchAll(/<link\b[^>]*>/g)].map(m=>attrs(m[0])).find(a=>a.rel==='canonical');assert(canonical&&new URL(canonical.href).pathname===r.canonical_route,`Canonical mismatch ${id}`);
 assert(!source.includes('\u2014'),`Em dash ${id}`);if(mode==='review'){assert(/name="robots"[^>]*content="noindex/.test(source),`Review indexable ${id}`);assert(source.includes('Private review')&&source.includes('The scheduler sends real requests'),`Missing honest review banner ${id}`)}else assert(isApproved(r,approvals.pages?.[id],approvals.integrations),`Unapproved production route ${id}`);
 const perpage=new Set();for(const m of source.matchAll(/<figure\b[^>]*data-picture-id[^>]*>/g)){const a=attrs(m[0]),pid=a['data-picture-id'],slot=a['data-placement-id'];assert(!perpage.has(pid),`Repeated picture within ${id}: ${pid}`);perpage.add(pid);used.set(pid,(used.get(pid)||0)+1);renderedPlacements.add(`${id}/${slot}/${pid}`);assert(placements.some(p=>p.page_id===id&&p.picture_id===pid&&p.placement_id===slot),`Unreserved picture ${id}/${slot}/${pid}`)}
 for(const m of source.matchAll(/<(?:a|img|script|link|source)\b[^>]*>/g)){const a=attrs(m[0]),tag=m[0].slice(1).split(/[\s>]/)[0];for(const raw of [a.href,a.src,...(a.srcset||'').split(',').map(x=>x.trim().split(' ')[0])].filter(Boolean)){assert(raw!=='#',`Dead control ${id}`);if(/^(?:https?:|mailto:|tel:|data:)/.test(raw))continue;if(raw.startsWith('#')){assert(new RegExp(`id=["']${raw.slice(1)}["']`).test(source),`Missing anchor ${id}:${raw}`);continue}const u=new URL(raw,'https://local.invalid'),target=u.pathname;assert(!/^\/(services-2|blog-2|location)(\/|$)/.test(target),`Prototype link ${id}: ${target}`);let disk=path.join(out,target);const candidates=[disk,path.join(disk,'index.html')];if(target==='/404/')candidates.push(path.join(out,'404.html'));assert(candidates.some(c=>fs.existsSync(c)),`Missing ${tag} destination ${id}: ${raw}`)}}
 checks.push({id,file:f,pictures:perpage.size});
}
for(const p of placements){if(seen.has(p.page_id)&&pictures.find(i=>i.picture_id===p.picture_id)?.src)assert(renderedPlacements.has(`${p.page_id}/${p.placement_id}/${p.picture_id}`),`Resolved reservation omitted ${p.page_id}/${p.placement_id}/${p.picture_id}`)}
if(mode==='review'&&pictures.every(p=>p.src))assert(renderedPlacements.size===placements.length,'Complete image library must render every registered placement');
for(const error of imageReuseErrors(placements,routes))assert(false,error);
const eligible=routes.filter(r=>mode==='review'||isApproved(r,approvals.pages?.[r.page_id],approvals.integrations));for(const r of eligible)assert(seen.has(r.page_id),`Missing eligible output ${r.page_id}`);assert(seen.size===eligible.length,`Output count ${seen.size}, expected ${eligible.length}`);
if(mode==='release'&&eligible.length===0)assert(seen.size===0,'Empty approval registry leaked public routes');
fs.mkdirSync('evidence',{recursive:true});const report={mode,pages:seen.size,inventory:routes.length,placements:[...used.values()].reduce((a,b)=>a+b,0),pictures:used.size,errors,checks};fs.writeFileSync(`evidence/independent-${mode}-verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({mode,pages:seen.size,placements:report.placements,errors:errors.length}));if(errors.length){console.error(errors.slice(0,40).join('\n'));process.exitCode=1}
