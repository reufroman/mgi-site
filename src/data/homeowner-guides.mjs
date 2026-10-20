import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const library='02_Strategy/Proposals-&-Planning/2026-10-06_INTERNAL_MGI-Answer-Library/';
// Astro bundles this module beneath dist-review/.prerender. Find canonical
// project input from the build working directory rather than bundle location.
function projectRoot(){
 let candidate=resolve(process.cwd());
 while(true){
  if(existsSync(resolve(candidate,'AGENTS.md'))&&existsSync(resolve(candidate,library,'Professional-Review-Queue.csv')))return pathToFileURL(candidate+'/');
  const parent=dirname(candidate);
  if(parent===candidate)throw new Error('MGI canonical answer library not found above build working directory');
  candidate=parent;
 }
}
const root=projectRoot();
const hash=value=>createHash('sha256').update(value).digest('hex');
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
// Deliberately bounded to the source answers' markup. No raw HTML is executed.
export function inlineMarkdown(value){
 let result='',cursor=0;
 const pattern=/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;
 for(const match of value.matchAll(pattern)){
  result+=escape(value.slice(cursor,match.index));
  result+=match[1]?`<a href="${escape(match[2])}" rel="noreferrer">${escape(match[1])}</a>`:`<strong>${escape(match[3])}</strong>`;
  cursor=match.index+match[0].length;
 }
 return result+escape(value.slice(cursor));
}
export function renderMarkdown(value){
 return value.split(/\n\n+/).filter(Boolean).map(block=>{
  if(block.split('\n').every(line=>line.startsWith('- ')))return '<ul>'+block.split('\n').map(line=>`<li>${inlineMarkdown(line.slice(2))}</li>`).join('')+'</ul>';
  if(/^#{1,6} |^> |^```|^\|/m.test(block))throw new Error('Unsupported answer body markup');
  return `<p>${inlineMarkdown(block)}</p>`;
 }).join('\n');
}
function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(field);field='';}
  else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
  else field+=c;
 }
 if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
 const [keys,...values]=rows;return values.map(value=>Object.fromEntries(keys.map((key,index)=>[key,value[index]??''])));
}
const queue=parseCSV(readFileSync(new URL(library+'Professional-Review-Queue.csv',root),'utf8'));
const definitions=[
 {pageId:'ST-082',sourceId:'MGI-043',sha256:'90c96be644bcd53faba509d3fb4423ac032b35360a9d413d94055e6de4110cc5',route:'/answers/find-furnace-filter/',summary:'Find the filter arrangement and make a useful equipment record. Learn where ordinary owner access ends.',action:{anchor:'start-with-records-and-ordinary-access',heading:'Still unsure where your filter is?',body:'See what a furnace care visit involves. Ask whether help identifying your installed filter arrangement is included.',label:'See furnace maintenance options',destination:'/services/furnace-maintenance/',destinationId:'ST-063',commitment:'Read service information. No appointment, diagnosis, or included filter-identification promise.'},related:{anchor:'equipment-record',label:'More help for a new homeowner',destination:'/new-homeowners/',destinationId:'ST-011',commitment:'Further reading.'}},
 {pageId:'ST-083',sourceId:'MGI-005',sha256:'641ca9ee50fe5d733939e71fabd134abf28307c6d6a0d2a6f452cf9ece20c2e9',route:'/answers/repair-before-replacement/',summary:'Ask for understandable findings and a repair path before weighing replacement. Age alone does not settle the choice.',action:{anchor:'build-the-repair-choice-around-your-actual-furnace',heading:'Start with the repair question',body:"Read what a furnace repair assessment needs to establish. Ask about the visit's price and scope before arranging it.",label:'Explore furnace repair',destination:'/services/furnace-repair/',destinationId:'ST-059',commitment:'Read repair information. No confirmed visit, repair outcome, second opinion, or price promise.'},related:{anchor:'when-should-replacement-enter-the-conversation',label:'Compare repair and replacement',destination:'/blog/repair-or-replace-furnace/',destinationId:'ST-055',commitment:'Further reading.'}}
];
const slug=value=>value.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');
function loadGuide(definition){
 const sourcePath=library+`Set-01/Answers/${definition.sourceId}.md`;
 const bytes=readFileSync(new URL(sourcePath,root));
 if(hash(bytes)!==definition.sha256)throw new Error(`${definition.sourceId}: accepted source changed; reconcile before build`);
 const approval=queue.find(row=>row.issue_id===definition.sourceId);
 if(!approval||approval.draft_sha256!==definition.sha256)throw new Error(`${definition.sourceId}: queue/source mismatch`);
 const sourceMarkdown=bytes.toString('utf8');
 const match=sourceMarkdown.match(/^# (.+)\n\n([\s\S]*)$/);
 if(!match)throw new Error('Missing answer title');
 const [,title,body]=match;
 const parts=body.trimEnd().split(/\n\n## /);
 const openingMarkdown=parts.shift();
 const sections=parts.map(part=>{const split=part.indexOf('\n\n');const heading=part.slice(0,split);return {heading,anchor:slug(heading),markdown:part.slice(split+2)};});
 const urgentParagraphs=[];
 for(const section of sections){
  section.markdown=section.markdown.split(/\n\n+/).filter(paragraph=>{
   if(/^If you smell gas now,|^If a carbon monoxide \(CO\) alarm sounds,/.test(paragraph)){urgentParagraphs.push(paragraph);return false;}return true;
  }).join('\n\n');
 }
 if(definition.sourceId==='MGI-005'&&urgentParagraphs.length!==2)throw new Error('Both unchanged safety paragraphs required');
 const last=sections.at(-1);const closingParts=last.markdown.split(/\n\n+/);const closingMarkdown=closingParts.pop();last.markdown=closingParts.join('\n\n');
 const parsedSections=sections.map(section=>({...section,html:renderMarkdown(section.markdown)}));
 const sourceLinks=[...sourceMarkdown.matchAll(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g)].map(match=>({label:match[1],href:match[2]}));
 const alternateAction=definition.sourceId==='MGI-043'?{body:'If the furnace has stopped heating or a new fault appeared, start with repair information.',label:'Explore furnace repair',destination:'/services/furnace-repair/',destinationId:'ST-059',commitment:'Reading only; no diagnosis or scheduled visit.'}:null;
 return {...definition,alternateAction,title,sourcePath,sourceMarkdown,sourceHash:definition.sha256,approval,reviewState:approval,openingMarkdown,openingHtml:renderMarkdown(openingMarkdown),sections:parsedSections,urgentParagraphs,urgentMarkdown:urgentParagraphs.join('\n\n'),urgentHtml:renderMarkdown(urgentParagraphs.join('\n\n')),closingMarkdown,closingHtml:renderMarkdown(closingMarkdown),sourceLinks,actions:[definition.action,definition.related,...(alternateAction?[alternateAction]:[])],reviewNotes:[`${definition.sourceId}: ${approval.editorial_review}. Professional review: ${approval.professional_review_status}. Public use: ${approval.public_use_status}. Named qualified reviewer and exact public application approval remain required.`]};
}
export const guideById=Object.fromEntries(definitions.map(definition=>[definition.pageId,loadGuide(definition)]));
export function guideContent(id){
 const guide=guideById[id];if(!guide)return undefined;
 return {eyebrow:'Homeowner guide',title:guide.title,summary:guide.summary,answer:guide.openingMarkdown,sections:guide.sections.map(section=>({heading:section.heading,body:section.markdown})),faqs:[],ctaLabel:guide.action.label,reviewNotes:guide.reviewNotes,sources:[guide.sourcePath,...guide.sourceLinks.map(link=>link.href)],homeownerGuide:guide};
}

export function qualifiedReviewer(guide){
 const state=guide.reviewState;
 return Boolean(state.reviewer_name?.trim()&&state.reviewer_qualifications?.trim()&&state.review_date?.trim()&&state.reviewed_sha256===guide.sha256&&state.decision==='Approved for the stated application');
}
