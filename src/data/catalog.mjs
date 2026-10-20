import {landingContent} from './landing-content.mjs';
import {answerCategoryContent} from './answer-categories.mjs';
import {areaFamilyContent} from './area-family.mjs';
import {libraryAnswerById,libraryContent} from './answer-library.mjs';
import {localServiceFamilyContent} from './local-service-family-rollout.mjs';
import {serviceFamilyContent} from './service-family-rollout.mjs';
import {windsorACContent} from './windsor-ac-repair.mjs';
import {acRepairContent} from './ac-repair-standard.mjs';
import {hubPilotContent} from './family-pilot-hub.mjs';
import {familyPilotContent} from './family-pilot-services.mjs';
import {guideById,guideContent} from './homeowner-guides.mjs';
import {hubContent} from './homeowner-hub.mjs';
import {batchOneContent} from './audit-batch-one.mjs';
import routes from './routes.json' with {type:'json'};
import editorial from './editorial.json' with {type:'json'};
import images from './image-manifest.json' with {type:'json'};
import placements from './placements.json' with {type:'json'};
import approvals from './approvals.json' with {type:'json'};
import {isApproved} from './release.mjs';
export const buildMode=process.env.MGI_BUILD_MODE||'review';
if(!['review','release','public'].includes(buildMode))throw Error('Unknown MGI build mode');
export const review=buildMode==='review';
export const publicationMode=buildMode==='public';
export const allRoutes=routes;
export const pages=routes.filter(r=>review || publicationMode || isApproved(r,approvals.pages[r.page_id],approvals.integrations));
export const services=pages.filter(r=>r.family==='Service');
export const areas=pages.filter(r=>r.family==='Area');
export const articles=pages.filter(r=>r.family==='Article'&&!r.source_answer_id);
export const categories=pages.filter(r=>r.family==='Answer category');
export const byId=id=>pages.find(r=>r.page_id===id);
export const byPath=path=>pages.find(r=>r.canonical_route===path);
export const photo=(pageId,placementId)=>{const p=placements.find(p=>p.page_id===pageId && p.placement_id===placementId);const i=p&&images.find(i=>i.picture_id===p.picture_id);return p&&i?.src?{...p,...i}:null;};
export const photos=pageId=>placements.filter(p=>p.page_id===pageId).map(p=>photo(pageId,p.placement_id)).filter(Boolean);
export const baseContent=id=>editorial[id];
export function contextFor(route){
 if(route.family!=='Service-town candidate')return null;
 const tail=route.canonical_route.split('/').filter(Boolean).at(-1);
 const area=allRoutes.filter(r=>r.family==='Area').find(a=>tail.startsWith(a.canonical_route.split('/').filter(Boolean).at(-1)+'-'));
 if(!area)throw Error('Missing area parent '+route.page_id);
 const slug=tail.slice(area.canonical_route.split('/').filter(Boolean).at(-1).length+1);
 const service=allRoutes.filter(r=>r.family==='Service').find(s=>s.canonical_route===`/services/${slug}/`);
 if(!service)throw Error('Missing service parent '+route.page_id);
 return {area,service};
}
export function contentFor(route){
 if(route.family==='Campaign landing')return landingContent(route.page_id);
 if(route.family==='Answer category')return answerCategoryContent(route,editorial[route.page_id]);
 if(route.family==='Area'||route.page_id==='ST-006')return areaFamilyContent(route,editorial[route.page_id]);
 if(route.page_id==='SL-WIN-AC-REP')return windsorACContent(editorial['ST-061']);
 if(guideById[route.page_id])return {...guideContent(route.page_id),presentation:libraryAnswerById[route.page_id].presentation};
 if(libraryAnswerById[route.page_id])return libraryContent(route.page_id);
 if(route.page_id==='ST-012')return hubContent(editorial[route.page_id]);
 if(editorial[route.page_id])return serviceFamilyContent(route.page_id,acRepairContent(route.page_id,hubPilotContent(route.page_id,familyPilotContent(route.page_id,batchOneContent(route.page_id,editorial[route.page_id])))));
 const context=contextFor(route);
 return localServiceFamilyContent(route,context,contentFor(context.service));
}
export function relatedServices(route){
 const id=contextFor(route)?.service.page_id||route.page_id;
 const groups=[['ST-020','ST-059','ST-060','ST-063'],['ST-021','ST-061','ST-062','ST-064'],['ST-022','ST-065','ST-066','ST-067'],['ST-023','ST-068','ST-069','ST-070'],['ST-024','ST-071','ST-072','ST-073'],['ST-026','ST-074','ST-075','ST-076'],['ST-025','ST-077','ST-078']];
 const group=id==='ST-027'?['ST-063','ST-064','ST-067','ST-070','ST-073','ST-076']:id==='ST-079'?['ST-059','ST-061','ST-065','ST-068','ST-071','ST-074']:groups.find(g=>g.includes(id))||[];
 return services.filter(s=>s.page_id!==id&&group.includes(s.page_id));
}
/** @type {Record<string,{serviceId:string,safetyFirst?:boolean}>} */
export const articleIntent={
 'ST-051':{serviceId:'ST-061'}, 'ST-052':{serviceId:'ST-022'}, 'ST-053':{serviceId:'ST-022'},
 'ST-054':{serviceId:'ST-059',safetyFirst:true}, 'ST-055':{serviceId:'ST-020'},
 'ST-056':{serviceId:'ST-024'}, 'ST-057':{serviceId:'ST-026'}, 'ST-058':{serviceId:'ST-025'}, 'ST-080':{serviceId:'ST-021'}, 'ST-081':{serviceId:'ST-023'}
};
export const requestHref=(route)=>{let c=contextFor(route);let params=new URLSearchParams({service:c?.service?.name || (route.family==='Service'?route.name:byId(articleIntent[route.page_id]?.serviceId)?.name||''),town:c?.area?.name.replace('HVAC Services in ','') || (route.family==='Area'?route.name.replace('HVAC Services in ',''):'')});if(!['Service','Area','Service-town candidate'].includes(route.family)&&route.page_id!=='ST-001')params.set('topic',route.name);return '/schedule-service/?'+params.toString();};
