# October 31 scheduler attribution gate

Status: UNKNOWN. A migration-guide reply arrived; no tenant-specific answer proving click/source persistence or conversion export has arrived in the inspected thread. No email/support message sent by this task.

## Evidence checked October 26

- Chris Shumaker, **Move To Scheduling Pro Free**, received October 26 at 2:01 PM Mountain. Gmail thread/message `1a179cdd39cf6a3c`: https://mail.google.com/mail/u/0/#all/1a179cdd39cf6a3c. The email links the official migration guide. It does not answer the gclid/source/export questions below.
- [Migration guide](https://help.servicetitan.com/docs/migrate-your-scheduler-from-web-scheduler-2-0-to-scheduling-pro-free): existing scheduler snippet need not change; supported campaign/mapping settings are imported. Marketing Pro integration, Sessions API, and webhooks are listed as Premium features. None of this proves the MGI tenant's saved click fields or Ads export.
- The guide's timeline refers to September/October, while the October 26 MGI meeting identifies October 31. Exact tenant cutover date/time is therefore a vendor confirmation item, not settled by the generic article.
- [Test and Preview guide](https://help.servicetitan.com/v1/docs/test-and-preview-your-scheduler): creates actual appointments and does not log analytics sessions. It is unsuitable for a harmless conversion test.
- Previous native legacy-widget inspection found parent URL/referrer/client-ID transport and campaignAttributionContext in the booking path. October 26 navigation confirms labeled click/source fields reach the site's scheduling route. Neither establishes the replacement scheduler's persisted fields or export.

## Exact questions for ServiceTitan, prepared and unsent

1. For MGI's current scheduler 73995714-0241-4b8a-a89d-e81f8b1dfef6, confirm the migration target ID, Free/Premium entitlement, actual cutover timestamp/timezone, and whether existing snippet remains valid for this tenant.
2. Which gclid/gbraid/wbraid and UTM/source/medium/campaign fields are accepted, where are they passed (URL, request body, or supported API), and where can MGI inspect the exact persisted receipt values after migration? Does Free preserve paid-click attribution/export, distinct from Marketing Pro scheduler campaigns?
3. Give the exact supported saved-form and saved-booking completion/receipt contract. Are they distinct receipt types, or one native scheduler event? Which success signal occurs only after persistence? Which origin/frame/receipt ID can a website trust? Is a browser callback supported on Free?
4. Which existing Google Ads actions receive each provider event (Calls Conversion Action, Inbound Call - Website, Integrated Bookings, Booked Job Originated from Website)? What eligibility, duration/classification, consent, deduplication, and retry rules apply? Where is the row-level accepted/rejected export receipt?
5. How can we test one labeled form and one labeled booking in an isolated environment with no production job, dispatch, capacity hold, customer SMS/email, or abandoned-session outreach? Preview is documented as live intake and excludes analytics; provide a supported alternative.
6. How can we verify valid Ads matching without sending synthetic click IDs to production imports or creating duplicate browser/native conversions? Confirm expected reporting delay and the check schedule.

## Acceptance after the answer

Codex reviews the exact contract before implementing the live adapter in the branch. Reu approves any live activation in writing. ServiceTitan/Jesse verify isolation before test submission. Execute only the two labeled tests in `test-plan.md`; keep payloads private and report only nonsecret IDs, timestamps, action names, status, and sanitized field checks.

For each test, require: landing click/source values -> scheduler request -> persistent ServiceTitan receipt with the same values -> intended export action -> accepted import result -> attributed Ads conversion with a legitimate eligible click when separately authorized. Test each hop. A new scheduler UI, Connected badge, migration completion, or API HTTP 200 cannot close the chain.

If ServiceTitan confirms a Free-tier limitation, Reu chooses architecture and Mike approves any paid entitlement. Do not buy Premium, migrate, or change live mappings based on this document.
