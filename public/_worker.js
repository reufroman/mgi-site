// src/worker-lib.mjs
var HOST = "mgiheatingandair.com";
var VENDOR = "https://static.servicetitan.com/marketing-ads/dni.js";
var EXCLUDED = /^\/(?:privacy-choices(?:\/|$)|schedule-service)/;
var EARLY_START = "(function(w,d){var K='mgi_click';function refused(){try{return w.navigator.globalPrivacyControl===true||w.localStorage.getItem('mgi-optional-tracking')==='off'||w.localStorage.getItem('mgi-lp-call-measurement-v1')==='denied';}catch(e){return true;}}function clearClick(){try{if(/(?:^|;\\s*)mgi_click=/.test(d.cookie))d.cookie=K+'=; Max-Age=0; Path=/; SameSite=Lax; Secure';}catch(e){}}function keep(k,v){return typeof v==='string'&&v.length>0&&v.length<=200&&(k==='gclid'||k==='gbraid'||k==='wbraid'||/^utm_[a-z_]{1,20}$/.test(k));}function persistClick(){try{var q=w.location.search.replace(/^\\?/,''),o={},n=0,a=q?q.split('&'):[],i,kv,k,v;for(i=0;i<a.length;i++){kv=a[i].split('=');try{k=decodeURIComponent(kv[0]);v=decodeURIComponent(kv[1]||'');}catch(e){continue;}if(keep(k,v)&&!o.hasOwnProperty(k)){o[k]=v;n++;}}if(n){d.cookie=K+'='+encodeURIComponent(JSON.stringify(o))+'; Max-Age=7776000; Path=/; SameSite=Lax; Secure';return;}var m=d.cookie.match(/(?:^|;\\s*)mgi_click=([^;]*)/);if(!m)return;var c=JSON.parse(decodeURIComponent(m[1])),p={},z=0;if(!c||typeof c!=='object')return;for(k in c){if(c.hasOwnProperty(k)&&keep(k,c[k])){p[k]=c[k];z++;}}if(z&&w.sessionStorage.getItem('st-dni-parameters')===null)w.sessionStorage.setItem('st-dni-parameters',JSON.stringify(p));}catch(e){}}if(refused()){clearClick();return;}if(w.__mgiStDniStarted)return;w.__mgiStDniStarted=true;w.__mgiStDniEarly=true;persistClick();w.ServiceTitanDniObject='dni';w.dni=w.dni||function(){(w.dni.q=w.dni.q||[]).push(arguments);};w.dni.l=1*new Date();var s=d.createElement('script');s.async=true;s.src='" + VENDOR + "';s.setAttribute('data-mgi-dni-early','');var f=d.getElementsByTagName('script')[0];if(f&&f.parentNode){f.parentNode.insertBefore(s,f);}else{(d.head||d.documentElement).appendChild(s);}w.dni('init','722234149',{webformsTrackingEnabled:false});if(d.readyState==='loading'){d.addEventListener('DOMContentLoaded',function(){w.dni('load');},false);}else{w.dni('load');}w.addEventListener('storage',function(){if(refused()){clearClick();w.location.reload();}});})(window,document);";
function earlyStartTag() {
  return "<script data-mgi-dni-early-start>" + EARLY_START + "<\/script>";
}
function usVisitor(request) {
  return new URL(request.url).hostname === HOST && request.cf?.country === "US";
}
function eligible(request) {
  const url = new URL(request.url);
  return url.protocol === "https:" && url.hostname === HOST && request.method === "GET" && !EXCLUDED.test(url.pathname) && usVisitor(request) && request.headers.get("sec-gpc") !== "1";
}
async function page(request, env) {
  if (!eligible(request)) return env.ASSETS.fetch(request);
  const headers = new Headers(request.headers);
  headers.delete("if-none-match");
  headers.delete("if-modified-since");
  const response = await env.ASSETS.fetch(new Request(request.url, { method: "GET", headers, redirect: "manual" }));
  if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) return response;
  const out = new Headers(response.headers);
  for (const name of ["Cache-Control", "CDN-Cache-Control", "Cloudflare-CDN-Cache-Control"]) out.set(name, "private, no-store, max-age=0");
  out.delete("ETag");
  out.delete("Content-Length");
  out.delete("Last-Modified");
  const uncached = new Response(response.body, { status: 200, headers: out });
  return new HTMLRewriter().on("head", { element(head) {
    head.prepend(earlyStartTag(), { html: true });
  } }).transform(uncached);
}
function region(request) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "CDN-Cache-Control": "no-store",
    "Cloudflare-CDN-Cache-Control": "no-store",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin"
  };
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...headers, Allow: "GET, HEAD" } });
  }
  const coloradoDefault = usVisitor(request);
  return new Response(request.method === "HEAD" ? null : JSON.stringify({ coloradoDefault }), { headers });
}
function handle(request, env) {
  const url = new URL(request.url);
  if (/^\/api\/measurement-region\/?$/.test(url.pathname)) return region(request);
  return page(request, env);
}

// public/_worker.js
var worker_default = { fetch: (request, env) => handle(request, env) };
export {
  worker_default as default
};
