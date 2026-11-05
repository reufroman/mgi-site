/** Paid-search landing-page drafts. Internal evidence is never customer copy. */
export const landingPageEvidence = {
  "status": "Internal local review drafts; no release approval implied",
  "reviewDate": "2026-10-12",
  "brandGuide": "MGI-Brand-Guide.md",
  "chaptersChecked": [
    "02",
    "04",
    "06",
    "08",
    "10",
    "11",
    "12",
    "13",
    "15",
    "18"
  ],
  "websiteStandard": "02_Strategy/Proposals-&-Planning/2026-10-07_INTERNAL_MGI-Website-Standards.md",
  "serviceRegister": "01_Projects/Website-Astro/src/data/routes.json",
  "schedulerEvidence": "Handoffs/2026-10-12_MGI-Scheduling-Widget-Review-Ready.md",
  "campaignEvidence": "Parent agent read-only live Google Ads inspection on 2026-10-12; exact campaign names and mappings require reconciliation with its saved receipt",
  "claimHolds": [
    "Jesse approves exact landing-page copy and public release.",
    "Office and qualified service lead confirm equipment scope, address coverage, fees, technical statements, and current availability.",
    "Water-heater and indoor-air requests require office confirmation of scheduler routing; current widget mapping only covers HVAC categories.",
    "No new prices, incentives, arrival times, health results, savings, or universal service-process guarantees are asserted. Topic-matched review candidates retain exact source records and public-use holds; shared aggregate proof retains its owning evidence.",
    "Submission is a request; receipt and appointment confirmation remain separate.",
    "Campaign/ad-group mappings are editorial routing metadata, not Google Ads mutations."
  ]
};

export const landingPages = [
  {
    "slug": "furnace-repair",
    "pageId": "LP-001",
    "title": "Furnace Repair: Request Service",
    "description": "For furnace repair, tell MGI Heating and Air what changed: no heat, short runs, or a room that stays cold. Ask about a service visit.",
    "heading": "Furnace stopped heating? Start here.",
    "lead": "For furnace repair, tell MGI Heating and Air what changed: no heat, short runs, or a room that stays cold. Ask about a service visit.",
    "cta": "Request furnace service",
    "schedulerSupported": true,
    "journey": "J01",
    "service": "Furnace Repair",
    "sourceServiceId": "ST-059",
    "campaign": "MGI | Search | Core Services | Nonbrand",
    "adGroups": [
      "Furnace and Heating"
    ],
    "introTitle": "Find the problem before choosing the fix.",
    "intro": "A cold house does not tell you which part failed. Start with a furnace check. The findings help you compare the repair with any further work your home needs.",
    "choices": [
      {
        "title": "No heat",
        "body": "Say when the heat stopped and what the furnace is doing now."
      },
      {
        "title": "Starts, then stops",
        "body": "Describe the pattern. Short runs are a symptom, not a diagnosis."
      },
      {
        "title": "The trouble keeps returning",
        "body": "Bring earlier repair notes so the next check starts with the history."
      }
    ],
    "questions": [
      {
        "q": "Does no heat mean I need a new furnace?",
        "a": "No. The cause, condition, and repair scope come first. Age alone does not decide replacement."
      },
      {
        "q": "What does a furnace repair cost?",
        "a": "The failed part and the work needed change the price. Ask about visit charges and the repair estimate before agreeing."
      },
      {
        "q": "Is my visit confirmed when I submit?",
        "a": "Submitting sends a request. The office still needs to confirm the service, availability, and appointment."
      }
    ],
    "prepare": [
      "Note when the heat stopped or changed.",
      "Have earlier repair notes handy, if you have them.",
      "Share your address and a good number to reach you."
    ],
    "closeHeading": "Take the next step toward a warmer home.",
    "closeBody": "Request furnace service and share what is happening. The office can confirm the next available path."
  },
  {
    "slug": "furnace-replacement",
    "pageId": "LP-002",
    "title": "Furnace Replacement: Request an Estimate",
    "description": "Planning a furnace replacement? Talk with MGI Heating and Air about your home, the problems you want solved, and the work a new furnace would need.",
    "heading": "Choose a new furnace with the whole project in view.",
    "lead": "Planning a furnace replacement? Talk with MGI Heating and Air about your home, the problems you want solved, and the work a new furnace would need.",
    "cta": "Request a furnace estimate",
    "schedulerSupported": true,
    "journey": "J04",
    "service": "Furnace Replacement",
    "sourceServiceId": "ST-060",
    "campaign": "MGI | Search | Core Services | Nonbrand",
    "adGroups": [
      "Furnace and Heating"
    ],
    "introTitle": "A better choice starts with your home.",
    "intro": "The furnace is one part of the decision. Compare what each choice includes, which concerns it addresses, and what still needs checking before you buy.",
    "choices": [
      {
        "title": "Repeated repairs",
        "body": "Compare the known repair needs with the full replacement project."
      },
      {
        "title": "Rooms that stay cold",
        "body": "Name the rooms and when you notice the problem. A new furnace alone may not address it."
      },
      {
        "title": "Planning ahead",
        "body": "Share your budget and timing so the conversation starts with what matters to you."
      }
    ],
    "questions": [
      {
        "q": "Should I repair or replace my furnace?",
        "a": "Compare the findings, repair history, full price, and what each choice would fix. A costly repair or an older furnace alone does not settle it."
      },
      {
        "q": "What should the estimate include?",
        "a": "Look for equipment, installation work, required changes, exclusions, and the total price. Ask who owns anything still to check."
      },
      {
        "q": "Does this request book an installation?",
        "a": "No. It starts a request to discuss replacement. A confirmed visit, approved estimate, and installation are separate steps."
      }
    ],
    "prepare": [
      "Write down the concerns you want a new furnace to address.",
      "Gather repair notes or another estimate, if available.",
      "Share your target timing and any access needs."
    ],
    "closeHeading": "Make room for a clear heating decision.",
    "closeBody": "Request a furnace estimate visit. Start with your goals and compare the work before choosing."
  },
  {
    "slug": "ac-repair",
    "pageId": "LP-003",
    "title": "AC Repair: Request Service",
    "description": "For AC repair, tell MGI Heating and Air what your air conditioner is doing and which rooms feel warm. Ask about a service visit.",
    "heading": "AC running but your home stays hot?",
    "lead": "For AC repair, tell MGI Heating and Air what your air conditioner is doing and which rooms feel warm. Ask about a service visit.",
    "cta": "Request AC service",
    "schedulerSupported": true,
    "journey": "J01",
    "service": "AC Repair",
    "sourceServiceId": "ST-061",
    "campaign": "MGI | Search | Core Services | Nonbrand",
    "adGroups": [
      "Air Conditioning"
    ],
    "introTitle": "Start with what changed.",
    "intro": "Warm air, long runs, and poor cooling can have different causes. A check helps separate the symptom from the repair your air conditioner actually needs.",
    "choices": [
      {
        "title": "No cooling",
        "body": "Share when the cooling stopped and whether the equipment runs."
      },
      {
        "title": "Cooling comes and goes",
        "body": "Note when the trouble happens and how long it lasts."
      },
      {
        "title": "One room stays warm",
        "body": "Name the room and the pattern. That concern may need a separate check."
      }
    ],
    "questions": [
      {
        "q": "Does warm air mean my AC needs replacing?",
        "a": "No. A check is needed to find the cause. Repair and replacement should be compared using the findings."
      },
      {
        "q": "Can you tell the repair price from the symptom?",
        "a": "The symptom alone does not establish the work. Ask about visit charges, the failed part, and what the repair estimate includes."
      },
      {
        "q": "Is a service request a confirmed appointment?",
        "a": "No. The office still needs to confirm your service, availability, and appointment."
      }
    ],
    "prepare": [
      "Note when the cooling changed.",
      "Describe which rooms feel warm.",
      "Gather earlier repair notes, if you have them."
    ],
    "closeHeading": "Let’s get your cooling concern moving.",
    "closeBody": "Request AC service. Share the pattern so the next conversation has a useful starting point."
  },
  {
    "slug": "ac-replacement",
    "pageId": "LP-004",
    "title": "AC Replacement: Request an Estimate",
    "description": "Compare AC replacement with MGI Heating and Air. Start with the rooms you want to cool, your current equipment, and the full installation work.",
    "heading": "Plan your new AC around the home you live in.",
    "lead": "Compare AC replacement with MGI Heating and Air. Start with the rooms you want to cool, your current equipment, and the full installation work.",
    "cta": "Request an AC estimate",
    "schedulerSupported": true,
    "journey": "J04",
    "service": "AC Replacement",
    "sourceServiceId": "ST-062",
    "campaign": "MGI | Search | Core Services | Nonbrand",
    "adGroups": [
      "Air Conditioning"
    ],
    "introTitle": "Look beyond the new air conditioner.",
    "intro": "A useful estimate connects equipment to your home’s needs. Compare the work, the full price, and any changes needed to make the proposed system fit.",
    "choices": [
      {
        "title": "Repairs are adding up",
        "body": "Compare the known repair needs with the replacement scope."
      },
      {
        "title": "Cooling does not reach every room",
        "body": "Describe the pattern before assuming new equipment will solve it."
      },
      {
        "title": "You are ready to plan",
        "body": "Bring your timing and budget questions to an estimate conversation."
      }
    ],
    "questions": [
      {
        "q": "Is a larger AC better?",
        "a": "Size should fit the home’s cooling needs. Ask what supports the proposed size rather than choosing by size alone."
      },
      {
        "q": "Will new AC lower my bills?",
        "a": "That depends on equipment, rates, weather, settings, and use. Any running-cost estimate needs its assumptions and limits."
      },
      {
        "q": "What should I compare in quotes?",
        "a": "Compare the equipment, installation work, required changes, exclusions, and total price. Resolve missing items before deciding."
      }
    ],
    "prepare": [
      "List the rooms and cooling concerns that matter most.",
      "Gather equipment details and repair notes, if available.",
      "Share your preferred project timing."
    ],
    "closeHeading": "Take the next step toward a clearer cooling plan.",
    "closeBody": "Request an AC estimate visit and compare what the whole project would involve."
  },
  {
    "slug": "heat-pumps",
    "pageId": "LP-005",
    "title": "Heat Pumps: Repair and Project Help",
    "description": "Explore home heating and cooling with MGI Heating and Air. Compare heat-pump fit, project needs, and the questions that matter before you choose.",
    "heading": "See how a heat pump could fit your home.",
    "lead": "Explore home heating and cooling with MGI Heating and Air. Compare heat-pump fit, project needs, and the questions that matter before you choose.",
    "cta": "Request heat-pump help",
    "schedulerSupported": true,
    "journey": "J05",
    "service": "Heat Pumps",
    "sourceServiceId": "ST-022",
    "campaign": "MGI | Search | Core Services | Nonbrand",
    "adGroups": [
      "Heat Pumps"
    ],
    "introTitle": "Your home sets the starting point.",
    "intro": "A heat pump moves heat to warm or cool a home. The useful question is how a proposed system would serve your rooms and work with what you have now.",
    "choices": [
      {
        "title": "Exploring a change",
        "body": "Discuss the rooms, comfort goals, and existing equipment first."
      },
      {
        "title": "Comparing systems",
        "body": "Ask what each design needs, including any backup heat and electrical work."
      },
      {
        "title": "Existing heat pump trouble",
        "body": "Choose a service conversation if your current system stopped working."
      }
    ],
    "questions": [
      {
        "q": "Can a heat pump heat and cool my home?",
        "a": "Many systems do both. The proposed equipment and home design determine how it would serve your heating and cooling needs."
      },
      {
        "q": "Are rebates included in the price?",
        "a": "Do not assume a rebate applies. Utility, equipment, current rules, and timing need a separate check. Keep the full project price in your budget."
      },
      {
        "q": "Will it cost less to run?",
        "a": "Running cost depends on the system, your home, energy rates, weather, and use. Ask for the basis and limits of any comparison."
      }
    ],
    "prepare": [
      "Describe what you want to change at home.",
      "Have current equipment details handy, if available.",
      "Bring energy-use records if running cost is part of your question."
    ],
    "closeHeading": "Get the answers your heat-pump decision needs.",
    "closeBody": "Request a heat-pump conversation. Share whether you are planning a change or need help with an existing system."
  },
  {
    "slug": "water-heaters",
    "pageId": "LP-006",
    "title": "Water Heaters: Talk About Service",
    "description": "Talk with MGI Heating and Air about a water-heater problem or planned replacement. Share what changed and how your home uses hot water.",
    "heading": "Hot water not keeping up? Start with the heater.",
    "lead": "Talk with MGI Heating and Air about a water-heater problem or planned replacement. Share what changed and how your home uses hot water.",
    "cta": "Call about hot water",
    "schedulerSupported": false,
    "journey": "J01",
    "service": "Water Heaters",
    "sourceServiceId": "ST-023",
    "campaign": "MGI | Search | Core Services | Nonbrand",
    "adGroups": [
      "Water Heaters"
    ],
    "introTitle": "Choose the path that fits the problem.",
    "intro": "A loss of hot water and a planned upgrade need different conversations. Explain your equipment and concern first, then confirm the available service and next step.",
    "choices": [
      {
        "title": "Hot water has stopped",
        "body": "Share when it stopped and any changes you noticed."
      },
      {
        "title": "Hot water runs short",
        "body": "Describe when it runs out and how many uses overlap."
      },
      {
        "title": "Planning a replacement",
        "body": "Compare household demand, placement, and the full installation needs."
      }
    ],
    "questions": [
      {
        "q": "Does less hot water mean I need a new heater?",
        "a": "No. Equipment findings and household use both matter. The cause needs checking before a repair or replacement recommendation."
      },
      {
        "q": "Can I ask about a heat-pump water heater?",
        "a": "Yes. It heats water, not your rooms. Location, equipment fit, and electrical and plumbing needs must be checked."
      },
      {
        "q": "Can I schedule water-heater work here?",
        "a": "Call the office to confirm water-heater scope, address coverage, and scheduling. The online request path does not confirm water-heater or general plumbing service."
      }
    ],
    "prepare": [
      "Note when hot water runs short or stops.",
      "Share the heater type or model, if you know it.",
      "Describe the busy hot-water times in your home."
    ],
    "closeHeading": "Start a clearer hot-water plan.",
    "closeBody": "Call about your water heater and explain whether you need service or are planning a change."
  },
  {
    "slug": "indoor-air-quality",
    "pageId": "LP-007",
    "title": "Indoor Air Quality: Discuss Your Home",
    "description": "Ask MGI Heating and Air about air-purification and humidifier options. Start with what you notice at home before choosing equipment.",
    "heading": "Dry or dusty air deserves a closer look.",
    "lead": "Ask MGI Heating and Air about air-purification and humidifier options. Start with what you notice at home before choosing equipment.",
    "cta": "Call about indoor air",
    "schedulerSupported": false,
    "journey": "J02",
    "service": "Indoor Air Quality",
    "sourceServiceId": "ST-025",
    "campaign": "MGI | Search | Core Services | Nonbrand",
    "adGroups": [
      "Indoor Air Quality"
    ],
    "introTitle": "Name the concern before choosing a product.",
    "intro": "Dry air and dust are different concerns. Describe where and when you notice them. Product fit and the available assessment scope need checking.",
    "choices": [
      {
        "title": "Dry air",
        "body": "Describe the rooms and times when dryness is most noticeable."
      },
      {
        "title": "Air-purification questions",
        "body": "Compare what a proposed product is designed to address and what it cannot establish."
      },
      {
        "title": "Existing equipment",
        "body": "Share the model and care history of your humidifier or air-purification equipment."
      }
    ],
    "questions": [
      {
        "q": "Will an air purifier fix my air concern?",
        "a": "That depends on the source of the concern and what the product is designed to address. A product alone does not establish the cause."
      },
      {
        "q": "Will a humidifier solve dryness?",
        "a": "It may help manage humidity when suitable for the home. Ask about controls, care, and limits before choosing one."
      },
      {
        "q": "Can this address a medical concern?",
        "a": "These are home-equipment questions, not a medical assessment. Air-purification or humidity equipment does not guarantee health or symptom relief."
      }
    ],
    "prepare": [
      "Note which rooms are affected and when.",
      "Share any air-purification or humidifier model details.",
      "Describe what you have already tried."
    ],
    "closeHeading": "Give your air concern a useful next step.",
    "closeBody": "Call about your air concern. The office can confirm the available purification or humidifier service."
  },
  {
    "slug": "mgi",
    "pageId": "LP-008",
    "title": "Contact MGI Heating and Air",
    "description": "MGI Heating and Air: start with a heating, cooling, hot-water, or air concern. Request service or talk about a planned equipment change.",
    "heading": "Help for the home you have plans for.",
    "lead": "MGI Heating and Air: start with a heating, cooling, hot-water, or air concern. Request service or talk about a planned equipment change.",
    "cta": "Request service",
    "schedulerSupported": true,
    "journey": "J01/J04",
    "service": "MGI Heating and Air",
    "sourceServiceId": "ST-001",
    "campaign": "MGI | Search | Brand",
    "adGroups": [
      "MGI Brand"
    ],
    "introTitle": "Start where your home needs help.",
    "intro": "You do not need to know which part is wrong. Share what changed, or what you want to plan, and ask about the right next conversation.",
    "choices": [
      {
        "title": "Something stopped working",
        "body": "Describe the heating, cooling, or hot-water problem and ask about availability."
      },
      {
        "title": "You are planning a change",
        "body": "Share the rooms, equipment, and goals that shape the decision."
      },
      {
        "title": "You have a question",
        "body": "Bring the finding or estimate you want help understanding."
      }
    ],
    "questions": [
      {
        "q": "What can I ask MGI about?",
        "a": "Start with residential furnaces, AC, heat pumps, water heaters, air purification, or humidifiers. The office confirms the requested work and address coverage."
      },
      {
        "q": "Do I need to know what is wrong?",
        "a": "No. Your description is a useful start. Equipment checks are needed before a cause or repair can be established."
      },
      {
        "q": "Am I booked after submitting?",
        "a": "A submitted request is not a confirmed appointment. The office still needs to confirm service, availability, and timing."
      }
    ],
    "prepare": [
      "Describe your main concern in your own words.",
      "Share your address and contact number.",
      "Have equipment or estimate details handy, if available."
    ],
    "closeHeading": "Let’s get your home back on track.",
    "closeBody": "Request a conversation with MGI. Start with the concern so the next step fits what you need."
  },
  {
    "slug": "hvac",
    "pageId": "LP-009",
    "title": "Heating and Cooling: Request HVAC Help",
    "description": "Talk with MGI Heating and Air about furnace, AC, or heat-pump service. Share the problem or start a conversation about replacement.",
    "heading": "Heating or cooling trouble? Find your next step.",
    "lead": "Talk with MGI Heating and Air about furnace, AC, or heat-pump service. Share the problem or start a conversation about replacement.",
    "cta": "Request HVAC service",
    "schedulerSupported": true,
    "journey": "J01/J04",
    "service": "Heating and Cooling",
    "sourceServiceId": "ST-005",
    "campaign": "MGI Mechanical | Non Brand | $2500",
    "adGroups": [
      "HVAC",
      "Furnace and Heating",
      "Air Conditioning",
      "Heat Pumps"
    ],
    "introTitle": "Choose a starting point, not a diagnosis.",
    "intro": "HVAC means heating, ventilation, and air conditioning. For this request, start with your furnace, AC, or heat pump and what you want help with.",
    "choices": [
      {
        "title": "Repair",
        "body": "Tell us what stopped working or what changed."
      },
      {
        "title": "Replacement",
        "body": "Share the concerns you want new equipment to address."
      },
      {
        "title": "Care",
        "body": "Ask what a maintenance visit for your equipment would include."
      }
    ],
    "questions": [
      {
        "q": "Does equipment trouble mean replacement?",
        "a": "No. Findings, condition, repair needs, and your goals shape that choice. Start with the actual problem."
      },
      {
        "q": "Can I ask about maintenance?",
        "a": "Yes. Confirm the equipment, visit checklist, included work, and charges. A maintenance visit does not automatically include a repair."
      },
      {
        "q": "What happens after I request service?",
        "a": "The office needs to confirm the requested work, address coverage, availability, and appointment. Submission alone does not confirm a visit."
      }
    ],
    "prepare": [
      "Note which equipment needs attention.",
      "Describe the rooms and pattern you notice.",
      "Bring prior repair or care records, if available."
    ],
    "closeHeading": "Get a practical plan for your home.",
    "closeBody": "Request heating or cooling service and share what matters most: today’s problem or a planned change."
  }
];
