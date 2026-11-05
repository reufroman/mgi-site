import routes from './routes.json' with {type:'json'};
const equipment={heating:'furnace','air-conditioning':'AC','heat-pumps':'heat pump','mini-splits':'mini split','water-heaters':'water heater','heat-pump-water-heaters':'heat-pump water heater','indoor-air-quality':'indoor air'};
const context={
 'Diagnosis and repair':'Share what changed, when it happens, and any findings you already have. Read what a service visit can help establish before choosing work.',
 'Repair versus replacement':'Start with the findings, repair options, and full scope of the work. Compare those details before deciding whether replacement fits.',
 'Care and maintenance':'See what a care visit covers, then bring your equipment details and questions. A useful plan starts with the system in your home.',
 'Design, installation and home fit':'Explore the service, then discuss your home, the equipment, and the work involved before choosing a system.',
 'Costs, quotes and choosing help':'Compare the proposed work, full price, and what is included. Explore the relevant service before deciding on your next step.',
 'Controls and operation':'Keep the model details and the behavior you noticed together. Explore service information if the answer needs a closer look at your equipment.',
 'Leaks, odors and noise':'Follow any safety steps in this guide first. Once the immediate concern is addressed, share the pattern you noticed and any prior findings.',
 'Safety and urgent help':'Follow the safety steps in this guide first. Once the immediate concern is addressed, explore the relevant service and share what responders or technicians found.',
 'Comfort and hot-water delivery':'Describe where the problem happens and when you notice it. Explore the service before deciding what your home needs.',
 'Incentives, permits and warranties':'Keep the equipment details, written terms, and open questions together. Explore the service before choosing the work.',
 'Air quality, filtration and humidity':'Start with the concern in your home and what has already been checked. Explore the service before choosing equipment.',
 'Energy use and bills':'Keep your bills, equipment details, and the changes you noticed together. Explore the service before deciding what work may help.'
};
export function presentationFor(answer,library){
 const slug=answer.sourceId==='MGI-005'?'furnace-repair':answer.reviewState.primary_service_slug;
 const service=routes.find(r=>r.family==='Service'&&r.canonical_route===`/services/${slug}/`);
 if(!service)throw Error('Missing contextual service for '+answer.sourceId);
 const name=equipment[answer.topicId];
 const urgent=answer.category==='Safety and urgent help';
 const heading=urgent?'After the immediate concern, plan the next step.':answer.category==='Care and maintenance'?`Make a care plan for your ${name}.`:answer.category==='Repair versus replacement'?'Understand the options before choosing the work.':`Get help with your ${name}.`;
 const related=library.filter(g=>g.sourceId!==answer.sourceId&&g.topicId===answer.topicId).sort((a,b)=>Number(b.category===answer.category)-Number(a.category===answer.category)||a.sourceId.localeCompare(b.sourceId)).slice(0,3).map(g=>g.pageId);
 const result={category:answer.topicLabel,urgent,cta:{heading,body:context[answer.category]||'Explore the service and bring the questions that matter to your home.',label:`Explore ${service.name.toLowerCase().replace(/^ac /,'AC ').replace(/^hvac /,'HVAC ')}`,pageId:service.page_id,note:''},related};
 if(answer.sourceId==='MGI-001')return {...result,category:'Furnace safety',cta:{heading:'After the emergency response, get help with the furnace.',body:'Once the immediate hazard has been addressed, share what the responders found and what you noticed. Explore MGI’s furnace repair service for the next step in checking your equipment.',label:'Explore furnace repair',pageId:'ST-059',note:'Follow the responders’ instructions about returning home and using the furnace.'}};
 return result;
}
