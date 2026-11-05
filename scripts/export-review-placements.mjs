import {allRoutes,contentFor,contextFor} from '../src/data/catalog.mjs';
const output=[];
for(const route of allRoutes.filter(r=>['Service','Service-town candidate'].includes(r.family))){const context=contextFor(route);for(const record of contentFor(route).relevantReviews||[])output.push({page_route:route.canonical_route,page_service:context?.service.name||route.name,page_town:context?.area.name.replace('HVAC Services in ','')||'',review:record});}
console.log(JSON.stringify(output));
