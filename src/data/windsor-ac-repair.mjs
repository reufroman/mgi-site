import local from './windsor-ac-repair.json' with {type:'json'};
import {acRepairContent} from './ac-repair-standard.mjs';
export function windsorACContent(original){
 const base=acRepairContent('ST-061',original);
 const sections=base.sections.map((section,index)=>{const slot=[0,3,4].indexOf(index);return slot<0?section:{...section,body:local.preparationBodies[slot]};});
 return {...base,sections,title:local.title,summary:local.summary,ctaLabel:local.ctaLabel,acStandard:{...base.acStandard,...local.acStandard,priceTransparency:{...base.acStandard.priceTransparency,examplesHeading:local.acStandard.priceExamplesHeading,examplesIntro:local.acStandard.priceExamplesIntro,exampleLabel:local.acStandard.priceExampleLabel,inclusionsHeading:local.acStandard.priceInclusionsHeading,inclusionsIntro:local.acStandard.priceInclusionsIntro,inclusionsLimit:local.acStandard.priceInclusionsLimit}},faqs:[...base.faqs,...local.localFAQs],sources:[...new Set([...base.sources,...local.sources])],reviewNotes:[...base.reviewNotes,...local.reviewNotes]};
}
