# Website assistant instructions

Follow the project root [AGENTS.md](../../AGENTS.md), [MGI Brand Guide](../../MGI-Brand-Guide.md), and [website standards](../../02_Strategy/Proposals-&-Planning/2026-10-07_INTERNAL_MGI-Website-Standards.md).

## Required review source

The [Google-to-ServiceTitan review proof bank](../Review-Proof-Register/README.md) exists for website assistants to use. Before selecting, adding, replacing, or attributing reviews, read its README and consult [Google-Review-Register.csv](../Review-Proof-Register/Google-Review-Register.csv).

- Only four- and five-star reviews are eligible for website use. Exclude one-, two-, and three-star reviews, and records with an unknown rating. Keep the complete internal archive intact.
- Select reviews by supported service work and the checked town of the actual service job. A Windsor AC Repair review needs evidence of AC repair at a Windsor service address before it can be labeled local proof. A customer match alone does not establish service or town relevance.
- Keep reviewer identity, customer/job association, completed work, job locality, permission, and Jesse's public-use approval separate. Preserve unresolved conflicts and the full meaning of mixed feedback. Do not invent quotations for rating-only records.
- Record human confirmations in [Review-Decisions.csv](../Review-Proof-Register/Review-Decisions.csv), and maintain [Website-Review-Placements.csv](../Review-Proof-Register/Website-Review-Placements.csv) when a page adds, removes, or changes review use.

The three current AC Repair quotations have linked Fort Collins jobs. They remain general MGI proof on the Windsor draft. A four- or five-star rating does not clear the existing association, service, locality, or approval holds. Use the bank during authorized page reviews, preserve accepted layouts, and obtain the required approval before publication.

## Spanish pages follow English

English is the source of truth. Each Spanish page under `/es/` pairs with one English page (`src/data/es-pages.json`), and the Spanish page must say the same thing.

- Prices, offer dates, VIP prices and the phone number reach Spanish through `{{tokens}}` filled in `src/data/es.mjs` from `site.json` and `holiday-specials.mjs`. Change them in the English data, never in Spanish copy.
- Lender links live in `src/data/lenders.mjs`; a test fails if they differ from the English `/financing/` page.
- `src/data/es-parity.json` records the English content each Spanish page was synced against. When an English paired page changes, `npm test` fails until the Spanish copy in `content/es/side-by-side/` is updated, `npm run es:import` is run, and `npm run build && npm run es:parity -- --record` records the new pair.
- Spanish copy changes need a Spanish-speaker read (Cinthia at MGI) before release.
