import pilot from './family-pilot-services.json' with {type:'json'};
import proof from './home-proof.json' with {type:'json'};
/** Only the three approved local pilot service routes receive this content.
 * Include the complete selected copy and evidence in the existing approval hash.
 * Request destinations are inherited; this module never confirms scheduling.
 */
export function familyPilotContent(id,original){
 const selected=pilot[id];
 if(!selected)return original;
 return {...original,title:selected.title,summary:selected.summary,answer:selected.summary,
  sections:selected.sections,faqs:selected.faqs.map(([question,answer])=>({question,answer})),ctaLabel:selected.label,
  sources:[...new Set([...original.sources,...selected.sections.map(section=>section.source).filter(Boolean)])],
  familyPilot:selected,
  relevantReviews:proof.reviews.filter(record=>selected.sections.some(section=>section.review===record.name))};
}
