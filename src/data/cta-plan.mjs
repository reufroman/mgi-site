import {byId,contextFor,requestHref} from './catalog.mjs';
const families=[
 {ids:['ST-020','ST-059','ST-060','ST-063'],equipment:'furnace'},
 {ids:['ST-021','ST-061','ST-062','ST-064'],equipment:'AC'},
 {ids:['ST-022','ST-065','ST-066','ST-067'],equipment:'heat pump'},
 {ids:['ST-023','ST-068','ST-069','ST-070'],equipment:'water heater'},
 {ids:['ST-024','ST-071','ST-072','ST-073'],equipment:'heat-pump water heater'},
 {ids:['ST-026','ST-074','ST-075','ST-076'],equipment:'mini split'},
];
const guidePaths={
 'ST-080':['ST-021','Compare AC services'], 'ST-081':['ST-023','Compare water-heater services'],
 'ST-045':['ST-020','Explore furnace services'], 'ST-046':['ST-021','Explore AC services'],
 'ST-047':['ST-022','Explore heat-pump options'], 'ST-048':['ST-023','Explore water-heater services'],
 'ST-049':['ST-025','Explore air-quality solutions'], 'ST-050':['ST-026','Explore mini-split options'],
 'ST-051':['ST-061','Explore AC repair'], 'ST-052':['ST-008','Explore rebate options'],
 'ST-053':['ST-022','Explore heat-pump options'], 'ST-054':['ST-059','Explore furnace repair'],
 'ST-055':['ST-020','Compare furnace services'], 'ST-056':['ST-024','Explore water-heater options'],
 'ST-057':['ST-026','Explore mini-split options'], 'ST-058':['ST-025','Explore air-quality solutions'],
};
const guideCopy={
 'ST-080':['Ready to compare your AC options?','Explore repair and replacement services. Ask which finding each option addresses and what the complete work includes.'],
 'ST-081':['Ready to compare your water-heater options?','Explore repair and replacement services. Bring the model, concern and hot-water needs to the conversation.'],
 'ST-045':['Still have a furnace question?','See repair, replacement and care options, then ask about the right visit for your furnace.'],
 'ST-046':['Need help with your cooling?','Explore AC repair, replacement and care before choosing the next visit.'],
 'ST-047':['Considering a heat pump?','See the options for the system you have or the change you are planning.'],
 'ST-048':['Hot-water problem or planned replacement?','See water-heater service options and ask about the right visit for your home.'],
 'ST-049':['Want help with the air in your home?','Describe the concern before choosing a product. Explore air-quality services and possible next steps.'],
 'ST-050':['Could a mini split fit your room?','Explore mini-split service options and ask what a project would need in your home.'],
 'ST-051':['Still dealing with weak cooling?','See what an AC repair visit may need to check, then ask MGI about service.'],
 'ST-052':['Planning a heat-pump project?','See the rebate checks to make for your equipment and utility account before counting on an incentive.'],
 'ST-053':['Want to explore a heat pump for your home?','Compare equipment fit, installation work and the questions to ask before choosing a system.'],
 'ST-054':['Need help with a furnace that will not start?','For furnace trouble without immediate danger, explore the repair visit before you request service.'],
 'ST-055':['Still weighing repair against replacement?','Compare the furnace service paths and bring your findings or quote to the next conversation.'],
 'ST-056':['Considering a heat-pump water heater?','Explore equipment fit, room needs and installation questions before choosing your new heater.'],
 'ST-057':['Ready to explore a mini-split project?','See the service options for your rooms, then ask what the project would include.'],
 'ST-058':['Want help with dust, dryness or stale air?','Explore air-quality services and describe the pattern before choosing a product.'],
};
const core={
 'ST-002':{heading:'Ready to talk with MGI?',body:'Tell us what your home needs. Ask about the service, visit terms and current availability.',label:'Schedule service'},
 'ST-005':{heading:'Need help choosing the right visit?',body:'Describe the problem or project. Ask MGI which service fits your next step.',label:'Schedule service'},
 'ST-006':{heading:'Want to check your address?',body:'Share your address and the work you need. The office can confirm coverage and current availability.',label:'Ask about a service visit'},
 'ST-007':{heading:'Want to talk through the project cost?',body:'Ask about your equipment plan and current financing options. Credit approval and lender terms apply.',label:'Ask about financing'},
 'ST-008':{heading:'Have a system in mind?',body:'Bring your utility account and equipment questions to MGI. Ask which current rebates may apply.',label:'Ask about rebates'},
 'ST-009':{heading:'Ready to check the next requirement?',body:'Share your utility account, equipment plan and rebate questions with MGI. A possible benefit still needs an eligibility check.',label:'Ask about rebates'},
 'ST-010':{heading:'Ready to ask about ongoing care?',body:'Check which equipment is covered, the visits included and current membership terms.',label:'Ask about membership'},
 'ST-011':{heading:'Need help getting to know your system?',body:'Bring your equipment details or service records. Ask about a first visit and the care your home may need.',label:'Plan a first service visit'},
 'ST-012':{heading:'Ready to put the answer to work?',body:'Choose the service that fits your concern, or call MGI to talk through the next step.',label:'Find the right service',href:'/services/'},
 'ST-013':{heading:'Have a question about your own system?',body:'A guide can help you prepare. For a concern at home, start with the relevant service.',label:'Explore service options',href:'/services/'},
};
/** One contextual body action per eligible page. No new actions on intake, Home or policies. */
export function ctaPlan(route,content){
 const contextual=contextFor(route);const service=contextual?.service||(route.family==='Service'?route:null);
 const base={afterSection:Math.min(1,content.sections.length-1),href:requestHref(route)};
 if(service){
  const equipment=families.find(f=>f.ids.includes(service.page_id))?.equipment;
  const local=contextual?' Confirm the work and availability at your address.':'';
  const serviceBase={...base,afterSection:Math.min(2,content.sections.length-1)};
  if(service.page_id==='ST-079')return {...serviceBase,heading:'Need urgent HVAC help?',body:'For HVAC trouble without immediate danger, call MGI to ask about current availability. A call does not confirm dispatch or an arrival time.',label:'Call for urgent HVAC help',href:'tel:+19702871673',showPhone:false};
  if(/Replacement|Installation/.test(service.name)){const financeParams=new URLSearchParams({service:service.name});if(contextual)financeParams.set('town',contextual.area.name.replace('HVAC Services in ',''));return {...serviceBase,heading:`Plan your new ${equipment||'system'}. Explore ways to pay.`,body:'Compare equipment options, the full project price and current financing choices.'+local+' Financing is subject to credit approval and lender terms.',label:'Book a replacement appointment',financingHref:'/financing/?'+financeParams.toString()};}
  if(/Maintenance/.test(service.name))return {...serviceBase,heading:'Ready to plan equipment care?',body:'Ask what the visit covers for your equipment and when service is available.'+local,label:'Schedule maintenance'};
  if(/Repair/.test(service.name))return {...serviceBase,heading:equipment?`Need help with your ${equipment}?`:'Need help with this problem?',body:`Describe what changed with your ${equipment||'equipment'}. Ask MGI about a repair visit.`+local,label:`Schedule ${equipment||'equipment'} repair`};
  if(['ST-025','ST-077','ST-078'].includes(service.page_id))return {...serviceBase,heading:'Want help with the air in your home?',body:'Describe dust, dryness or stale air before choosing a product.'+local,label:'Discuss indoor air quality'};
  return {...serviceBase,heading:`Need help with your ${equipment||'heating and cooling'}?`,body:'Tell MGI what is happening, or what you hope to change. Ask about the right service for your home.'+local,label:'Schedule service'};
 }
 if(route.family==='Area')return {...base,heading:`Ready to ask about a visit in ${route.name.replace('HVAC Services in ','')}?`,body:'Share your address and what your home needs. The office can confirm coverage, the service and availability.',label:'Ask about a service visit'};
 const guide=guidePaths[route.page_id];
 if(guide){const destination=byId(guide[0]);if(!destination)return null;return {...base,afterSection:route.family==='Article'?Math.min(4,content.sections.length-2):1,heading:guideCopy[route.page_id][0],body:guideCopy[route.page_id][1],href:destination.canonical_route,label:guide[1]};}
 if(core[route.page_id])return {...base,...core[route.page_id],afterSection:route.page_id==='ST-009'?null:base.afterSection};
 return null;
}
