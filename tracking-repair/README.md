# MGI paid tracking repair candidate, October 26, 2026

Status: PARTIAL, branch and local fixtures only. Nothing published or changed in Google Ads, GTM, ServiceTitan, DNS, or the live site. Reu's written approval is required for every live release. No actions deleted. Jesse owns the old contact-number decision.

Branch: `codex/mgi-paid-tracking-repair-2026-10-26`, source base `54800ce`.

This is a source candidate, not a deployable replacement for the current live overlay. The October 21 SMS overlay and Worker early-DNI behavior must be preserved when integrating. Existing publication hashes are NOT approval for this candidate. Do not deploy this checkout or run the older pure-source release instructions unchanged.

## Report

| Item | Before | After in this branch | Proof | Status |
|---|---|---|---|---|
| Click/source transport | Main-site widget opened independently of click cookie/link attribution; shim initialized before normalization | Allowed touch restored before shim initialization; current touch replaces stale cookie as a whole; denied/unset removes allowed marketing keys from hosting URL before shim loads; service/town/topic context retained | `src/data/paid-tracking-repair.mjs`, 13 unit/integration cases | Local pass; ServiceTitan persistence unknown |
| LP scheduler opening | LP sets ws-widget=open, shared component did not handle that flag | Queues widget open after init; no conversion on open | Same module and tests | Local pass |
| Form receipt | New site has the vendor scheduler, not a separately verified first-party form; old primary form tag inactive | One labeled mock form receipt and deduplicated fixture event; no live adapter enabled | `scripts/tracking-repair-fixture.mjs`, `evidence/local-test-results.json` | Local fixture pass; real conversion blocked |
| Booking completion | Saved provider completion contract unknown; opening is not completion | One labeled mock booking receipt; rejects failed/unlabeled receipts, duplicate/reload, denied consent, and live-host fixture use | `tests/paid-tracking-repair.test.mjs`, browser results | Local fixture pass; real conversion blocked |
| Website calls | ST DNI owns phone replacement; Google WCM replacement removed October 19; ST call imports need attention | Preserve ST number owner; do not resurrect competing Google WCM. Prepared import diagnosis/mapping plan; no phone-tap conversion | `actions.csv`, `gtm-change-spec.json` | Vendor/Ads receipt unknown; not fixed |
| New-site tags | GTM-5NWW55ZN, AW-621269572, GA4 G-D9DKKJM1MX | Only these destinations permitted in candidate spec; production event tags remain disabled pending verified labels/adapter | `gtm-change-spec.json` | Prepared, not applied |
| Old container | GTM-TVCMQD94 still executes | Three publicly deployed tags inventoried; full editable inventory unavailable | `old-site-shutdown.md` | Partial inventory; no pause/publish |
| Old contact number | Text 970-287-1673, button tel:9705915340 | Unchanged; decision assigned to Jesse | Previous live audit; shutdown plan | Awaiting Jesse |
| October 31 scheduler | Native storage/export contract unknown | October 26 vendor email and current official guides reviewed; migration guide received, exact tenant attribution answer absent | `scheduler-vendor-gate.md` | Unknown |

## What is deliberately not counted

Page view, phone tap, button click, form DOM submit, widget open/close, a thank-you URL, and an early provider analytics callback are not confirmed leads or completed bookings. A made-up gclid is not an eligible Google Ads click. The fixture does not send Google tags, call provider APIs, or create ServiceTitan records. It is not a repair acceptance receipt.

## Local verification

From this checkout:

```sh
node --test tests/paid-tracking-repair.test.mjs
node tests/paid-tracking-repair.browser.mjs
npm run check
npm run build
```

The browser test blocks every external origin. Review build is local and not publication. Final targeted suite: 39/39 pass (13 new repair cases plus existing consent, GTM, and disabled-completion cases). Browser fixture: 8 checks pass, zero external requests. Astro check: zero errors/warnings, 31 hints. Local review build: 750 pages, finalized as 749 governed routes. `evidence/` contains the exact logs and inspected desktop/phone captures. `test-plan.md` gives Reu the manual fixture and vendor acceptance steps.

The first broader run reproduced an existing base-branch test failure: its old assertion required Google's phone-number replacement despite the accepted October 19 ST-only replacement architecture. Two stale assertions in the consent/GTM tests now explicitly forbid the competing phone_conversion configuration and still require the AW base tag. No production call behavior was changed to make those assertions pass.

## Decision record and retrospective

- Fixed transport before vendor initialization because a correctly decorated link cannot repair a shim that already captured the wrong parent URL.
- Kept receipt adapters and Ads activation closed because no verified saved-receipt callback or supported replacement-scheduler attribution contract has been supplied.
- Did not restore Google website-call number replacement. The October 19 decision explicitly made ServiceTitan DNI the single phone-number owner; two replacers would recreate the conflict.
- Independent review caught initialization-order and preview-to-live leakage in the first candidate. The revised installer normalizes before loading and blocks vendor loading/navigation on local/review hosts. These checks belong in future scheduler changes.
- Final independent review rechecked the exact corrected helper/component and ran all 13 repair cases. Earlier context-loss and script-error coverage findings were corrected; no remaining material finding in that bounded review. This does not certify the vendor integration.
- Official Scheduler Preview creates actual appointments and excludes analytics sessions. It cannot serve as a harmless full-funnel test. Use local mocks now and a vendor-confirmed isolated tenant for provider tests.

## Handoff

Goal: repair new-site lead/call conversion acceptance, preserve attribution through migration, and retire only old-domain tag installations.

Current state: branch transport correction and local mock harness; GTM/Ads production configuration unchanged. Complete ServiceTitan/Google Ads repair is blocked on provider contracts, exact labels, full old-container access, and approvals.

Exact next action: Reu/ServiceTitan resolve the tenant-specific questions in `scheduler-vendor-gate.md`. Codex then implements and verifies the actual provider receipt adapter and exact GTM action mapping in this branch. Do not substitute a synthetic test gclid for an eligible-click acceptance test.

Environment: source worktree based on financing branch 54800ce; node_modules symlink reuses existing dependencies. No deploy command or provider submission run. Browser fixtures bind loopback only and close after automated checks. Root canonical controls were read, not rewritten.

What not to reopen: old-domain Google tag must be stopped at the old installation, not by disabling the shared AW-621269572/GA4 destination globally. Do not delete Ads actions or enable Google WCM alongside ST DNI.

Control reconciliation: Current state=Not updated in root Active-Work.md because Reu restricted changes to branch/test mode; this branch handoff records the candidate and unresolved gates. Trajectory=Not required, no production or provider milestone achieved. AGENTS=Not required, no durable instruction change.

Editorial: root MGI-Brand-Guide.md Chapters 11, 16, and 17 checked. Technical identifiers and source uncertainty retained. No customer-facing copy or operating promise changed.
