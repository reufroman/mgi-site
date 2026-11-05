import {presentationFor} from './answer-presentation.mjs';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname,relative} from 'node:path';
import {createHash} from 'node:crypto';
import stableRoutes from './answer-routes.json' with {type:'json'};

const library='02_Strategy/Proposals-&-Planning/2026-10-06_INTERNAL_MGI-Answer-Library';
function projectRoot(){
 let candidate=resolve(process.cwd());
 while(!existsSync(resolve(candidate,library,'Professional-Review-Queue.csv'))){
  const parent=dirname(candidate);
  if(parent===candidate)throw new Error('MGI answer library not found');
  candidate=parent;
 }
 return candidate;
}
const root=projectRoot();
function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(field);field='';}
  else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
  else field+=c;
 }
 if(quoted)throw Error('Unclosed CSV quotation');
 if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
 const [keys,...values]=rows;
 return values.filter(value=>value.some(Boolean)).map(value=>Object.fromEntries(keys.map((key,index)=>[key,value[index]??''])));
}
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function inlineAnswerMarkdown(value){
 let result='',cursor=0;
 const pattern=/\[([^\]]+)\]\((https:\/\/)|\*\*([^*]+)\*\*/g;
 for(const match of value.matchAll(pattern)){
  if(match.index<cursor)continue;
  let end=match.index+match[0].length,href='';
  if(match[1]){
   // Source manuals can contain literal balanced parentheses in filenames.
   // The Markdown delimiter is the closing parenthesis at depth zero.
   const start=end-match[2].length;let depth=1,index=start;
   for(;index<value.length;index++){
    const char=value[index];
    if(/\s/.test(char))break;
    if(char==='(')depth++;
    if(char===')'&&--depth===0)break;
   }
   if(depth!==0)continue;
   href=value.slice(start,index);end=index+1;
  }
  result+=escape(value.slice(cursor,match.index));
  result+=match[1]?`<a href="${escape(href)}" rel="noreferrer">${escape(match[1])}</a>`:`<strong>${escape(match[3])}</strong>`;
  cursor=end;
 }
 return result+escape(value.slice(cursor));
}
// Only the library's bounded Markdown syntax is rendered; source HTML is escaped.
export function renderAnswerMarkdown(value){
 return value.trim().split(/\n\n+/).filter(Boolean).map(block=>{
  if(/^## [^\n]+$/.test(block))return `<h2>${inlineAnswerMarkdown(block.slice(3))}</h2>`;
  const lines=block.split('\n');
  if(lines.every(line=>line.startsWith('- ')))return '<ul>'+lines.map(line=>`<li>${inlineAnswerMarkdown(line.slice(2))}</li>`).join('')+'</ul>';
  if(lines.every(line=>line.startsWith('|'))){
   const cells=line=>line.replace(/^\|\s*|\s*\|$/g,'').split('|').map(cell=>cell.trim());
   if(lines.length<3||!cells(lines[1]).every(cell=>/^:?-{3,}:?$/.test(cell)))throw Error('Unsupported table syntax');
   const headers=cells(lines[0]);
   const rows=lines.slice(2).map(cells);
   if(rows.some(row=>row.length!==headers.length))throw Error('Uneven answer table');
   return '<div class="answer-table"><table><thead><tr>'+headers.map(cell=>`<th scope="col">${inlineAnswerMarkdown(cell)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>`<td>${inlineAnswerMarkdown(cell)}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';
  }
  if(/^#{1,6} |^> |^```|^\|/m.test(block))throw Error('Unsupported answer body markup');
  return `<p>${inlineAnswerMarkdown(block)}</p>`;
 }).join('\n');
}
const topics={
 'Furnaces and heating controls':['heating','Heating'],
 'Air conditioning':['air-conditioning','Air conditioning'],
 'Space-conditioning heat pumps':['heat-pumps','Heat pumps'],
 'Ductless mini splits':['mini-splits','Mini splits'],
 'Water heaters':['water-heaters','Water heaters'],
 'Heat-pump water heaters':['heat-pump-water-heaters','Heat-pump water heaters'],
 'Indoor air quality':['indoor-air-quality','Indoor air quality'],
};
const legacy={
 'MGI-043':{pageId:'ST-082',route:'/answers/find-furnace-filter/'},
 'MGI-005':{pageId:'ST-083',route:'/answers/repair-before-replacement/'},
};
const plain=value=>value.replace(/\[([^\]]+)\]\(https:\/\/[^\s)]+\)/g,'$1').replaceAll('**','');
const queue=parseCSV(readFileSync(resolve(root,library,'Professional-Review-Queue.csv'),'utf8'));
const prepared=queue.map(reviewState=>{
 const sourcePath=relative(root,resolve(root,reviewState.draft_file));
 if(sourcePath.startsWith('..'))throw Error(`${reviewState.issue_id}: source outside project`);
 const bytes=readFileSync(resolve(root,sourcePath));
 const sourceHash=createHash('sha256').update(bytes).digest('hex');
 if(sourceHash!==reviewState.draft_sha256)throw Error(`${reviewState.issue_id}: queue/source hash mismatch`);
 const sourceMarkdown=bytes.toString('utf8');
 const match=sourceMarkdown.match(/^# (.+)\r?\n\r?\n([\s\S]+)$/);
 if(!match)throw Error(`${reviewState.issue_id}: missing title or answer body`);
 const [,title,body]=match;
 const topic=topics[reviewState.service_family];
 if(!topic)throw Error(`${reviewState.issue_id}: unmapped service family`);
 const opening=plain(body.split(/\n\n+/)[0]);
 const summary=opening.length>240?opening.slice(0,237).replace(/\s+\S*$/,'')+'…':opening;
 return {sourceId:reviewState.issue_id,title,topicId:topic[0],topicLabel:topic[1],category:reviewState.category,sourcePath,sourceHash,reviewState,opening,summary,sourceMarkdown,bodyHtml:renderAnswerMarkdown(body)};
});
const routeBySource=Object.fromEntries(stableRoutes.map(route=>[route.source_answer_id,route]));
export const libraryAnswers=prepared.map(answer=>{
 const stable=routeBySource[answer.sourceId];
 const identity=legacy[answer.sourceId]||(stable&&{pageId:stable.page_id,route:stable.canonical_route});
 if(!identity)throw Error(`${answer.sourceId}: stable route missing`);
 return {...answer,...identity};
});
if(libraryAnswers.length!==300||new Set(libraryAnswers.map(answer=>answer.sourceId)).size!==300||new Set(libraryAnswers.map(answer=>answer.route)).size!==300)throw Error('Answer inventory count, identity, or route collision');
for(const answer of libraryAnswers)answer.presentation=presentationFor(answer,libraryAnswers);
export const libraryAnswerById=Object.fromEntries(libraryAnswers.map(answer=>[answer.pageId,answer]));
export const generatedRoutes=stableRoutes;
export function libraryContent(pageId){
 const answer=libraryAnswerById[pageId];
 if(!answer)return undefined;
 return {eyebrow:'Homeowner answer',title:answer.title,summary:answer.summary,answer:answer.opening,sections:[],faqs:[],ctaLabel:'Explore service options',reviewNotes:[`${answer.sourceId}: Professional review: ${answer.reviewState.professional_review_status}. Public use: ${answer.reviewState.public_use_status}. Exact source approval required.`],sources:[answer.sourcePath],libraryAnswer:answer,presentation:answer.presentation};
}
