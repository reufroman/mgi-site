import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve('../..');
const library=JSON.parse(await fs.readFile('src/data/images.json','utf8'));
const generated=JSON.parse(await fs.readFile('src/data/generated-images.json','utf8').catch(()=>'{}'));
const reviews=JSON.parse(await fs.readFile('src/data/image-review.json','utf8').catch(()=>'{}'));
const manifest=[];
for(const i of library){
 const source=i.source_file?path.join(root,i.source_file):generated[i.picture_id]?.file;
 if(!source){manifest.push({...i,src:null});continue;}
 const {width,height}=await sharp(source).metadata();
 const widths=[480,720,960,1440].filter(w=>w<=width);if(!widths.length)widths.push(width);
 for(const w of widths)await sharp(source).resize({width:w,withoutEnlargement:true}).webp({quality:82}).toFile(`public/assets/${i.picture_id.toLowerCase()}-${w}.webp`);
 manifest.push({...i,source_file:source,src:`/assets/${i.picture_id.toLowerCase()}-${widths.at(-1)}.webp`,srcset:widths.map(w=>`/assets/${i.picture_id.toLowerCase()}-${w}.webp ${w}w`).join(', '),width,height,alt:reviews[i.picture_id]?.alt||i.scene,review:reviews[i.picture_id]||null,origin:'AI-generated illustrative home scene'});
}
await fs.writeFile('src/data/image-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Exported ${manifest.filter(i=>i.src).length} distinct source pictures; full scenes preserved`);
