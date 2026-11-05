import batch from './audit-batch-one.json' with {type:'json'};
import proof from './home-proof.json' with {type:'json'};
/** Effective base-page content is also the release approval hash input. Local candidates continue to use raw editorial records. */
export function batchOneContent(id,original){
 const selected=batch[id];if(!selected)return original;
 return {...original,title:selected.title,summary:selected.summary,answer:selected.summary,sections:selected.sections,faqs:selected.faqs.map(([question,answer])=>({question,answer})),ctaLabel:selected.label,
 sources:[...new Set([...original.sources,...selected.sections.map(s=>s.source).filter(Boolean)])],
 batchOne:selected,relevantReviews:proof.reviews.filter(r=>selected.sections.some(s=>s.review===r.name))};
}
