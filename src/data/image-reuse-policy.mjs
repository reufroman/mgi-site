import policy from './image-reuse-policy.json' with {type:'json'};
export function imageReuseErrors(placements,routes){
 const byId=new Map(routes.map(r=>[r.page_id,r]));
 const uses=new Map();
 for(const p of placements){if(policy.relatedFamilies.includes(byId.get(p.page_id)?.family))continue;uses.set(p.picture_id,(uses.get(p.picture_id)||0)+1);}
 return [...uses].filter(([,count])=>count>policy.legacyMaxUsesOutsideRelatedFamilies).map(([id,count])=>`Photo reuse outside approved families exceeded ${id}: ${count}`);
}
