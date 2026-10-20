// Name official references by the question they answer, not just their host.
/** @type {Record<string,string>} */
const labels={
 'troubleshoot-an-ac-not-working':'Carrier: air conditioner troubleshooting',
 'purchasing-and-repairing-home-air-conditioners-or-heat-pumps':'EPA: buying and repairing AC and heat-pump equipment',
 'for-your-home-rebates-and-incentives':'Efficiency Works: home rebates and incentives',
 'energy-efficient-home-improvement-credit':'IRS: Energy Efficient Home Improvement Credit',
 'heat-pumps':'Heat-pump equipment and program guidance',
 'heating-cooling-rebates':'PVREA: heating and cooling rebate guidance',
 'air_source_heat_pumps':'ENERGY STAR: air-source heat pumps',
 'key-product-criteria':'ENERGY STAR: heat-pump equipment criteria',
 'manual-s':'ACCA: Manual S equipment selection',
 'troubleshooting-a-furnace':'Carrier: furnace troubleshooting',
 'furnace-short-cycling':'Carrier: frequent furnace starts and stops',
 'Carbon-Monoxide-Information-Center':'CPSC: carbon monoxide safety',
 'afue':'Carrier: furnace efficiency ratings',
 'furnace-installation':'Carrier: furnace installation',
 'incorporate-minimum-efficiency-requirements-heating-and-cooling-products-federal':'Department of Energy: federal equipment efficiency requirements',
 'heat_pump_water_heaters':'ENERGY STAR: heat-pump water heaters',
 'frequently_asked_questions':'ENERGY STAR: heat-pump water-heater questions',
 'installation_best_practices':'ENERGY STAR: heat-pump water-heater installation guidance',
 'Use-Care-Manual.pdf':'Rheem: heat-pump water-heater use and care manual (PDF)',
 'mini-split-repairs':'Carrier: mini split repairs',
 'air-cleaners-and-air-filters-home':'EPA: air cleaners and filters for the home',
 'what-can-i-do-improve-indoor-air-quality-my-home':'EPA: ways to improve indoor air quality',
 'indoor-air-filtration':'EPA: air filtration during wildfire smoke',
 'guide_to_air_cleaners_in_the_home_2nd_edition.pdf':'EPA: guide to air cleaners in the home (PDF)',
 'create-clean-room-protect-indoor-air-quality-during-wildfire':'EPA: creating a cleaner-air room during wildfire smoke'
};
export function sourceLabel(source){
 const url=new URL(source),leaf=decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1)||'');
 if(url.hostname==='unitedpower.com')return 'United Power: heat-pump program guidance';
 if(url.hostname==='www.mitsubishicomfort.com')return 'Mitsubishi Electric: heat-pump equipment';
 if(leaf.includes('Final Specification'))return 'ENERGY STAR: central AC and heat-pump specification (PDF)';
 return labels[leaf]||`${url.hostname.replace('www.','')}: ${leaf.replace(/[-_]/g,' ')||'official guidance'}`;
}
