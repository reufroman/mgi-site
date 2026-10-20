import facts from './local-service-town-facts.json' with {type:'json'};
import routes from './routes.json' with {type:'json'};
import emergency from './audit-batch-one.json' with {type:'json'};
import {acRepairContent} from './ac-repair-standard.mjs';

// Presentation for private candidates only. This does not change release gates,
// prove local work, or establish that a service is available at an address.
export const localServiceRolloutIds=routes.filter(r=>r.family==='Service-town candidate'&&r.page_id!=='SL-WIN-AC-REP').map(r=>r.page_id);
const townFacts=new Map(facts.map(f=>[f.town,f]));
const clone=value=>structuredClone(value);
const danger='If you smell gas, leave the area. From a safe place, call 911 and your gas utility. Do not use switches or try to relight the furnace. If you suspect carbon monoxide, get outside to fresh air and call 911. For smoke or other immediate danger, leave the area and call 911 from a safe place.';
const questionByTown={
 Wellington:'Which Wellington permit path applies if equipment changes?',
 Greeley:'Can past Greeley permit records help with an equipment change?',
 Loveland:'What property rules should I check at The Lakes at Centerra?',
 Berthoud:'Who handles Berthoud permits and contractor licensing?',
 'Fort Collins':'What if a Fort Collins equipment project needs more than one trade?',
 Timnath:'How do Timnath permits separate AC, furnace, and water heater work?',
 Severance:'Which electric account should I check at a Severance home?',
 Longmont:'Does a Longmont address alone establish utility-program eligibility?',
 Boulder:'Who is named on a Boulder mechanical permit?',
 Erie:'What equipment details does an Erie HVAC permit ask for?',
 Frederick:'Who handles Frederick permits and inspections for installation?',
 Firestone:'What should a Firestone quote say about permit costs?',
 Thornton:'Which Thornton equipment changes are listed as permit work?',
 Broomfield:'How do I confirm the Broomfield permit category and timing?',
 Johnstown:'Does every Johnstown home have the same electric provider?',
 Dacono:'Who handles Dacono permits for equipment replacement?',
 Windsor:'Does a Windsor address tell me which replacement rebates apply?'
};
function localEvidence(fact,town,kind){
 const projectLead=kind==='maintenance'?'If care reveals a need for separate equipment work, keep that project and its cost separate. ':kind==='repair'?'If the proposed repair involves replacing equipment or changing its installation, check the separate project requirements. ':kind==='product'?'If you choose a product that changes installed equipment, confirm the separate project requirements. ':kind==='assessment'?'If the assessment leads to a proposed equipment change, confirm its scope before approving a separate project. ':'';
 return {
  heading:`A useful detail for your ${town} home.`,
  intro:'',
  body:projectLead+fact.propertyDetail,
  places:fact.places,
  sources:fact.sourceURLs.map(href=>({href,label:`${town} source: ${new URL(href).hostname.replace(/^www\./,'')}`}))
 };
}
function localFAQ(fact,kind){
 const preface=kind==='maintenance'?'A care visit does not approve a separate repair or equipment change. ':kind==='repair'?'These checks apply to a proposed equipment change; they do not mean every repair or urgent visit needs a permit. ':kind==='product'?'Confirm these checks only if the chosen product requires a separate equipment installation. ':kind==='assessment'?'An assessment does not approve a separate product or installation. ':'';
 return {question:questionByTown[fact.town],answer:preface+fact.propertyDetail};
}
function familyProfile(profile,service,town,context){
 const p=clone(profile);
 const subject=service.name.toLowerCase().replace(/\bac\b/g,'AC').replace(/\bhvac\b/g,'HVAC');
 const kind=p.kind||'repair';
 p.heroHeading=`${service.name} in ${town}. Make room for life at home.`;
 p.heroBody=`Looking for ${subject} in ${town}, CO? ${profile.heroBody} Ask whether your address and requested work can be served.`;
 p.preparationHeading=kind==='replacement'?`Plan your ${town} ${subject} project.`:kind==='maintenance'?`Before your ${town} ${subject} visit.`:kind==='assessment'?`Start your ${town} indoor air quality assessment with the concern.`:`What to share about ${subject} in ${town}.`;
 p.findingsHeading=kind==='replacement'?`Compare the full ${subject} project in ${town}.`:kind==='maintenance'?`Care and additional work at your ${town} home.`:kind==='assessment'?`Choose the next step for your ${town} home from the findings.`:`Understand the findings before choosing ${subject} in ${town}.`;
 p.quoteHeading=`What your ${town} ${subject} quote should explain.`;
 p.processHeading=`Your ${town} ${subject}, one clear step at a time.`;
 p.faqHeading=`${service.name} questions for ${town} homes.`;
 p.closeHeading=`Give your ${town} home a clear next step.`;
 p.cityBreadcrumb={name:town,href:context.area.canonical_route};
 return p;
}

/**
 * route: registered Service-town candidate; context: {area,service};
 * generalContent: effective content for context.service, including its standard.
 * Original technical bodies, FAQs, safety, links, and proof identities are retained.
 */
export function localServiceFamilyContent(route,context,generalContent){
 if(route.family!=='Service-town candidate'||route.page_id==='SL-WIN-AC-REP')return generalContent;
 if(!context?.area||!context?.service)throw Error(`Missing local service context: ${route.page_id}`);
 const town=context.area.name.replace(/^HVAC Services in /,'');
 const fact=townFacts.get(town);
 if(!fact)throw Error(`Missing checked town facts: ${town}`);
 const service=context.service;
 const common={
  ...generalContent,
  eyebrow:`Your ${town} home. Your question.`,
  sources:[...new Set([...(generalContent.sources||[]),...fact.sourceURLs])],
  reviewNotes:[...(generalContent.reviewNotes||[]),`Private local candidate adapted from ${service.page_id}; no release state or approval changed.`,fact.limitations,'Inherited reviews are general MGI proof, not verified local jobs. Shared technical answers support private review and do not establish earned local SEO differentiation.'],
  localEvidence:{town,checkedOn:fact.checkedOn,sourceURLs:fact.sourceURLs,limitations:fact.limitations,publicationGate:route.source_publication_gate,plannedPublicState:route.planned_public_state}
 };
 if(service.page_id==='ST-061'){
  const base=generalContent.acStandard?generalContent:acRepairContent('ST-061',generalContent);
  const copy=clone(base.acStandard);
  copy.heroHeading=`AC repair in ${town}. Get back to life at home.`;
  copy.heroBody=`Looking for AC repair in ${town}, CO? MGI Heating and Air helps find why your air conditioner stopped cooling and what needs fixing. Warm air, ice, or water leaks are reasons to ask about a check. Confirm whether your address and requested work can be served.`;
  copy.cityBreadcrumb={name:town,href:context.area.canonical_route};
  copy.recognitionHeading=`Before your ${town} AC repair visit.`;
  copy.technicalHeading=`What your ${town} AC symptoms can mean.`;
  copy.findingsHeading=`Repair or replace your AC in ${town}? Start with the findings.`;
  copy.findingsHeadingLines=[`Repair or replace your AC in ${town}?`,'Start with the findings.'];
  copy.findingsActionIntro=`Need help finding the problem? Ask about an AC repair visit at your ${town} address.`;
  copy.reviewHeading='What homeowners say about MGI AC repair.';
  copy.reviewIntro='';
  copy.processHeading=`Your ${town} AC repair, one clear step at a time.`;
  copy.faqHeading=`${town} AC repair questions.`;
  copy.close=`Let’s make room for life at your ${town} home.`;
  copy.closeBody=`Ask about the cooling problem at your ${town} address. With the agreed repair complete, get back to the moments you enjoy at home.`;
  copy.steps[0]=['Arrange the visit.','Share your address and cooling concern. The office confirms coverage, availability, charges, and visit details.'];
  copy.quickLinks=[{label:'AC symptoms',href:'#ac-symptoms'},{label:'Repair work and costs',href:'#price-examples-heading'},{label:'What happens next',href:'#ac-next-steps'}];
  copy.priceTransparency={...copy.priceTransparency,
   inclusionsHeading:`What your ${town} AC repair quote should explain.`,
   examplesHeading:`See the work behind a ${town} AC repair.`,
   examplesIntro:`AC repair costs in ${town} depend on the part, the equipment, and the work needed. These illustrative examples explain what a repair can include. Current prices are pending confirmation. Confirm the full price and any separate charges before approving work.`,
   exampleLabel:'Illustrative repair examples. They do not establish completed local work or a current price.',
   priceRange:'Price pending confirmation'
  };
  copy.localContext=localEvidence(fact,town,'repair');
  return {...common,title:`AC Repair in ${town}, CO`,summary:copy.heroBody,ctaLabel:base.ctaLabel,acStandard:copy,relevantReviews:base.relevantReviews,faqs:[...base.faqs,localFAQ(fact,'repair')]};
 }
 if(service.page_id==='ST-079'){
  const data=clone(emergency['ST-079']);
  data.title=`Emergency HVAC help in ${town}. Get back to life at home.`;
  data.summary=`No heat or no cooling at your ${town} home? For an equipment failure without immediate danger, call MGI to check address coverage, current availability, and visit charges.`;
  data.sections[0].heading=`What stopped working at your ${town} home?`;
  data.sections[1].heading=`Get your ${town} visit and charges clear.`;
  data.sections[3].heading=`Emergency HVAC call or regular service in ${town}?`;
  data.sections[4].heading=`Your ${town} HVAC repair, from call to completed work.`;
  data.processSteps[0]=['Call about urgent help.','Tell us your address and what stopped working. The office checks coverage, current availability, visit charges, and confirmation before you rely on a visit.'];
  data.close=`Call about urgent HVAC help at your ${town} home.`;
  data.closeBody='For heating or cooling failure without immediate danger, ask about the next available visit. With the agreed work done, get back to the moments that make a home.';
  data.faqHeading=`Emergency HVAC questions for ${town} homes.`;
  data.cityBreadcrumb={name:town,href:context.area.canonical_route};
  data.safetyText=danger;
  data.immediateDispatchPending=false;
  data.localContext=localEvidence(fact,town,'repair');
  return {...common,title:data.title,summary:data.summary,ctaLabel:data.label,emergencyStandard:data,batchOne:data,sections:data.sections,faqs:[...generalContent.faqs,localFAQ(fact,'repair')]};
 }
 if(!generalContent.familyStandard)throw Error(`Missing general family standard: ${service.page_id}`);
 const p=familyProfile(generalContent.familyStandard,service,town,context);
 p.localContext=localEvidence(fact,town,p.kind||'repair');
 return {...common,title:p.heroHeading,summary:p.heroBody,ctaLabel:p.label,familyStandard:p,faqs:[...generalContent.faqs,localFAQ(fact,p.kind||'repair')]};
}
