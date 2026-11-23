// Writes the 17 Spanish town pages (content/es/side-by-side/5x_town-*.md) from one shared
// template plus each town's local note. The English town pages share one template too
// (src/components/TownLanding.astro); only the town name and the local note change.
// Edit the template or a note here, then run:
//   node scripts/es-towns.mjs && node scripts/es-import.mjs
import fs from 'node:fs';

const towns = [
  ['ST-028', 'Wellington', {
    en: 'Wellington lists AC, combined AC and furnace work, furnace replacement, and water heaters in its One Stop permit chart. For planned equipment work, ask which permit applies and who handles the application and inspection.',
    es: 'Wellington incluye el aire acondicionado, el trabajo combinado de aire y calentón, el reemplazo del calentón y los calentadores de agua en su tabla de permisos One Stop. Si planea un trabajo en su equipo, pregunte qué permiso aplica y quién se encarga de la solicitud y la inspección.',
    link: 'https://www.wellingtoncolorado.gov/DocumentCenter/View/4096'}],
  ['ST-029', 'Greeley', {
    en: 'Greeley’s public permit portal can help you look for records of earlier work. When planning an equipment change, gather any records you have and ask who will confirm the current project requirements.',
    es: 'El portal público de permisos de Greeley puede ayudarle a buscar registros de trabajos anteriores. Si planea cambiar un equipo, reúna los registros que tenga y pregunte quién confirmará los requisitos actuales del proyecto.',
    link: 'https://trakit.greeleygov.com/eTRAKiT/'}],
  ['ST-030', 'Loveland', {
    en: 'Some properties have district or community rules as well as city requirements. Lakes at Centerra lists covenant enforcement among its possible district services. Ask which rules apply to your actual property before choosing outdoor equipment placement.',
    es: 'Algunas propiedades tienen reglas del distrito o de la comunidad además de los requisitos de la ciudad. Lakes at Centerra incluye hacer cumplir los reglamentos (covenants) entre los posibles servicios de su distrito. Pregunte qué reglas aplican a su propiedad antes de decidir dónde va el equipo exterior.',
    link: 'https://www.lakesatcenterramd.live/metropolitan-district-general-explanation'}],
  ['ST-031', 'Berthoud', {
    en: 'Berthoud requires contractors to hold town licensing before applying for a building permit. When planning equipment work, ask who will apply for any required permit and arrange inspections.',
    es: 'Berthoud exige que los contratistas tengan licencia del pueblo antes de solicitar un permiso de construcción. Si planea un trabajo en su equipo, pregunte quién solicitará los permisos necesarios y quién programará las inspecciones.',
    link: 'https://berthoud.org/169/Building-Department'}],
  ['ST-032', 'Windsor', {
    en: 'Use the electric and gas accounts for your actual Windsor address when comparing equipment or rebate options. For a proposed equipment change, confirm the property jurisdiction and who will handle any required approvals.',
    es: 'Use las cuentas de luz y gas de su dirección en Windsor al comparar equipos u opciones de reembolso. Si propone cambiar un equipo, confirme a qué jurisdicción pertenece la propiedad y quién se encargará de las aprobaciones necesarias.',
    link: ''}],
  ['ST-033', 'Longmont', {
    en: 'Longmont Power & Communications provides municipal electric service and points customers to Efficiency Works. Check your actual electric account before using a utility program in the project budget.',
    es: 'Longmont Power & Communications da el servicio eléctrico municipal y dirige a sus clientes a Efficiency Works. Revise su cuenta de luz antes de contar con un programa de la compañía en el presupuesto del proyecto.',
    link: 'https://longmontcolorado.gov/longmont-power-communications/'}],
  ['ST-034', 'Boulder', {
    en: 'Boulder’s permit portal instructions identify a licensed mechanical contractor as a contact for mechanical permits. Ask who will handle the permit process for your proposed equipment work.',
    es: 'Las instrucciones del portal de permisos de Boulder indican que un contratista mecánico con licencia es el contacto para los permisos mecánicos. Pregunte quién se encargará del trámite del permiso para el trabajo que propone.',
    link: 'https://bouldercolorado.gov/services/energov-customer-self-service-portal'}],
  ['ST-035', 'Erie', {
    en: 'Erie’s HVAC application asks about the equipment, fuel, location, and whether the work is a replacement or an addition. Have those details included in the project discussion before approving the scope.',
    es: 'La solicitud de Erie para trabajos de calefacción y aire acondicionado pregunta por el equipo, el combustible, la ubicación y si el trabajo es un reemplazo o algo nuevo. Incluya esos detalles al hablar del proyecto antes de aprobar el alcance.',
    link: 'https://erieco.gov/2002/HVAC'}],
  ['ST-036', 'Frederick', {
    en: 'Frederick’s Building Department handles permits, inspections, and contractor licensing. For planned equipment work, confirm the applicable requirements and name who handles each step in the quote.',
    es: 'El Departamento de Construcción de Frederick maneja permisos, inspecciones y licencias de contratistas. Si planea un trabajo en su equipo, confirme los requisitos que aplican y que la cotización diga quién se encarga de cada paso.',
    link: 'https://frederickco.gov/416/Building-Department'}],
  ['ST-037', 'Firestone', {
    en: 'Firestone publishes building permit fees and bases project valuation on labor and materials. Ask whether applicable permit fees and inspection responsibilities are included in the full project price.',
    es: 'Firestone publica sus cuotas de permisos de construcción y calcula el valor del proyecto según la mano de obra y los materiales. Pregunte si las cuotas de permisos y la responsabilidad de las inspecciones están incluidas en el precio completo del proyecto.',
    link: 'https://www.firestoneco.gov/425/Building-Permits-Fees'}],
  ['ST-038', 'Thornton', {
    en: 'Thornton lists furnace, AC, and water-heater installation or replacement among projects requiring permits. Confirm the requirements for your actual scope and who will arrange inspections.',
    es: 'Thornton incluye la instalación o el reemplazo de calentones, aire acondicionado y calentadores de agua entre los proyectos que requieren permiso. Confirme los requisitos para su trabajo y quién programará las inspecciones.',
    link: 'https://www.thorntonco.gov/media/file/required-building-permit'}],
  ['ST-039', 'Broomfield', {
    en: 'Broomfield’s homeowner guidance distinguishes unchanged furnace or AC replacements from other project review cases. Explain any change in equipment or scope when confirming the permit path.',
    es: 'La guía de Broomfield para dueños de casa separa el reemplazo de un calentón o aire acondicionado sin cambios de otros proyectos que requieren revisión. Explique cualquier cambio de equipo o de alcance al confirmar qué permiso corresponde.',
    link: 'https://www.broomfield.org/178/Homeowner-Permits-and-Building-Guides'}],
  ['ST-040', 'Fort Collins', {
    en: 'Fort Collins lists heating and cooling equipment under mechanical permits. Work involving more than one trade can use a different project path. Ask how any electrical or other-trade work is included in the plan.',
    es: 'Fort Collins incluye los equipos de calefacción y aire acondicionado en los permisos mecánicos. Un trabajo que involucra más de un oficio puede seguir otro trámite. Pregunte cómo se incluye en el plan el trabajo eléctrico o de otros oficios.',
    link: 'https://www.fortcollins.gov/Business/Permits-and-Licensing/Building-Permits?id=3'}],
  ['ST-041', 'Johnstown', {
    en: 'Johnstown lists Xcel Energy, United Power, and Poudre Valley REA with different service areas. Use your actual electric account when comparing equipment and utility programs.',
    es: 'Johnstown indica que Xcel Energy, United Power y Poudre Valley REA dan servicio en zonas distintas. Use su cuenta de luz al comparar equipos y programas de la compañía.',
    link: 'https://www.johnstownco.gov/510/Utility-Service-Providers'}],
  ['ST-042', 'Timnath', {
    en: 'Timnath’s homeowner construction page provides separate guidance for AC, furnace replacement, and water heaters. Use the equipment-specific information to discuss permit and inspection responsibilities.',
    es: 'La página de construcción para dueños de casa de Timnath tiene guías separadas para aire acondicionado, reemplazo de calentón y calentadores de agua. Use la información de su equipo para hablar de quién se encarga de permisos e inspecciones.',
    link: 'https://timnath.org/homeowner-building-and-construction-services/'}],
  ['ST-043', 'Severance', {
    en: 'Severance says most locations receive electricity from Xcel Energy or Poudre Valley REA. Check your account rather than using the town name to decide which utility program applies.',
    es: 'Severance indica que la mayoría de las casas reciben luz de Xcel Energy o de Poudre Valley REA. Revise su cuenta en lugar de guiarse por el nombre del pueblo para saber qué programa de la compañía aplica.',
    link: 'https://www.townofseverance.org/264/Electric'}],
  ['ST-044', 'Dacono', {
    en: 'Dacono lists AC, heating-unit, and water-heater installation or replacement as permit work. Its guidance says permit responsibility should be specified in the contract. Make that part of the written project scope.',
    es: 'Dacono incluye la instalación o el reemplazo de aire acondicionado, equipos de calefacción y calentadores de agua como trabajos con permiso. Su guía dice que el contrato debe indicar quién es responsable del permiso. Pida que eso quede por escrito en el alcance del proyecto.',
    link: 'https://www.daconoco.gov/875/Building-Codes-Permits'}],
];

const services = [
  ['/services/furnace-repair/', 'Furnaces: Repair', 'Calentón: reparación'],
  ['/services/furnace-replacement/', 'Furnaces: Replacement', 'Calentón: reemplazo'],
  ['/services/furnace-maintenance/', 'Furnaces: Maintenance', 'Calentón: mantenimiento'],
  ['/services/ac-repair/', 'Air conditioning: Repair', 'Aire acondicionado: reparación'],
  ['/services/ac-replacement/', 'Air conditioning: Replacement', 'Aire acondicionado: reemplazo'],
  ['/services/ac-maintenance/', 'Air conditioning: Maintenance', 'Aire acondicionado: mantenimiento'],
  ['/services/heat-pump-repair/', 'Heat pumps: Repair', 'Bomba de calor: reparación'],
  ['/services/heat-pump-installation/', 'Heat pumps: Replacement', 'Bomba de calor: reemplazo'],
  ['/services/heat-pump-maintenance/', 'Heat pumps: Maintenance', 'Bomba de calor: mantenimiento'],
  ['/services/water-heater-repair/', 'Water heaters: Repair', 'Calentador de agua: reparación'],
  ['/services/water-heater-replacement/', 'Water heaters: Replacement', 'Calentador de agua: reemplazo'],
  ['/services/water-heater-maintenance/', 'Water heaters: Maintenance', 'Calentador de agua: mantenimiento'],
  ['/services/heat-pump-water-heater-repair/', 'Heat-pump water heaters: Repair', 'Calentador de agua con bomba de calor: reparación'],
  ['/services/heat-pump-water-heater-installation/', 'Heat-pump water heaters: Replacement', 'Calentador de agua con bomba de calor: reemplazo'],
  ['/services/heat-pump-water-heater-maintenance/', 'Heat-pump water heaters: Maintenance', 'Calentador de agua con bomba de calor: mantenimiento'],
  ['/services/mini-split-repair/', 'Mini splits: Repair', 'Minisplit: reparación'],
  ['/services/mini-split-installation/', 'Mini splits: Replacement', 'Minisplit: reemplazo'],
  ['/services/mini-split-maintenance/', 'Mini splits: Maintenance', 'Minisplit: mantenimiento'],
  ['/services/indoor-air-quality-assessment/', 'Indoor air quality: Assessment', 'Calidad del aire: evaluación'],
  ['/services/air-purification-systems/', 'Indoor air quality: Air purification', 'Calidad del aire: purificación'],
];

function page([pageId, town, local], index) {
  const slug = town.toLowerCase().replace(/\s+/g, '-');
  const rows = [];
  const r = (field, en, es) => rows.push(`| ${field} | ${en} | ${es} | |`);
  r('Eyebrow', `Heating and cooling in ${town}`, `Calefacción y aire acondicionado en ${town}`);
  r('H1 / title', `Heating and cooling services in ${town}.`, `Servicios de calefacción y aire acondicionado en ${town}.`);
  r('Summary', `Explore furnace, AC, heat-pump, and water-heater services for your ${town} home. Start with a repair concern, plan a replacement, or make room for routine care.`, `Conozca los servicios de calentón, aire acondicionado, bomba de calor y calentador de agua para su casa en ${town}. Empiece por una reparación, planee un reemplazo o haga espacio para el mantenimiento de rutina.`);
  r('Answer lead', 'Contact MGI to confirm the work, availability, and service at your address.', 'Comuníquese con MGI para confirmar el trabajo, la disponibilidad y el servicio en su dirección.');
  r('CTA', `Request service in ${town}`, `Solicite servicio en ${town}`);
  r('Section 1 heading', `Find the right HVAC service in ${town}.`, `Encuentre el servicio que necesita en ${town}.`);
  r('Section 1 body', 'Choose your equipment, then explore repair, replacement, or maintenance.', 'Elija su equipo y vea las opciones de reparación, reemplazo o mantenimiento.');
  services.forEach(([route, en, es], i) => r(`Section 1 link ${i + 1}`, `\`${route}\``, es));
  r('Section 2 heading', 'Emergency HVAC', 'Emergencias');
  r('Section 2 body', 'Heating or cooling stopped? Find the next step for urgent help.', '¿Dejó de funcionar la calefacción o el aire acondicionado? Vea el siguiente paso para recibir ayuda urgente.');
  r('Section 2 link 1', '`/services/emergency-hvac-service/`', 'Ayuda urgente');
  r('Section 3 heading', 'Where are you starting?', '¿Dónde está usted hoy?');
  r('Section 3 point 1 title', 'Something stopped working.', 'Algo dejó de funcionar.');
  r('Section 3 point 1', 'Describe the change and when it started. You do not need to know which part failed.', 'Describa el cambio y cuándo empezó. No necesita saber qué pieza falló.');
  r('Section 3 point 2 title', 'You are planning a change.', 'Está planeando un cambio.');
  r('Section 3 point 2', 'Compare the findings, the work included, and the full project price before choosing equipment.', 'Compare el diagnóstico, el trabajo incluido y el precio completo del proyecto antes de elegir el equipo.');
  r('Section 3 point 3 title', 'You want to keep up with care.', 'Quiere mantener su equipo al día.');
  r('Section 3 point 3', 'Start with your equipment and the last visit you know about. Ask what the next tune-up covers.', 'Empiece por su equipo y la última visita que recuerde. Pregunte qué cubre el próximo mantenimiento.');
  r('Section 4 heading', `Plan equipment work in ${town}.`, `Planee el trabajo en su equipo en ${town}.`);
  r('Section 4 body', `For a replacement or new installation, get the property details into the plan before choosing the equipment.`, `Para un reemplazo o una instalación nueva, incluya los detalles de la propiedad en el plan antes de elegir el equipo.`);
  r('Section 4 point 1 title', `Before equipment work at your ${town} home.`, `Antes de trabajar en el equipo de su casa en ${town}.`);
  r('Section 4 point 1', local.en, local.es);
  r('Section 4 point 2', 'Include outdoor equipment placement and access in the plan.', 'Incluya en el plan dónde irá el equipo exterior y cómo se llega a él.');
  r('Section 4 point 3', 'Get the full scope and price, including any permit or other-trade work.', 'Pida el alcance y el precio completos, incluidos permisos o trabajos de otros oficios.');
  let link = 1;
  if (local.link) r(`Section 4 link ${link++}`, `\`${local.link}\``, 'Información local del proyecto');
  r(`Section 4 link ${link++}`, '`/financing/`', 'Financiamiento');
  r(`Section 4 link ${link++}`, '`/rebates/`', 'Opciones de reembolso');
  r('Section 5 heading', `Make a care plan for your ${town} home.`, `Haga un plan de mantenimiento para su casa en ${town}.`);
  r('Section 5 body', 'Useful records and regular care give you a clearer starting point for the next question.', 'Tener sus papeles a la mano y un mantenimiento regular le da un punto de partida más claro para la próxima duda.');
  r('Section 5 point 1 title', 'New to the home?', '¿Su casa es nueva para usted?');
  r('Section 5 point 1', 'Gather the manuals and service records you have. Use the first-days checklist to get familiar with the equipment.', 'Reúna los manuales y registros de servicio que tenga. Use la lista de los primeros días para conocer el equipo.');
  r('Section 5 point 2 title', 'Give tune-ups a place on the calendar.', 'Ponga el mantenimiento en el calendario.');
  r('Section 5 point 2', 'Explore VIP Comfort Club, see what the furnace and AC tune-ups include, and compare the membership terms.', 'Conozca el Plan VIP (VIP Comfort Club), vea qué incluyen los mantenimientos del calentón y del aire acondicionado y compare los términos de la membresía.');
  r('Section 5 link 1', '`/new-homeowners/`', 'Lista para dueños de casa nuevos');
  r('Section 5 link 2', '`/vip-membership/`', 'Plan VIP');
  r('FAQ 1 Q', `Can MGI help at every ${town} address?`, `¿MGI puede ayudar en cualquier dirección de ${town}?`);
  r('FAQ 1 A', 'Coverage depends on the exact address, the work requested and available scheduling. Ask the office to confirm before making plans.', 'Depende de la dirección exacta, el trabajo que pide y la disponibilidad de citas. Pida a la oficina que lo confirme antes de hacer planes.');
  r('FAQ 2 Q', 'Do local utility programs apply automatically?', '¿Los programas de la compañía de luz y gas aplican automáticamente?');
  r('FAQ 2 A', 'No. The actual utility account, eligible equipment, project requirements and current program terms govern. Check those conditions before counting an incentive in the budget.', 'No. Dependen de su cuenta de luz y gas, de que el equipo califique, de los requisitos del proyecto y de los términos actuales del programa. Revise esas condiciones antes de contar con un incentivo en su presupuesto.');
  r('FAQ 3 Q', 'Where do I start if I do not know what is wrong?', '¿Por dónde empiezo si no sé qué está fallando?');
  r('FAQ 3 A', 'Choose the equipment you need help with, or share what you notice when you request service. You do not need to name a failed part.', 'Elija el equipo con el que necesita ayuda o cuéntenos lo que nota al solicitar servicio. No necesita saber qué pieza falló.');
  const num = String(50 + index).padStart(2, '0');
  const text = `# Side-by-side: HVAC Services in ${town} / Calefacción y aire acondicionado en ${town}

Status: Generated by scripts/es-towns.mjs from the shared town template (Nov 23, 2026). Needs a Spanish-speaker read (Cinthia) before release.
Page ID: \`${pageId}\` | Group: Area
EN route: \`/service-area/${slug}/\`
ES route: \`/es/areas-de-servicio/${slug}/\`
Schema type: WebPage
Meta title ES: Calefacción y aire acondicionado en ${town}, CO
Meta description ES: Reparación, reemplazo y mantenimiento de calentones, aire acondicionado, bombas de calor y calentadores de agua en ${town}. Llame al (970) 287-1673.

| Field | English | Spanish | Notes |
|---|---|---|---|
${rows.join('\n')}

## Not carried over
- Photo captions and the Google review badge. Service links go to the Spanish service pages instead of the English town and service combination pages, which have no Spanish version yet.
`;
  fs.writeFileSync(`content/es/side-by-side/${num}_town-${slug}.md`, text);
}

towns.forEach(page);
console.log(`Wrote ${towns.length} Spanish town pages`);
