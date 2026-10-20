import {landingPages,landingPageEvidence} from './landing-pages.mjs';
export const landingById=Object.fromEntries(landingPages.map(page=>[page.pageId,page]));
export function landingContent(id){
 const page=landingById[id];if(!page)return null;
 return {eyebrow:page.service,title:page.title,summary:page.description,answer:page.lead,
 sections:[{heading:page.introTitle,body:page.intro},...page.choices.map(choice=>({heading:choice.title,body:choice.body})),{heading:'Prepare for the conversation',body:page.prepare.join(' ')},{heading:page.closeHeading,body:page.closeBody}],
 faqs:page.questions.map(item=>({question:item.q,answer:item.a})),ctaLabel:page.cta,
 reviewNotes:landingPageEvidence.claimHolds,sources:[landingPageEvidence.brandGuide,landingPageEvidence.websiteStandard,'02_Strategy/Proposals-&-Planning/2026-10-12_INTERNAL_MGI-Paid-Landing-Page-Plan.md']};
}
