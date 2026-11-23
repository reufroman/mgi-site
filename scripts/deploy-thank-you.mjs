import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { api, env, sha } from '../../Website-Astro-Tracking-Release-2026-10-27/scripts/cf.mjs';
const evidence = 'evidence/thank-you-2026-10-29';
const build = JSON.parse(await fs.readFile(evidence + '/overlay.json', 'utf8'));
const preflight = JSON.parse(await fs.readFile(evidence + '/deploy-preflight.json', 'utf8'));
const prior = JSON.parse(await fs.readFile('../Website-Astro-Tracking-Release-2026-10-27/evidence/tracking-2026-10-27/build.json', 'utf8'));
for (const [name, hash] of Object.entries(build.manifest || { ...prior.manifest, ...build.additionsManifest })) {
  if (sha(await fs.readFile(build.candidate + '/' + name)) !== hash) throw Error('Candidate drift: ' + name);
}
const before = await api();
if (before.canonical_deployment.id !== preflight.expectedDeployment || sha(JSON.stringify(before.deployment_configs)) !== preflight.configHash) throw Error('Production or hosting settings changed.');
if (!process.argv.includes('--publish')) throw Error('Explicit --publish required.');
const result = spawnSync('/Users/reubensmith/.npm-global/bin/wrangler', ['pages', 'deploy', path.resolve(build.candidate), '--project-name=mgi-heating-and-air', '--branch=main', '--commit-dirty=true'], { cwd: '/tmp', encoding: 'utf8', env: { ...process.env, CLOUDFLARE_API_TOKEN: env.CLOUDFLARE_PAGES_TOKEN, CLOUDFLARE_ACCOUNT_ID: env.CLOUDFLARE_ACCOUNT_ID }, maxBuffer: 4e6 });
const log = ((result.stdout || '') + (result.stderr || '')).replaceAll(env.CLOUDFLARE_PAGES_TOKEN, '[redacted]');
await fs.writeFile(evidence + '/deploy.log', log);
if (result.status !== 0) throw Error('Deployment failed; inspect sanitized deploy.log.');
const after = await api();
const receipt = { at: new Date().toISOString(), deployment: after.canonical_deployment.id, url: after.canonical_deployment.url, liveUrl: 'https://mgiheatingandair.com/booking-thank-you/', previousDeployment: preflight.expectedDeployment, configUnchanged: sha(JSON.stringify(after.deployment_configs)) === preflight.configHash, additions: build.additions, changed: build.changed || [], removed: build.removed || [], existingFilesPreserved: build.baselineFilesPreserved, conversionDispatch: 'inactive', schedulerRedirect: 'unchanged' };
await fs.writeFile(evidence + '/deployment.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt));
if (!receipt.configUnchanged || receipt.deployment === receipt.previousDeployment) throw Error('Deployment readback failed.');
