// Headline rebate total. Change this one value.
// Carrier Cool Cash ended Nov 20, 2026. The live total is 3033.
// The hero always keeps the financing half. Only the rebate dollar amount changes.
export const HEADLINE_REBATE_DOLLARS = 3033;

export const OFFER_END = 'December 30, 2026';
export const COOL_CASH_BUY_BY = 'November 20, 2026';
export const FINANCE_PLAN = '3442';
export const FINANCE_DISCLOSURE = 'Subject to credit approval. Equal monthly payments are required. See the Wells Fargo credit card agreement.';
export const scheduleHref = '/schedule-service/?' + new URLSearchParams({service: '', town: '', topic: 'Holiday specials'}).toString();

export const pending = Object.freeze({
  C: 'Ask us whether offers can be combined.',
});

const money = dollars => `$${dollars.toLocaleString('en-US')}`;

export function holidayHeadline(dollars = HEADLINE_REBATE_DOLLARS) {
  return `Up to ${money(dollars)} in Rebates + 0% Financing for 72 Months`;
}

export function financingSectionHeading(dollars = HEADLINE_REBATE_DOLLARS) {
  return `For homeowners buying a new system: 0% APR for 72 months and up to ${money(dollars)} in rebates`;
}

export function rebatePanelHeading(dollars = HEADLINE_REBATE_DOLLARS) {
  const timing = dollars === 5133 ? ' this week' : '';
  return `Up to ${money(dollars)} in rebates for a dual-fuel system in Windsor${timing}`;
}

export function windsorRebateLine(dollars = HEADLINE_REBATE_DOLLARS) {
  const amount = money(dollars);
  if (dollars === 5133) return `A dual-fuel system in Windsor can reach ${amount} this week.`;
  return `A dual-fuel system in Windsor can reach ${amount}.`;
}

export const rebateLines = Object.freeze([
  {id: 'pvrea-heat-pump', label: 'PVREA heat pump', amount: 1500, upTo: false, thisWeekOnly: false},
  {id: 'pvrea-dual-fuel', label: 'PVREA dual-fuel bonus', amount: 500, upTo: false, thisWeekOnly: false},
  {id: 'atmos-furnace', label: 'Atmos 95% furnace', amount: 500, upTo: true, thisWeekOnly: false},
  {id: 'thermostats', label: 'Atmos and PVREA smart thermostats', amount: 200, upTo: false, thisWeekOnly: false},
  {id: 'colorado-credit', label: 'Colorado heat pump credit', amount: 333, upTo: false, thisWeekOnly: false},
  {id: 'cool-cash', label: 'Carrier Cool Cash', amount: 2100, upTo: true, thisWeekOnly: true, detail: `Buy by ${COOL_CASH_BUY_BY}.`},
]);

export function activeRebateLines(dollars = HEADLINE_REBATE_DOLLARS) {
  return rebateLines.filter(line => dollars === 5133 || !line.thisWeekOnly);
}

export function rebateLineAmount(line) {
  return `${line.upTo ? 'Up to ' : ''}${money(line.amount)}`;
}

export function activeRebateTotal(dollars = HEADLINE_REBATE_DOLLARS) {
  return activeRebateLines(dollars).reduce((sum, line) => sum + line.amount, 0);
}

export function offerHeadline(offer, dollars = HEADLINE_REBATE_DOLLARS) {
  if (offer.id === 'rebates') return `Up to ${money(dollars)} in rebates for a qualifying new system`;
  return offer.headline;
}

export const offers = Object.freeze([
  {
    id: 'tune-up',
    name: '$99 furnace tune-up',
    headline: '$99 furnace tune-up, one per customer',
    subhead: 'Make room for company.',
    figure: '$99',
    body: `One furnace tune-up for $99. One per customer. It can be combined with the $150 humidifier offer. It runs through ${OFFER_END}.`,
    pending: [],
  },
  {
    id: 'humidifier',
    name: '$150 off a humidifier',
    headline: '$150 off a humidifier, installed',
    subhead: 'Call a truce with dry winter air.',
    figure: '$150 off',
    body: `$150 off a humidifier, installed. One per customer. It can be combined with the $99 furnace tune-up offer. It runs through ${OFFER_END}.`,
    pending: [],
  },
  {
    id: 'financing',
    name: 'Carrier financing',
    headline: '0% APR for 72 months, with equal payments, on approved credit',
    subhead: '',
    figure: '0% APR',
    body: `Carrier financing is 0% APR for 72 months with equal monthly payments, on approved credit. This is Wells Fargo plan ${FINANCE_PLAN}. ${FINANCE_DISCLOSURE}`,
    pending: [],
  },
  {
    id: 'rebates',
    name: 'Stacked rebates',
    headline: '',
    subhead: 'Stack the rebates your home qualifies for.',
    figure: 'Rebates',
    body: 'We stack every rebate the home qualifies for: the electric utility, the gas utility, Carrier, and the Colorado heat pump credit.',
    pending: [],
  },
  {
    id: 'vip-year',
    name: 'First year of VIP',
    headline: 'First year of VIP included with any new system',
    subhead: 'The gift that shows up twice.',
    figure: '1 year',
    body: 'The first year of VIP is included with any new system.',
    pending: [pending.C],
  },
  {
    id: 'no-heat',
    name: 'No-heat VIP visit',
    headline: '$69 diagnostic when you join VIP on a no-heat visit',
    subhead: 'No heat? Join VIP at the visit.',
    figure: '$69',
    body: `Join VIP at the visit and that day's diagnostic is billed at the $69 member rate. This offer runs through ${OFFER_END}.`,
    pending: [],
  },
  {
    id: 'referral',
    name: 'Refer a neighbor',
    headline: '$200 or $300 when a neighbor you refer buys a system',
    subhead: 'Your neighbor asked who you use.',
    figure: '$200 or $300',
    body: 'Refer a neighbor. You receive $200 when they buy a system from $10,000 to $19,999. You receive $300 when the system is $20,000 or more. The reward is paid after your neighbor signs, the system is installed, and they pay in full. There is no set payout timeline. Rewards are never tied to reviews.',
    pending: [],
  },
]);

export const vipPlans = Object.freeze([
  {
    id: 'standard-vip',
    name: 'Standard VIP',
    price: '$225',
    unit: 'a year',
    alt: 'or $20 a month',
    detail: 'Plus $89 for each extra piece of equipment.',
  },
  {
    id: 'ductless-vip',
    name: 'Ductless VIP',
    price: '$12',
    unit: 'a month',
    alt: 'Adjusted for extra indoor heads',
    detail: 'A home with a furnace and an air conditioner that adds a mini-split buys each membership. There is no bundle discount.',
  },
]);

if (![5133, 3033].includes(HEADLINE_REBATE_DOLLARS)) throw Error('HEADLINE_REBATE_DOLLARS must be 5133 through Nov 20, or 3033 from Nov 21');
if (activeRebateTotal(HEADLINE_REBATE_DOLLARS) !== HEADLINE_REBATE_DOLLARS) throw Error('Headline rebate total does not match the listed stack');

export function finePrint(dollars = HEADLINE_REBATE_DOLLARS) {
  const coolCash = dollars === 5133
    ? `Carrier Cool Cash of up to $2,100 is in this week's total when the equipment is bought by ${COOL_CASH_BUY_BY}.`
    : `Carrier Cool Cash of up to $2,100 had a buy-by date of ${COOL_CASH_BUY_BY}. It is not in the current headline total.`;
  return [
    `Offers run through ${OFFER_END}.`,
    'The $99 furnace tune-up is one per customer. It can be combined with the $150 humidifier offer.',
    'The $150 humidifier discount is one per customer and applies to a humidifier that MGI installs. It can be combined with the $99 furnace tune-up offer.',
    `Carrier financing is Wells Fargo plan ${FINANCE_PLAN}: 0% APR for 72 months with equal monthly payments. ${FINANCE_DISCLOSURE} Wells Fargo is a registered trademark of Wells Fargo & Company.`,
    'Rebate amounts vary by utility, equipment, and eligibility. Figures are up to the amounts shown. Check your utility before you count on a rebate. The Windsor dual-fuel example is not a quote for every home.',
    coolCash,
    'The first year of VIP included with a new system follows the VIP plan. After that year, standard VIP is $225 a year or $20 a month. Ask the office how renewal and cancellation work.',
    pending.C,
    `The $69 diagnostic rate applies when you join VIP during that no-heat visit. Repairs are quoted before any work. This offer runs through ${OFFER_END}.`,
    'Referral rewards are $200 when the neighbor buys a system from $10,000 to $19,999, and $300 at $20,000 or more. Jobs under $10,000 do not qualify. The reward is paid after the referred customer signs, the system is installed, and the customer pays in full. There is no set payout timeline. A reward is never tied to a review.',
    'Standard VIP is $225 a year, or $20 a month, plus $89 for each extra piece of equipment. Ductless VIP is $12 a month. The ductless price is adjusted for extra indoor heads. A home with a furnace and an air conditioner that adds a mini-split buys each membership. There is no bundle discount.',
  ];
}
