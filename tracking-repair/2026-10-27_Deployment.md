# Paid-tracking release, October 27, 2026

Started under Reu's written approval in this conversation to deploy branch codex/mgi-paid-tracking-repair-2026-10-26, original commit 33913c4, and ship independent partial improvements. No old-container/site shutdown, Ads goal/campaign changes, ServiceTitan settings, numbers, DNS, spend, or messages are authorized.

Fresh Cloudflare API baseline: canonical deployment `2bd116ce-64e9-4924-9ed1-60616245b9f1`, URL `https://2bd116ce.mgi-heating-and-air.pages.dev`, hosting config hash `e67a0e2a09591b38ff620e1983267d59e4d3fe7cd9042d1116d3b1a86971a475`.

Original 39 checks and 8 local browser checks pass again. Added a narrow same-tab consent refresh because the frozen live consent bundle and newly compiled scheduler policy have separate instances; browser storage events do not fire in the writing tab. The extra regression test verifies that coordination. Local test display names now start TEST-CODEX; opaque receipt IDs stay stable for duplicate tests.

Release method: merge source branch locally, compile the scheduler module, then overlay only that module reference and its dependency graph on the verified current live artifact. Preserve SMS, financing, Worker, routes, consent/DNI, and all unrelated bytes. Do not deploy full source output.

## Result: partial improvement shipped

Source merged locally into Astro main at `279808529802ddad9ec613e8932f057a6dc19a3c`: approved 33913c4 plus narrow same-tab consent coordination. Cloudflare deployment **512841d4-d818-4867-8aad-a6cbf511982d**, published October 27 at 09:10:48 Mountain, serves https://mgiheatingandair.com. Immutable deployment URL: https://512841d4.mgi-heating-and-air.pages.dev. Previous deployment: **2bd116ce-64e9-4924-9ed1-60616245b9f1**. Hosting config hash unchanged. No DNS/domain/account/number/scheduler/Ads setting changed.

Deployment implementation and evidence live separately in `../../Website-Astro-Tracking-Release-2026-10-27/`, branch `codex/mgi-paid-tracking-release-2026-10-27`, evidence `evidence/tracking-2026-10-27/`.

## Verification and actual change

- Original 39 checks passed again; with added same-tab coordination case, 40/40 pass. Eight local browser fixture checks pass with zero external requests. Two additional production-origin overlay scenarios using actual candidate JavaScript and mocked provider requests pass for granted/denied consent.
- All 1,285 local baseline artifact files match the prior saved manifest. All 1,281 public baseline files match the prior deployment.
- Candidate changes exactly 741 inline scheduler script references and adds two modules. Reversing every script replacement reproduces its baseline HTML exactly. All unrelated existing assets, Worker, routes, consent/DNI bundle, SMS disclosure, and financing content remain identical. No fixture, document, or mock reporter deployed.
- Live sweep: 1,279 files matched initially; four requests returned HTTP 500. Exact targeted retry returned HTTP 200 and matching bytes for all four. All 1,283 public candidate files are accounted for. Four Cloudflare control files are not publicly served; their artifact hashes remain unchanged.
- Live visit with `?gclid=TEST_CODEX&utm_source=google&utm_medium=cpc` loaded the new module and vendor shim. Browser attribution held exact TEST_CODEX/google/cpc. Widget opened to Repair/Install/Maintenance. No contact details entered, no call placed, and no provider submission. Vendor persistence/export remains unknown.
- GTM-5NWW55ZN workspace 10 Preview connected. Existing GA4 base, explicit page_view, and ST DNI each fired once. Live version remains 9. No GTM tag edit or new publication: spec is review-only and its adapters/labels are null.
- Manual local fixture used names TEST-CODEX Form and TEST-CODEX Booking, stable receipt IDs, and gclid TEST_CODEX/google/cpc. One confirmed mock event per kind; dispatch=false, messages=false; Google Ads and ServiceTitan not contacted. Local server stopped afterward.
- MGI debug session stopped and preview pages closed. Removed only synthetic TEST_CODEX first-party attribution/session values in both test browsers. Privacy preferences unchanged. Live-widget and fixture screenshots saved and inspected; phone-size checks are local, not a claim of live mobile acceptance.

## Google Ads recheck, account 350-839-2399

| Action | Diagnostic after deployment | Last tag activity | Why not reactivated by this release |
|---|---|---|---|
| Form Submit Thank You Page - Main Site | Tag inactive | July 23, 2025 | No verified saved-form adapter or matching old-action snippet was activated |
| Schedule Service (main site) | Tag inactive | July 15, 2025 | Widget transport/opening is not saved-booking completion; completion contract remains unknown |
| Thank You Page Conversion | Tag inactive | October 2, 2025 | Legacy thank-you trigger not restored or repointed; page load is not saved receipt proof |
| 970-287-1673 - Main Site | Tag inactive | July 2, 2024 | No old phone conversion tag or competing Google number swap restored; ST completed-call receipt unknown |

Dates are tag activity, not last conversions. Underlying provider eligibility/export root causes remain unknown. Every conversion action/history/goal/bid/campaign/budget was preserved.

## Blockers and exact next steps

1. **GTM conversion activation: ServiceTitan then Codex.** Inspected spec, accessible workspace 10, live version, and successful Preview. File is not an importable export and has null form/booking adapters and labels. Need exact persistent success/receipt contract plus existing action ID/label definitions. Codex can then construct and verify real tags. Reu's approval is recorded; missing implementation inputs, not repeat approval, block activation. No empty or misleading GTM version published.
2. **Safe provider test: ServiceTitan/Jesse then Codex.** Both labeled mocks ran. Isolated provider intake with no real job, lead, reservation, or customer automation is not verified. Need vendor-confirmed isolation and saved receipt/export evidence. Do not use Scheduler Preview or production submissions to force a pass. TEST_CODEX is transport proof, not an eligible Ads click.
3. **Call imports: ServiceTitan then Codex.** Need exact eligibility and row-level accepted/rejected export receipt. Browser transport cannot repair a server import. No ST configuration or existing mappings/numbers changed.

Not shipped: mock pages/server/reporter, disabled GTM spec, any new conversion event tag, action retirement/repointing, or old-site shutdown. Only the actual scheduler runtime and its policy dependency were deployed. Old site/container and October 30 work were not inspected or modified in this release.

## Rollback, one command

```sh
node /Volumes/LNserver/Dropbox/Clients/MGI-Heating-Air/01_Projects/Website-Astro-Tracking-Release-2026-10-27/scripts/rollback-tracking.mjs
```

This rolls back only from 512841d4 to prior 2bd116ce, refuses to overwrite a newer deployment, verifies the resulting canonical ID, and records a receipt. Syntax checked, not executed. After rollback verify canonical ID, homepage/widget, SMS disclosure, and financing links. No GTM rollback needed because no version was published. No ServiceTitan data rollback occurs.

## Lessons, environment, and control reconciliation

Full source publication would remove accepted overlays. Exact artifact parity enabled the narrow repair. Keep source and deployment repos separate, retain the prior-deployment guard, and distinguish local receipt simulation from actual provider persistence/export/Ads attribution. Production transport improved; conversion acceptance did not close.

Control reconciliation: Current state=Updated root Active-Work.md; Trajectory=Updated root Project-Arc.md for transport milestone only; AGENTS=Not required. Root Brand Guide Chapters 11, 16, and 17 checked; no writing exception.

Operational exception: Tag Assistant's automatic browser-tool URL output exposed a preview authorization value. It was not saved to project files or repeated here. The MGI debug session was stopped and preview tabs closed. No account credential was entered or changed. Prior tool output cannot be erased; Reu may choose to reset new-container preview authorization separately.
