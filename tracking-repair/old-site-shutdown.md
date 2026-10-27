# Old-site tracking shutdown, Friday October 30, 2026

Prepared only. No pause, publication, tag deletion, Ads action deletion, phone change, DNS change, redirect, or hosting cancellation performed. Reu's written OK must identify the exact package before publication. Jesse must resolve the contact-number mismatch independently.

## Verified deployed payload inventory

Read October 26 from `https://www.googletagmanager.com/gtm.js?id=GTM-TVCMQD94`, HTTP 200.

SHA-256: `147420680629b0d73bc866226e31f20ead7530c3c9f9572f32746273340c5897`. The lead independently fetched the same bytes and hash. Source compiled resource.version=5 is NOT a verified GTM published version number.

| Compiled tag ID | Workspace name | Type | Destination or purpose | Trigger | Deployed state |
|---|---|---|---|---|---|
| 4 | Unknown | Google tag | G-D9DKKJM1MX, shared Google tag GT-5NR38DF7 also routes to AW-621269572 | gtm.init, no hostname limit observed | In deployed payload |
| 5 | Unknown | Google tag | AW-18206778809, Google tag GT-55VC6ZNH | gtm.init, no hostname limit observed | In deployed payload |
| 3 | Unknown | Custom HTML | Two script elements including external loader s.ksrndkehqnwntyxlhgto.com/168604.js; purpose/owner unknown | gtm.js, no hostname limit observed | In deployed payload |

These are all three deployable tags in the inspected public resource. They are NOT a complete editable-workspace inventory. Paused/unpublished tags, workspace names, container owner, and exact published GTM version remain unknown. Current reu@localnerds.co Accounts list exposes GTM-5NWW55ZN and GTM-MKRDPHS, but does not expose GTM-TVCMQD94. Do not substitute the other legacy container.

The accessible Google tags list explicitly pairs G-D9DKKJM1MX, GT-5NR38DF7, and AW-621269572. The new site uses this same destination pair. AW-621269572 is not an additional explicit tag in the old compiled container; it can be reached through that shared Google tag. AW-18206778809 is the separate old Ads destination. Do not globally disable either account/destination or unlink the shared tag as a shortcut.

Live evidence from the preceding audit: old homepage and /contact-us/ send GA4 page_view and Ads requests to both 621269572 and 18206778809 after interaction. The old site's loader is delayed, so an initial static view is not a sufficient shutdown test. Hardcoded/other-loader coverage outside those pages is unknown.

## Pause order after approval

1. Reu/Jesse obtain owner access or a current authorized export for GTM-TVCMQD94. Record exact published version, full tag names, IDs, types, triggers, paused status, custom-loader purpose, and any unpublished changes. Stop if full inventory is unavailable. Do not call the inventory complete from public JavaScript alone.
2. Capture approved baseline: old homepage/contact/service page rendered HTML and requests after scrolling, WordPress/embed originals, exact old GTM version, new GTM live version, and new-site GA4/Ads/DNI behavior. Keep any export private and sanitized; never save credentials.
3. Jesse signs off on the intended contact number. Existing displayed 970-287-1673 versus button target 970-591-5340 is unresolved. No number substitution, forwarding change, or cancellation is in this package.
4. Reu gives written OK for the exact staged shutdown. In GTM-TVCMQD94 only, pause any additional old conversion-event tags found in the complete export first. Then pause Custom HTML tag 3, Ads Google tag 5 (AW-18206778809), and Google tag 4 (G-D9DKKJM1MX plus linked AW-621269572). Preserve all tag definitions and actions.
5. Preview the staged old-container change against old-domain pages. Check actual requests after scrolling and interactions. Confirm no old-container Google/Ads/custom-loader requests remain. Recheck mgiheatingandair.com still loads GTM-5NWW55ZN, receives GA4, sends expected AW-621269572 requests, and retains ST DNI and usable booking.
6. Publish exactly that approved OLD-container version only after the preview checks pass. Record timestamp, version, approver, and result. Do not include campaigns, budgets, conversion-goal changes, number cancellation, DNS, or hosting cancellation.
7. If old hardcoded snippets still send, stage removal of their exact old-domain embeddings and retest. Obtain written release approval for any additional site change. Remove the old GTM embed only after the approved paused-container result and rollback artifacts exist. Do not remove or pause the new site's container.
8. If the broader October 30 shutdown includes redirects/DNS/hosting, prepare that as a separate release with exact route/query-preserving destinations and hosting rollback. Those changes are not prepared or authorized by this tracking package. Keep receiving intake usable until replacement acceptance is proven.

## Rollback

Exact pre-shutdown GTM version: UNKNOWN, must be captured in step 1. Never invent a version number or use GTM-MKRDPHS.

- Before publication: abandon only the staged shutdown changes in its isolated workspace. Preserve any unrelated workspace changes.
- After an approved old-GTM publication: republish the recorded pre-shutdown GTM-TVCMQD94 version. Recheck original tag requests on old pages after interaction.
- If the old embed or hardcoded snippets were separately changed: restore their exact approved original bytes and prior old-site deployment/configuration. Record both rollback stages.
- Independently check GTM-5NWW55ZN and shared AW-621269572/GA4 still function on the new domain.
- Stop and use the approved rollback if the wrong container/shared destination is affected, tracking disappears from the new site, or intake becomes unusable. No website or number may be taken down to force tracking acceptance.

## Sources and ownership

- Public old container URL above, current Accounts UI https://tagmanager.google.com/#/home.
- New container: https://tagmanager.google.com/#/container/accounts/6002331876/containers/267474177.
- Accessible shared Google tag: https://tagmanager.google.com/#/container/accounts/6357674311/containers/253728694/workspaces/0/config.
- Reu: release approval and legacy-owner coordination. Jesse: contact-number decision and office readiness. Codex: staged implementation and independent verification after access. Actual old-container owner: unknown.
