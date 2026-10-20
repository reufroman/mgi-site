import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {renderFingerprint} from '../src/data/render-fingerprint.mjs';
import {allRoutes,contentFor} from '../src/data/catalog.mjs';
import images from '../src/data/image-manifest.json' with {type:'json'};
import placements from '../src/data/placements.json' with {type:'json'};
import site from '../src/data/site.json' with {type:'json'};
export async function publicationInputs(origin){
 const used=new Set(placements.filter(p=>allRoutes.some(r=>r.page_id===p.page_id)).map(p=>p.picture_id));
 return {canonicalOrigin:origin,site,renderSourceHash:renderFingerprint().hash,
 pageHashes:Object.fromEntries(allRoutes.map(r=>[r.page_id,crypto.createHash('sha256').update(JSON.stringify(contentFor(r))).digest('hex')])),
 imageHashes:Object.fromEntries(await Promise.all(images.filter(i=>used.has(i.picture_id)).map(async i=>[i.picture_id,crypto.createHash('sha256').update(await fs.readFile(i.source_file)).digest('hex')])))};
}
