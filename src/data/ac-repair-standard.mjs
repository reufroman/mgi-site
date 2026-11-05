import priceTransparency from './ac-repair-price-transparency.json' with {type:'json'};
import reviews from './ac-repair-reviews.json' with {type:'json'};
export function acRepairContent(id,original){
 if(id!=='ST-061')return original;
 return {...original,
 title:'We repair your AC. Get back to life at home.',
 summary:'MGI Heating and Air helps find what stopped your cooling and what repair it needs, so you can get back to the moments you love at home.',
 ctaLabel:'Request AC repair',
 acStandard:{
 priceTransparency,
 visualStandard:{minimumPolaroids:5,preparationTitles:['When it changed','What you notice','Before the visit'],technicalTitles:['How heat moves','Why ice can form','What the fan is doing','A breaker that trips again'],photoCaptions:['A little time together.','Room for an unhurried afternoon.','More room for the good parts.','Keep a little time for each other.']},
 recognitionHeading:'What to share when you request AC repair.',
 recognitionBody:'Warm air, ice, or water can each point to a different problem. A symptom helps guide the checks; it does not identify the failed part.',
 findingsHeading:'Know what needs fixing before you approve the repair.',
 findingsActions:true,
 findingsActionIntro:'Need help finding the problem? Ask about an AC repair visit.',
 technicalHeading:'What your AC symptoms can mean.',
 reviewHeading:'What homeowners say about AC repair.',
 processHeading:'Let’s get your home back on track.',
 processBody:'Start with a repair request. Choose the work after you understand the findings.',
 steps:[['Request AC repair.','Share the concern, your address, and how to reach you. The office confirms the visit details.'],['Choose the repair.','Review the findings, the work, and the full price before you approve it.'],['Get back to your day.','With the agreed work done, make room for the moments you love at home.']],
 close:'Let’s make room for life at home.',
 closeBody:'Get help with the cooling problem, so you can get back to slow afternoons and the moments that matter to you.'
 },
 relevantReviews:reviews};
}
