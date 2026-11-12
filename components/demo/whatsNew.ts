// "What's new" — announcements for new features.
//
// Each entry points at a demo chapter. The first time someone opens that page
// after the feature is added, a "New in JSAFE" pop-up shows it and offers to
// play the demo. After that it lives in the normal demo menu, with a "New"
// badge until the `until` date.
//
// To announce a new feature: add its demo chapter, then add one line here.
// `id` must be unique and never reused (it's how each device remembers it
// has already seen the pop-up).

export type WhatsNew = {
  demo: "jsafe-demo-worker" | "jsafe-demo-supervisor" | "jsafe-demo-admin"; // which demo
  chapter: string; // the chapter id inside that demo
  id: string;
  text: string; // one or two sentences for the pop-up
  until: string; // YYYY-MM-DD: after this date, no pop-up and no "New" badge
};

export const WHATS_NEW: WhatsNew[] = [
  {
    demo: "jsafe-demo-supervisor",
    chapter: "teams",
    id: "2026-10-supervisor-my-teams",
    text: "Choose the teams you look after, and get a notification on your phone when one of them submits a Take 5 for review.",
    until: "2026-12-31",
  },
  {
    demo: "jsafe-demo-supervisor",
    chapter: "stats",
    id: "2026-10-supervisor-hazard-answers",
    text: "In Statistics, tap any of the most common hazards to see what people actually wrote for it.",
    until: "2026-12-31",
  },
  {
    demo: "jsafe-demo-admin",
    chapter: "teams",
    id: "2026-10-admin-supervisor-teams",
    text: "Supervisors now have teams. Set which teams each supervisor looks after, and they get a notification when those teams submit a Take 5.",
    until: "2026-12-31",
  },
  {
    demo: "jsafe-demo-admin",
    chapter: "export",
    id: "2026-11-admin-export-10pm",
    text: "Today's export ZIP is now ready after 10pm Sydney time, so it includes every supervisor review done during the day.",
    until: "2026-12-31",
  },
  {
    demo: "jsafe-demo-admin",
    chapter: "lists",
    id: "2026-11-admin-site-lists",
    text: "New Site lists page: add, rename or remove the Teams, SWMS, PPE and Permits workers pick from.",
    until: "2027-01-31",
  },
];
