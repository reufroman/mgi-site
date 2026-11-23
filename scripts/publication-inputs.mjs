import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {renderFingerprint} from '../src/data/render-fingerprint.mjs';
import {releasedReviewerAssets} from '../src/data/publication.mjs';
import {allRoutes,contentFor} from '../src/data/catalog.mjs';
import images from '../src/data/image-manifest.json' with {type:'json'};
import placements from '../src/data/placements.json' with {type:'json'};
import site from '../src/data/site.json' with {type:'json'};
export async function publicationInputs(origin){
 const used=new Set(placements.filter(p=>allRoutes.some(r=>r.page_id===p.page_id)).map(p=>p.picture_id));
 const pageContents=Object.fromEntries(allRoutes.map(r=>[r.page_id,contentFor(r)]));
 return {canonicalOrigin:origin,site,renderSourceHash:renderFingerprint().hash,
 financingComponentHash:crypto.createHash('sha256').update(await fs.readFile('src/components/FinancingJourney.astro')).digest('hex'),
 pageContents,reviewerAssetHashes:Object.fromEntries(await Promise.all(releasedReviewerAssets.map(async path=>[path,crypto.createHash('sha256').update(await fs.readFile('public'+path)).digest('hex')]))),
 pageHashes:Object.fromEntries(Object.entries(pageContents).map(([id,content])=>[id,crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex')])),
 imageHashes:Object.fromEntries(await Promise.all(images.filter(i=>used.has(i.picture_id)).map(async i=>[i.picture_id,crypto.createHash('sha256').update(await fs.readFile(i.source_file)).digest('hex')])))};
}
