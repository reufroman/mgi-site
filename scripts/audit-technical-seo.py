#!/usr/bin/env python3
"""Audit every emitted governed page. This is not a Lighthouse score or release approval."""
import argparse, concurrent.futures, csv, hashlib, json, re
from collections import Counter, deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import urlopen
from urllib.error import HTTPError

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.elements=[]; self.stack=[]; self.title=[]; self.main=[]; self.schemas=[]; self.script=[]; self.in_schema=False
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs); self.elements.append((tag,attrs))
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}: self.stack.append(tag)
        if tag=='script' and attrs.get('type')=='application/ld+json': self.in_schema=True; self.script=[]
    def handle_endtag(self, tag):
        if tag=='script' and self.in_schema:
            self.schemas.append(json.loads(''.join(self.script))); self.in_schema=False
        if tag in self.stack: self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]
    def handle_data(self,data):
        if self.in_schema: self.script.append(data)
        if 'title' in self.stack: self.title.append(data)
        if 'main' in self.stack and not any(t in self.stack for t in ['script','style']): self.main.append(data)
    def find(self,tag,**attrs):
        return [a for t,a in self.elements if t==tag and all(a.get(k)==v for k,v in attrs.items())]
    def text(self): return re.sub(r'\s+',' ',' '.join(self.main)).strip()

parser=argparse.ArgumentParser();parser.add_argument('--evidence',default='evidence/technical-seo-2026-10-09');parser.add_argument('--out',default='dist-review');parser.add_argument('--origin',default='https://mgi.localnerds.co');parser.add_argument('--base');parser.add_argument('--label',default='final');args=parser.parse_args()
out=Path(args.out); evidence=Path(args.evidence);evidence.mkdir(parents=True,exist_ok=True)
routes=json.loads(Path('src/data/routes.json').read_text()); route_paths={r['canonical_route']:r for r in routes}; pages={};errors=[];rows=[];graph={};warnings=[]
def fail(id,check):errors.append({'id':id,'check':check})
for route in routes:
    id=route['page_id'];path=route['canonical_route'];file=out/path.lstrip('/')/'index.html'
    if not file.exists():fail(id,'missing output');continue
    source=file.read_text();page=Page(source);pages[id]=page
    canonical=page.find('link',rel='canonical');meta=page.find('meta',name='description');robots=page.find('meta',name='robots');title=''.join(page.title).strip();expected=urljoin(args.origin,path)
    if len(canonical)!=1 or canonical[0].get('href')!=expected:fail(id,'exact canonical origin/path/parameter agreement')
    if not title:fail(id,'title')
    if len(meta)!=1 or not meta[0].get('content','').strip():fail(id,'description')
    if len(page.find('h1'))!=1:fail(id,'one H1')
    if len(page.find('html',lang='en'))!=1:fail(id,'English document language')
    if len(page.find('meta',name='viewport'))!=1:fail(id,'viewport')
    if args.out.endswith('review') and (len(robots)!=1 or robots[0].get('content')!='noindex, nofollow'):fail(id,'review protection')
    if len(page.text().split())<25:fail(id,'substantive server-rendered main content')
    for property in ['og:title','og:description','og:type','og:url','og:image']:
        if len(page.find('meta',property=property))!=1:fail(id,property)
    ogurl=page.find('meta',property='og:url')
    if ogurl and ogurl[0].get('content')!=expected:fail(id,'share/canonical URL agreement')
    web=[node for schema in page.schemas for node in schema.get('@graph',[schema]) if node.get('@type')=='WebPage']
    if len(web)!=1 or web[0].get('url')!=expected:fail(id,'WebPage schema canonical agreement')
    if route['family']=='Article' and not any(node.get('@type') in ['Article','BlogPosting'] for s in page.schemas for node in s.get('@graph',[s])):fail(id,'article entity')
    trail=bool(page.find('nav',**{'aria-label':'Breadcrumb'}));breadcrumbs=[s for s in page.schemas if s.get('@type')=='BreadcrumbList']
    if args.label!='before' and trail and not breadcrumbs:fail(id,'visible breadcrumb schema')
    for breadcrumb in breadcrumbs:
        items=breadcrumb['itemListElement']
        if [i['position'] for i in items]!=list(range(1,len(items)+1)) or items[-1]['item']!=expected:fail(id,'breadcrumb positions/current URL')
        if any(urlsplit(i['item']).netloc!=urlsplit(args.origin).netloc for i in items):fail(id,'breadcrumb host')
    links=set()
    for tag,attrs in page.elements:
        if tag=='img' and 'alt' not in attrs:fail(id,'image without alt attribute')
        raw=[]
        if tag in ['a','link']:raw += [attrs.get('href')]
        if tag in ['img','script','source']:raw += [attrs.get('src')]
        if tag in ['img','source']:raw += [part.strip().split(' ')[0] for part in attrs.get('srcset','').split(',') if part.strip()]
        if tag=='meta' and attrs.get('property')=='og:image':raw += [attrs.get('content')]
        for value in filter(None,raw):
            url=urlsplit(urljoin(expected,value))
            if url.netloc!=urlsplit(args.origin).netloc or url.scheme not in ['http','https']:continue
            target=unquote(url.path); disk=out/target.lstrip('/')
            if not (disk.is_file() or (disk/'index.html').is_file()):fail(id,'missing internal destination '+value)
            if tag=='a' and target in route_paths:
                links.add(target)
                if url.fragment:
                    destination=source if target==path else (disk/'index.html').read_text()
                    if not re.search(r'\bid=["\']'+re.escape(url.fragment)+r'["\']',destination):fail(id,'missing destination fragment '+value)
    graph[path]=links
    description=meta[0].get('content','') if meta else ''
    rows.append({'page_id':id,'route':path,'family':route['family'],'canonical':canonical[0].get('href','') if canonical else '', 'title':title,'title_characters':len(title),'description':description,'description_characters':len(description),'main_sha256':hashlib.sha256(page.text().encode()).hexdigest(),'main_words':len(page.text().split()),'schema_types':','.join(node.get('@type','') for s in page.schemas for node in s.get('@graph',[s])),'internal_route_links':len(links),'http_status':'not requested','checks':'pending'})
for field in ['title','description','canonical']:
    for value,count in Counter(row[field] for row in rows).items():
        if count>1:fail('inventory','duplicate '+field+': '+value)
visited=set();pending=deque(['/'])
while pending:
    path=pending.popleft()
    if path in visited:continue
    visited.add(path);pending.extend(graph.get(path,set())-visited)
orphans=[r['canonical_route'] for r in routes if r['canonical_route'] not in visited and r['page_id'] not in ['ST-018','ST-019']]
for path in orphans:fail(route_paths[path]['page_id'],'not reachable from Home via server-rendered links')
if args.base:
    def request(row):
        try:
            with urlopen(args.base+row['route'],timeout=30) as response:status=response.status;html=response.read().decode()
        except HTTPError as exception:status=exception.code;html=exception.read().decode()
        row['http_status']=status
        if status!=200 or 'data-page-id="'+row['page_id']+'"' not in html:fail(row['page_id'],'HTTP identity/status')
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(request,rows))
    try:
        with urlopen(args.base+'/__seo_unknown_route__/',timeout=30) as response:fail('hosting','unknown route returned '+str(response.status))
    except HTTPError as exception:
        if exception.code!=404:fail('hosting','unknown route status '+str(exception.code))
if args.out.endswith('review'):
    if 'Disallow: /' not in (out/'robots.txt').read_text():fail('hosting','review robots protection')
    if '<loc>' in (out/'sitemap.xml').read_text():fail('hosting','review sitemap leakage')
    if 'X-Robots-Tag: noindex, nofollow' not in (out/'_headers').read_text():fail('hosting','review header protection')
failed={e['id'] for e in errors}
for row in rows:row['checks']='FAIL' if row['page_id'] in failed else 'PASS'
with (evidence/(args.label+'-pages.csv')).open('w',newline='') as file:
    writer=csv.DictWriter(file,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
summary={'artifact':args.out,'origin':args.origin,'http_base':args.base,'pages':len(rows),'automated_checks':'metadata, exact canonicals, renderable content, HTML language/heading/viewport, robots, schema, share fields, every internal link/fragment/asset, and Home discovery graph','errors':errors,'orphan_routes':orphans,'exact_main_duplicate_groups':sum(c>1 for c in Counter(r['main_sha256'] for r in rows).values()),'display_review_flags':{'titles_over_65_characters':sum(r['title_characters']>65 for r in rows),'descriptions_over_160_characters':sum(r['description_characters']>160 for r in rows)},'limitations':'Not a Lighthouse score, full editorial judgment, schema rich-result validation, field CWV, production hosting verification, or release approval.'}
(evidence/(args.label+'-summary.json')).write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:v for k,v in summary.items() if k not in ['errors','automated_checks','limitations']}));print('Errors:',len(errors));print(json.dumps(errors[:15],indent=2));raise SystemExit(bool(errors))
