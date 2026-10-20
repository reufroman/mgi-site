import {pages, contentFor} from './catalog.mjs';
export const familyPrefixes = Object.freeze(['lp','services','local-hvac','answers','blog','service-area','about','contact','schedule-service','request-received','financing','vip-membership','new-homeowners','rebates']);
export function entryFamily(route){const prefix=route.canonical_route.split('/')[1];return familyPrefixes.includes(prefix)?prefix:'core';}
export function familyPaths(family,prefix){return pages.filter(route=>entryFamily(route)===family).map(route=>({params:{path:route.canonical_route.slice(prefix ? prefix.length+2 : 1,-1)||undefined},props:{route,content:contentFor(route)}}));}
