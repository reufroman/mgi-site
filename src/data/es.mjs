// Spanish (es) page set. Content comes from es-pages.json (see scripts/es-import.mjs).
import esPages from './es-pages.json' with {type:'json'};

export {esPages};

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
