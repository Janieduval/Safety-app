// Static question/content definitions. Option *lists* (SWMS, PPE, permits, teams)
// live in the database (admin-manageable) and are seeded from prisma/seed.ts.
// These arrays are the fixed question structure of the form itself.

export const STEP1_QUESTIONS = [
  { key: "understand_task", label: "Do I understand today's task?" },
  {
    key: "have_skills_licences",
    label: "Do I have the required skills, training and licences for the task?",
  },
  {
    key: "have_everything_needed",
    label: "Do I have everything required to complete the task safely?",
  },
  {
    key: "tools_good_condition",
    label: "Are my tools and equipment in good condition?",
  },
  {
    key: "understand_prestart",
    label: "Do I understand the information discussed during today's pre-start?",
  },
  { key: "signed_onto_prestart", label: "Have I signed onto today's pre-start?" },
] as const;

export const STOP_WORK_WARNING =
  "STOP: Do not begin or continue the task. Speak with your supervisor and resolve this issue before proceeding.";

export const CHANGE_CATEGORIES = [
  "New excavations or trenches",
  "New plant or vehicle movements",
  "New exclusion zones",
  "New deliveries or stored materials",
  "Changes to traffic management",
  "Soft ground, mud or uneven surfaces",
  "New environmental conditions such as wind, rain, dust, heat, frost or fog",
  "New activities in the work area",
  "Other changes that could affect the work",
] as const;

export const HAZARD_QUESTIONS = [
  {
    key: "caught_in_on_between",
    label: "Could I be caught in, on or between anything?",
    examples: ["Pinch points", "Rotating plant", "Moving machinery", "Stored materials"],
  },
  {
    key: "slip_trip_fall",
    label: "Could I slip, trip, fall or lose my footing?",
    examples: [
      "Uneven ground",
      "Mud",
      "Trenches",
      "Holes",
      "Steps",
      "Trip hazards",
      "Components distributed on the ground",
    ],
  },
  {
    key: "strain_overexert",
    label: "Could I strain or overexert myself?",
    examples: ["Lifting", "Pushing", "Repetitive work", "Awkward posture", "Heavy components"],
  },
  {
    key: "struck_by",
    label: "Could I be struck by moving plant, vehicles or falling objects?",
    examples: ["Excavators", "Telehandlers", "Reversing vehicles", "Trailers", "Suspended loads", "Falling components"],
  },
  {
    key: "risk_to_self_or_others",
    label: "Could my work place me or other people at risk?",
    examples: [
      "Shared work areas",
      "Exclusion zones",
      "Other crews",
      "Access to work areas",
      "Excavators working nearby",
      "Tubes or modules being staged by a telehandler",
    ],
  },
  {
    key: "hazardous_energy",
    label: "Could I come into contact with hazardous energy or services?",
    examples: ["Electricity", "Underground services", "Overhead powerlines", "Stored energy", "Gas", "Water", "Communications services"],
  },
  {
    key: "noise",
    label: "Could noise from my work or nearby activities affect me?",
    examples: ["Piling operations", "Drilling", "Grinding", "Heavy plant", "Noisy tools"],
  },
  {
    key: "line_of_fire",
    label: "Could anything move unexpectedly and place me or someone else in the line of fire?",
    examples: ["Plant movement", "Shifting loads", "Dropped loads", "Unstable materials", "Slipping tools", "Stored-energy release"],
  },
  {
    key: "weather",
    label: "Could today's weather affect the safe completion of the task?",
    examples: ["Heat stress", "Cold", "High winds", "Rain", "Lightning", "Poor visibility", "Frost", "Dust"],
  },
  {
    key: "fitness_for_task",
    label: "Could my physical or mental condition affect the safe completion of today's task?",
    examples: ["Fatigue", "Illness", "Injury", "Soreness", "Medication", "Stress", "Reduced concentration"],
    privacyNote:
      "Only describe how this affects your fitness for the task and any restrictions or controls needed — no diagnosis or medical details required.",
  },
  {
    key: "anything_else",
    label: "Is there anything else that could hurt me or someone else?",
    examples: [],
  },
] as const;

export const FINAL_DECLARATIONS = [
  {
    key: "identified_hazards",
    label: "I have identified the hazards associated with today's work.",
  },
  { key: "implemented_controls", label: "I have implemented the required controls." },
  {
    key: "will_stop_if_changed",
    label: "If conditions change, I will stop and reassess before continuing.",
  },
  {
    key: "satisfied_can_complete_safely",
    label: "I am satisfied that the task can be completed safely.",
  },
] as const;

export const SIGNON_CONFIRMATION_TEXT =
  "I have reviewed and understood this Daily Task Safety Awareness assessment, including the identified hazards and controls.";

export const RISK_RATINGS = ["low", "medium", "high", "extreme"] as const;

export const RISK_RATING_DEFINITIONS: {
  key: (typeof RISK_RATINGS)[number];
  label: string;
  description: string;
}[] = [
  {
    key: "low",
    label: "Low",
    description:
      "Unlikely to happen, and if it did, would only cause minor injury (e.g. first aid only).",
  },
  {
    key: "medium",
    label: "Medium",
    description:
      "Could plausibly happen and could cause an injury needing medical treatment beyond first aid.",
  },
  {
    key: "high",
    label: "High",
    description:
      "Likely to happen without further controls, and could cause a serious or long-term injury.",
  },
  {
    key: "extreme",
    label: "Extreme",
    description:
      "Could realistically result in death or permanent disability. Always requires supervisor intervention.",
  },
];

export const SUPERVISOR_CHECKLIST = [
  { key: "taskUnderstood", label: "The task is understood and appropriate for the crew." },
  { key: "hazardsAppropriate", label: "The identified hazards are appropriate for the task." },
  { key: "controlsSuitable", label: "The controls in place are suitable for the identified hazards." },
  { key: "workersCompetentFit", label: "The workers involved are competent and fit for the task." },
  {
    key: "additionalHazardsDiscussed",
    label: "Any additional hazards or changes have been discussed with the crew.",
  },
  { key: "stopWorkResolved", label: "Any stop-work items raised have been resolved." },
  {
    key: "highRiskReviewed",
    label: "Any high or extreme residual risk ratings have been reviewed.",
  },
  { key: "permitsConfirmed", label: "Any required permits have been confirmed as issued and valid." },
] as const;
export const SEED_TEAMS = [
  "Trucks",
  "Distribution",
  "Staging",
  "Logistics",
  "Quality inspections",
  "Piling",
  "Piling remediation",
  "Post-head installation",
  "Motor mount installation",
  "Slew drive installation",
  "Central components distribution",
  "Central components installation",
  "Tubes installation",
  "Splice plates installation",
  "Rails installation",
  "Spring and damper installation",
  "Alignment",
  "Closing post-heads",
  "Remediation",
  "Waste management",
  "Surveying",
  "Labels and end caps",
  "Other",
];

export const SEED_SWMS = [
  "Distribution of components and equipment in the field",
  "Pile remediation and painting",
  "Piling operations",
  "Pull-out testing",
  "Driving on public roads and on site",
  "Hot works",
  "Pile replacement",
  "Manual handling",
  "Vehicle and plant recovery",
  "Loading and unloading trucks using a telehandler or forklift",
  "Maintenance and servicing",
  "Outdoor work, heat and lightning",
  "Refuelling mobile plant and vehicles",
  "Telehandler operations for lifting, moving and placing loads on a construction site",
  "General site works",
  "Drone operations",
  "Other",
];

export const SEED_PPE: { label: string; preselected: boolean }[] = [
  { label: "Hard hat", preselected: true },
  { label: "Hand protection or gloves", preselected: false },
  { label: "Safety glasses", preselected: true },
  { label: "High-visibility clothing", preselected: true },
  { label: "Long sleeves and long pants", preselected: true },
  { label: "Steel-toed safety boots", preselected: true },
  { label: "Hearing protection", preselected: false },
  { label: "Double eye protection", preselected: false },
  { label: "Double hearing protection", preselected: false },
  { label: "Respiratory protection", preselected: false },
  { label: "Sun protection", preselected: false },
  { label: "Fall-protection equipment", preselected: false },
  { label: "Other", preselected: false },
];

export const SEED_PERMITS = [
  "Hot works permit",
  "Drone permit",
  "Excavation and ground penetration permit",
  "Other",
];
