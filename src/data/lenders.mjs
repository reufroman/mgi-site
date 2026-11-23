// Lender application links shown on the English /financing/ page (FinancingJourney.astro).
// The Spanish financing page reads this list. tests/es-pages.test.mjs fails if any link here
// is missing from the built English page, so a lender change in English has to land here too.
export const lenders = Object.freeze([
  {name: 'Synchrony', kind: 'card', apply: 'https://www.mysynchrony.com/mmc/S6247534900'},
  {name: 'Wells Fargo', kind: 'card', apply: 'https://retailservices.wellsfargo.com/ahapp/init-app?m=0030086276&l=en_US', faq: 'https://retailservices.wellsfargo.com/customer/faqs.html'},
  {name: 'Service Finance', kind: 'installment', apply: 'https://apply.svcfin.com/home/dealerAuthentication?id=900127069&key=1742219857', faq: 'https://www.svcfin.com/faqs'},
]);
