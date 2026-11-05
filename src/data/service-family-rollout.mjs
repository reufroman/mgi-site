import repair from './repair-family-rollout.json' with {type:'json'};
import replacement from './replacement-family-rollout.json' with {type:'json'};
import maintenance from './maintenance-family-rollout.json' with {type:'json'};
import other from './other-service-family-rollout.json' with {type:'json'};
import editorial from './editorial.json' with {type:'json'};
import pilot from './family-pilot-services.json' with {type:'json'};
export const serviceProfiles={...repair,...replacement,...maintenance,...other};
export const serviceRolloutIds=Object.keys(serviceProfiles);
export function serviceFamilyContent(id,original){
 const profile=serviceProfiles[id];if(!profile)return original;
 const base=editorial[id];
 const faqs=['ST-059','ST-060','ST-063'].includes(id)?pilot[id].faqs.map(([question,answer])=>({question,answer})):base.faqs;
 return {...original,title:profile.heroHeading,summary:profile.heroBody,answer:base.answer,sections:base.sections,faqs,ctaLabel:profile.label,familyStandard:profile,sources:[...new Set([...base.sources,...original.sources])],reviewNotes:[...new Set([...base.reviewNotes,...original.reviewNotes])]};
}
