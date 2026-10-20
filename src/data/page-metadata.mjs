// Search/share descriptions are separate from the approved reading layout.
// These overrides do not edit source answers, safety order, or visible headings.
const topicTitles={
 'ST-001':'Heating and Cooling Help in Northern Colorado',
 'ST-005':'Heating, Cooling, and Hot-Water Services',
 'ST-013':'Heating, Cooling, and Home Comfort Guides',
 'ST-002':'About MGI Heating and Air in Berthoud',
 'ST-003':'Contact MGI for Heating, Cooling, and Hot Water',
 'ST-004':'Request Heating and Cooling Service',
 'ST-006':'Northern Colorado Heating and Cooling Service Areas',
 'ST-011':'HVAC Guide for New Homeowners',
 'ST-012':'Heating, Cooling, and Hot-Water Answers'
};
const distinctSafetyDescriptions=new Set([
 'MGI-066','MGI-067','MGI-072','MGI-075','MGI-077','MGI-079',
 'MGI-082','MGI-093','MGI-098','MGI-099','MGI-100'
]);

export function pageMetadata(route,content){
 const title=topicTitles[route.page_id] || (route.family==='Service-town candidate'?`${route.name}, CO`:route.family==='Area'?`${route.name}, CO`:route.family==='Service'?route.name:route.family==='Article'&&!route.source_answer_id?route.name:content.title);
 let description=content.summary;
 if(route.family==='Service-town candidate') description=`${route.name}, CO: understand the work and your next steps. Confirm service at your address, visit terms, and availability with MGI.`;
 if(distinctSafetyDescriptions.has(route.source_answer_id)){
  const question=content.title.trim();
  description=`${question}${/[.!?]$/.test(question)?'':'.'} Read the safety-first guidance and next steps.`;
 }
 return {title,description};
}
