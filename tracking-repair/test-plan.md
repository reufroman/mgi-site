# Reu's safe tracking test

Nothing here authorizes a live submission. Exactly one labeled form and one labeled booking are prepared as LOCAL MOCKS. ServiceTitan test-tenant execution remains blocked until ServiceTitan confirms isolation, suppressed automation, and the supported receipt contract.

## Run the local form and booking now

1. Open a terminal in this branch checkout and run `node scripts/tracking-repair-fixture.mjs`.
2. Use a new browser session. Open `http://127.0.0.1:4346/?gclid=TEST-MGI-FORM-20261026&utm_source=google&utm_medium=cpc&utm_campaign=mgi_tracking_test`.
3. Click **Submit local test form** once. Expected label and receipt: `TEST-MGI-FORM-20261026`. Event: `mgi_form_confirmed`, marked test and fixture. Check that source=google, medium=cpc, and the exact synthetic gclid survive. No customer name, phone, address, or email is required.
4. Open `http://127.0.0.1:4346/?gclid=TEST-MGI-BOOKING-20261026&utm_source=google&utm_medium=cpc&utm_campaign=mgi_tracking_test` in the same session. Click **Confirm local test booking** once. Expected receipt: `TEST-MGI-BOOKING-20261026`; event `mgi_booking_confirmed`; dispatch=false and messages=false.
5. Repeat either click, then reload and repeat. No extra event for that receipt should appear. Turning fixture measurement off must suppress new event emission. Mock intake receipt remains distinct from measurement permission.
6. In browser Network, confirm only 127.0.0.1 requests. ServiceTitan and Google Ads must have NO new fixture records or conversions. This is the correct result, not a failure.
7. Stop the local server with Ctrl-C. Do not copy these fixture records or gclids into a production upload.

Automated equivalent: `node --test tests/paid-tracking-repair.test.mjs` then `node tests/paid-tracking-repair.browser.mjs`.

## Provider test after ServiceTitan confirms isolation

Owner: ServiceTitan supplies an isolated tenant or written confirmation of a supported nonproduction intake mode that cannot create a production job, reserve production capacity, or message anyone. Jesse verifies office automation suppression. Reu approves the exact test scope. A visible TEST label alone is insufficient.

1. Record tenant, scheduler ID/version, test URLs, suppression evidence, intended form/booking action IDs, exact timezone, and allowed test contact data. Use only Reu/Jesse-controlled contacts in the isolated environment. Do not invent a real person's identity or use a customer record.
2. Confirm no dispatcher assignment, dispatch-board job creation, customer SMS/email, abandoned-lead outreach, or capacity hold can occur. If any is unknown, stop before entering contact details or pressing Submit/Finish Booking.
3. Use two distinct synthetic transport IDs: `TEST-MGI-FORM-20261026` and `TEST-MGI-BOOKING-20261026`, with google/cpc/mgi_tracking_test UTMs. Mark each lead **TEST ONLY - DO NOT DISPATCH - DO NOT MESSAGE** in the vendor-supported test label/notes field. Submit each exactly once in the confirmed nonproduction mode.
4. In ServiceTitan, find the exact receipt by marker and timestamp. Check persistent receipt ID, form-versus-booking type, source/medium/campaign, exact click ID, scheduler ID, job/business-unit mapping, and test label. Confirm zero production jobs, assignments, messages, and held capacity. Do not infer success from a thank-you screen.
5. In GTM Preview of the unpublished candidate, check the selected completion event only after saved receipt, exactly once; correct hostname/container/AW destination; expected consent; no PII; no old tags. Preview itself is not a guarantee that Google receives nothing. Do not connect real conversion tags to fixtures. Keep any test conversion dispatch blocked or use a vendor-confirmed isolated Ads test setup.
6. In Google Ads afterward, synthetic gclid runs are expected to have no eligible attributed conversion. Check that no test event entered production goals or imports. If the provider offers validation-only uploads, capture the validation receipt without mutating production data. Do not retry or upload synthetic IDs as if they were real clicks.

## Separate real Google Ads acceptance gate

Synthetic gclid transport, GTM Preview, and a saved ST test lead cannot prove an Ads conversion. After isolation and real-path readiness, Reu must separately approve a genuine eligible-click acceptance method and any associated spend or production lead effects. No ad click or spend is authorized by this package.

Capture exact legitimate click identity privately, displayed and dialed tracking number for a call, persistent ST receipt/source, event/action ID, upload batch/time, accepted import result, and Ads conversion-time row. Verify one intended action and no duplicate primary counting. Retain rejected-row reasons. Reporting delay is unknown until vendor confirms it; inspect existing receipt at vendor-stated checkpoints rather than generating another lead. Do not equate API acceptance with click attribution.

## Important vendor limitation

ServiceTitan's [Test and preview your Scheduler](https://help.servicetitan.com/v1/docs/test-and-preview-your-scheduler), checked October 26, says Preview creates actual appointments and omits analytics sessions. It is not the isolated test mode required here. Do not press Finish Booking there for this test.
