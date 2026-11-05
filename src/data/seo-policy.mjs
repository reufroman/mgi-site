// One policy owns production canonical, robots, and sitemap decisions.
import {landingPages} from './landing-pages.mjs';
export const nonIndexPageIds = new Set(['ST-018', 'ST-019',...landingPages.map(page=>page.pageId)]);

export function productionOrigin(value) {
 let url;
 try { url = new URL(value); } catch { throw Error('Release blocked: valid production HTTPS origin required'); }
 const host = url.hostname.toLowerCase();
 if (url.protocol !== 'https:' || url.username || url.password || url.port ||
     url.pathname !== '/' || url.search || url.hash ||
     !host.includes('.') || /(?:^|\.)(?:localhost|localnerds\.co)$/.test(host) ||
     /\.(?:invalid|test|local|example)$/.test(host) || /^[\d.]+$/.test(host) || host.includes(':')) {
  throw Error('Release blocked: use the verified public HTTPS origin without a path, query, port, or review hostname');
 }
 return url.origin;
}

export function canonicalUrl(route, origin) {
 const path = route.canonical_route;
 if (!path.startsWith('/') || path.startsWith('//') || /[?#\\]/.test(path) ||
     !path.endsWith('/') || /\/{2}|\/(?:\.|\.\.)(?:\/|$)/.test(path)) {
  throw Error(`Invalid canonical route: ${route.page_id}`);
 }
 return new URL(path, origin).href;
}

export const robotsDirective = (route, review) =>
 review ? 'noindex, nofollow' : nonIndexPageIds.has(route.page_id) ? 'noindex, follow' : 'index, follow';

export function sitemapXml(routes, origin, review) {
 const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
 const urls = review ? [] : routes.filter(route => !nonIndexPageIds.has(route.page_id));
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  urls.map(route => `<url><loc>${escape(canonicalUrl(route, origin))}</loc></url>`).join('') + '</urlset>\n';
}

export function assertReleaseLinkClosure(documents, inventory, selected) {
 const governed = new Set(inventory.map(route => route.canonical_route));
 const emitted = new Set(selected.map(route => route.canonical_route));
 const errors = new Set();
 for (const [pageId, html] of documents) {
  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^\"]+)"/g)) {
   const href = match[1].replaceAll('&amp;', '&');
   if (!href.startsWith('/') || href.startsWith('//')) continue;
   const path = new URL(href, 'https://link-check.invalid').pathname;
   if (governed.has(path) && !emitted.has(path)) errors.add(`${pageId} links to an omitted route: ${path}`);
  }
 }
 if (errors.size) throw Error('Release blocked: approve or remove linked dependencies before launch\n' + [...errors].join('\n'));
}

export function assertRenderDependencies(selected) {
 const ids = new Set(selected.map(route => route.page_id));
 // These Home branches dereference services before Astro can render a page.
 const required = ids.has('ST-001') ? ['ST-025', 'ST-027', 'ST-059', 'ST-061'] : [];
 const missing = required.filter(id => !ids.has(id));
 if (missing.length) throw Error('Release blocked: Home rendering needs approved service dependencies: ' + missing.join(', '));
}

export function breadcrumbSchemaFromHtml(html, route, origin) {
 const nav = html.match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 if (!nav) return null;
 const decode = text => text.replace(/<[^>]*>/g, '').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10)))
  .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&nbsp;', ' ').trim();
 const items = [];
 for (const match of nav.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|<span\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/span>/g)) {
  const name = decode(match[2] || match[3] || '');
  if (name) items.push({ '@type': 'ListItem', position: items.length + 1, name,
   item: match[1] ? new URL(decode(match[1]), origin).href : canonicalUrl(route, origin) });
 }
 return items.length >= 2 ? { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items } : null;
}

export function pageSchema(route, metadata, origin, site) {
 const canonical = canonicalUrl(route, origin), home = new URL('/', origin).href;
 const organization = { '@id': `${home}#organization` };
 const page = { '@type': 'WebPage', '@id': `${canonical}#webpage`, name: metadata.title,
  url: canonical, description: metadata.description, inLanguage: 'en',
  isPartOf: { '@id': `${home}#website` }, about: organization };
 const graph = [page];
 if (route.page_id === 'ST-001') {
  graph.push({ '@type': 'WebSite', '@id': `${home}#website`, url: home, name: site.brand,
   inLanguage: 'en', publisher: organization });
  graph.push({ '@type': 'HVACBusiness', '@id': organization['@id'], name: site.brand,
   legalName: site.legalName, url: home, logo: new URL('/assets/mgi-badge.png', origin).href,
   address: site.postalAddress || site.address, ...(site.phoneApproval && site.phone ? { telephone: site.phone } : {}) });
 }
 if (route.family === 'Article') {
  graph.push({ '@type': route.source_answer_id ? 'Article' : 'BlogPosting',
   '@id': `${canonical}#article`, headline: metadata.title, description: metadata.description,
   mainEntityOfPage: { '@id': page['@id'] }, inLanguage: 'en' });
 }
 // No invented author, dates, ratings, hours, coverage, prices, or FAQ rich-result claims.
 return { '@context': 'https://schema.org', '@graph': graph };
}
