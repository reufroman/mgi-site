# Paid-tracking release, October 27, 2026

Started under Reu's written approval in this conversation to deploy branch codex/mgi-paid-tracking-repair-2026-10-26, original commit 33913c4, and ship independent partial improvements. No old-container/site shutdown, Ads goal/campaign changes, ServiceTitan settings, numbers, DNS, spend, or messages are authorized.

Fresh Cloudflare API baseline: canonical deployment `2bd116ce-64e9-4924-9ed1-60616245b9f1`, URL `https://2bd116ce.mgi-heating-and-air.pages.dev`, hosting config hash `e67a0e2a09591b38ff620e1983267d59e4d3fe7cd9042d1116d3b1a86971a475`.

Original 39 checks and 8 local browser checks pass again. Added a narrow same-tab consent refresh because the frozen live consent bundle and newly compiled scheduler policy have separate instances; browser storage events do not fire in the writing tab. The extra regression test verifies that coordination. Local test display names now start TEST-CODEX; opaque receipt IDs stay stable for duplicate tests.

Release method: merge source branch locally, compile the scheduler module, then overlay only that module reference and its dependency graph on the verified current live artifact. Preserve SMS, financing, Worker, routes, consent/DNI, and all unrelated bytes. Do not deploy full source output.

Deployment, GTM, live smoke results, blockers, and rollback receipt will be appended before closeout.
