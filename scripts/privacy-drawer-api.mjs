import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const raw=await fs.readFile('/Users/reubensmith/.wrangler/config/default.toml','utf8');
const token=raw.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];if(!token)throw Error('Missing OAuth');
const account='363702344e039dfa71c7fbf1dd130d84';
export const base=`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/mgi-heating-and-air`;
export async function api(suffix=''){const r=await fetch(base+suffix,{headers:{Authorization:`Bearer ${token}`}});const j=await r.json();if(!j.success)throw Error(JSON.stringify(j.errors));return j.result;}
export const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
