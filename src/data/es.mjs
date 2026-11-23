// Spanish (es) page set. Content comes from es-pages.json (see scripts/es-import.mjs).
import rawPages from './es-pages.json' with {type:'json'};
import site from './site.json' with {type:'json'};
import {offers,vipPlans,OFFER_END} from './holiday-specials.mjs';

// Facts the Spanish copy shares with English. Tokens like {{tuneUp}} in es-pages.json are
// filled from the same data the English pages use, so a change there changes Spanish too.
const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function spanishDate(english){
 const d=new Date(english+' 12:00 UTC');
 if(Number.isNaN(d.getTime()))throw Error(`Unreadable English date: ${english}`);
 return `${d.getUTCDate()} de ${months[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}
const amount=(text,label)=>{const m=String(text).match(/\$[0-9][0-9,]*/);if(!m)throw Error(`No dollar amount in ${label}: ${text}`);return m[0];};
const plan=id=>{const p=vipPlans.find(v=>v.id===id);if(!p)throw Error(`Missing VIP plan ${id}`);return p;};
const offer=id=>{const o=offers.find(v=>v.id===id);if(!o)throw Error(`Missing offer ${id}`);return o;};
function perUnit(unit,label){
 if(/a year/.test(unit))return 'al año';
 if(/a month/.test(unit))return 'al mes';
 throw Error(`Unknown price unit for ${label}: ${unit}`);
}
const standard=plan('standard-vip'),ductless=plan('ductless-vip');
export const esFacts=Object.freeze({
 phone:String(site.phone),
 offerEnd:spanishDate(OFFER_END),
 tuneUp:amount(offer('tune-up').figure,'tune-up offer'),
 humidifier:amount(offer('humidifier').figure,'humidifier offer'),
 vipStandard:`${standard.price} ${perUnit(standard.unit,'standard VIP')} o ${amount(standard.alt,'standard VIP monthly')} al mes, más ${amount(standard.detail,'standard VIP extra equipment')}`,
 vipDuctless:`${ductless.price} ${perUnit(ductless.unit,'ductless VIP')}`,
});
function fill(value){
 if(typeof value==='string')return value.replace(/\{\{(\w+)\}\}/g,(_,key)=>{if(!(key in esFacts))throw Error(`Unknown Spanish fact {{${key}}}`);return esFacts[key];});
 if(Array.isArray(value))return value.map(fill);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,fill(v)]));
 return value;
}
export const esPages=fill(rawPages);

// Office-hours wording per Jesse (Nov 20, 2026): Cinthia and Susanne share the phones,
// and Spanish callers are transferred to Cinthia. After-hours Spanish coverage is not confirmed,
// so the promise is limited to office hours.
export const spanishPhoneNote='Atención en español en horario de oficina.';

// Spanish pages stay out of search until the Spanish release is approved.
export const esIndexable=false;

export const esByPageId=id=>esPages.find(p=>p.pageId===id);
export const esByRoute=route=>esPages.find(p=>p.esRoute===route);
export const esForEnglishRoute=route=>esPages.find(p=>p.enRoute===route);
export const esHref=id=>esByPageId(id)?.esRoute;

// Top navigation, limited to pages that exist in Spanish.
export const esNavigation=[
 ['ST-079','Emergencias'],
 ['ST-007','Financiamiento'],
 ['ST-008','Reembolsos'],
 ['ST-010','Plan VIP'],
].filter(([id])=>esByPageId(id));

export const esServiceLinks=['ST-059','ST-061','ST-026','ST-027','ST-079'].filter(id=>esByPageId(id));

export function esStaticPaths(){
 return esPages.map(page=>({params:{path:page.esRoute==='/es/'?undefined:page.esRoute.replace(/^\/es\//,'').replace(/\/$/,'')},props:{page}}));
}
