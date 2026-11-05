export const hubPilot={
 title:'What does your home need?',
 summary:'Start with what changed, or the work you are planning. You do not need to know which part is causing the problem.',
 choices:[
  {heading:'Something stopped working',body:'Start with repair information. An assessment and a repair are two separate decisions.',href:'#repair-options',label:'Find repair options'},
  {heading:'I am weighing a new system',body:'Compare the finding, the repair and the full replacement work before choosing.',href:'#project-options',label:'Explore replacement options'},
  {heading:'I want to plan regular care',body:'Find out what the visit checks and what is included. A current fault needs its own repair path.',href:'#care-options',label:'Find maintenance options'}
 ],
 groups:[
  {id:'repair-options',heading:'Repair and assessment',body:'Choose the equipment or concern that fits. These pages explain what to ask before work starts.',ids:['ST-059','ST-061','ST-065','ST-068','ST-071','ST-074','ST-077']},
  {id:'project-options',heading:'Replacement and installation',body:'Explore the full project, not just the equipment. Start with the findings if you are unsure whether replacement is needed.',ids:['ST-060','ST-062','ST-066','ST-069','ST-072','ST-075','ST-078']},
  {id:'care-options',heading:'Maintenance',body:'Compare the care visit with what your equipment needs. If something has stopped working, start with repair information.',ids:['ST-063','ST-064','ST-067','ST-070','ST-073','ST-076','ST-027']}
 ],
 equipment:{heading:'Start with the equipment you have',body:'Not sure which kind of work fits? These pages bring the related choices together.',ids:['ST-020','ST-021','ST-022','ST-023','ST-024','ST-026','ST-025']},
 comparison:{heading:'Repair or replace?',body:'An old system does not decide the answer by itself. Start with a finding you can understand, then compare what each choice would fix.',guides:[['ST-083','Repair assessment questions'],['ST-055','Compare furnace repair and replacement'],['ST-080','Compare AC repair and replacement'],['ST-081','Compare water-heater repair and replacement']]},
 help:{heading:'Still not sure where to start?',body:'One useful description is enough. Think about what changed, where it happens and when it started.',href:'/contact/',label:'See contact options'}
};
export function hubPilotContent(id,original){
 if(id!=='ST-005')return original;
 return {...original,title:hubPilot.title,summary:hubPilot.summary,answer:hubPilot.summary,sections:[...hubPilot.choices,...hubPilot.groups,hubPilot.equipment,hubPilot.comparison,hubPilot.help].map(s=>({heading:s.heading,body:s.body})),ctaLabel:'Explore service options',familyPilotHub:hubPilot};
}
