"use client";

import { useEffect, useState } from "react";
import DemoPlayer, { DemoChapter, DemoScene } from "./DemoPlayer";
import { Avatar, Btn, Card, GRADIENT, Header, I, Pill, SavedToast, Signing, Typing } from "./mock";

// The worker demo follows the real app screen by screen, with a made-up
// worker (Alex Nguyen) so nobody's real name appears.

const WHO = "Alex Nguyen";
const WHO_SHORT = "Alex N";
const TEAM = "Rails installation";

// The real worker home header: JSAFE, the project, the slogan and greeting.
function HomeHeader({ greeting = true }: { greeting?: boolean }) {
  return (
    <div className="px-3.5 pt-4 pb-3.5 text-white rounded-b-2xl" style={{ background: GRADIENT }}>
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-[11px] font-black">
          J
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold tracking-wide leading-none">JSAFE</p>
          <p className="text-[10px] font-semibold mt-0.5 truncate">Blind Creek Solar Farm</p>
        </div>
      </div>
      <p className="mt-2 text-[8.5px] text-emerald-50/90">851 Tarago Road, Lake George NSW 2581</p>
      <p className="mt-1.5 text-[10.5px] font-semibold">Take 5. Work safe. Go home safe.</p>
      {greeting && (
        <div className="mt-1.5 pt-1.5 border-t border-white/20">
          <p className="text-[12px] font-bold leading-tight">Good morning</p>
          <p className="text-[9px] text-emerald-50/90">Wednesday 29 October</p>
        </div>
      )}
    </div>
  );
}

// ---------- Home & start ----------

function Home() {
  const tile = (id: string, icon: string, title: string, text: string, main = false, blue = false) => (
    <div
      data-demo={id}
      className={`flex items-center gap-2.5 rounded-2xl p-2.5 cursor-pointer ${
        main ? "bg-emerald-700 text-white shadow" : "bg-white border border-neutral-200 shadow-sm"
      }`}
    >
      <span
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          main ? "bg-white/15" : blue ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
        }`}
      >
        <I name={icon} className="w-4 h-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-bold leading-tight">{title}</span>
        <span className={`block text-[9.5px] ${main ? "text-emerald-50/85" : "text-neutral-500"}`}>{text}</span>
      </span>
      <span className={main ? "text-white" : "text-neutral-300"}>›</span>
    </div>
  );
  return (
    <div className="h-full flex flex-col">
      <HomeHeader />
      <div className="px-3 pt-3 space-y-2">
        {tile("start", "plus", "Start new Take 5", "Your pre-task assessment", true)}
        {tile("signon", "pen", "Sign on to a crew", "Join today's assessment")}
        {tile("mine", "list", "My assessments", "Drafts & past records", false, true)}
      </div>
      <p className="mt-auto pb-3 text-center text-[9px] text-neutral-400">Daily Task Safety Awareness</p>
    </div>
  );
}

function StartScreen({ picked }: { picked: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <HomeHeader greeting={false} />
      <div className="px-3 pt-3 space-y-2">
        <p className="text-[10px] font-semibold text-emerald-700">‹ Back</p>
        <Card>
          <p className="text-[13px] font-bold">Start new Take 5</p>
          <p className="text-[9.5px] text-neutral-500">Find your name, then tap start.</p>
          <p className="mt-2 text-[10px] font-semibold text-neutral-700">Who are you?</p>
          <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2 py-1.5 text-[11px]">
            <I name="search" className="w-3 h-3 text-neutral-400" />
            {picked ? <span>{WHO}</span> : <Typing text="Alex" />}
          </div>
          {!picked && (
            <div className="mt-1.5 rounded-lg border border-neutral-200 divide-y divide-neutral-100">
              <div data-demo="name" className="flex items-center gap-2 px-2 py-1.5 cursor-pointer">
                <Avatar name={WHO} />
                <span className="text-[11px] font-medium">{WHO}</span>
              </div>
              <div className="px-2 py-1.5 text-[10px] text-emerald-700 font-semibold">+ Add &quot;Alex&quot; as a new worker</div>
            </div>
          )}
          {picked && (
            <Btn id="go" className="mt-3">
              Start today&apos;s Take 5
            </Btn>
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------- The 12 steps ----------

function Step({
  n,
  title,
  children,
  next = "Continue",
  nextId = "continue",
  viewing = false,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  next?: string;
  nextId?: string;
  viewing?: boolean;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-3 pt-3 pb-2.5 text-white" style={{ background: GRADIENT }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[8.5px] text-emerald-50/85">
              {WHO_SHORT} · {TEAM}
            </p>
            <p className="text-[12.5px] font-bold leading-tight">{title}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] font-semibold">{n}/12</span>
            {!viewing && <SavedToast />}
          </div>
        </div>
        <div className="mt-2 h-1 bg-white/25 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: `${(n / 12) * 100}%` }} />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden px-3 pt-2.5 space-y-2">{children}</div>
      <div className="p-3 flex gap-2 border-t border-neutral-200 bg-white">
        <Btn tone="white" className="flex-1">
          Back
        </Btn>
        <Btn id={nextId} className={`flex-1 ${nextId === "none" ? "opacity-40" : ""}`}>
          {next}
        </Btn>
      </div>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-bold text-neutral-900 leading-snug">{children}</p>;
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-[9.5px] text-neutral-500 leading-snug">{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9.5px] font-semibold text-neutral-700 mb-0.5">{label}</p>
      <div className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-[10.5px] text-neutral-800">
        {children}
      </div>
    </div>
  );
}

function YesNo({ value }: { value: "yes" | "no" }) {
  const on = "border-2 border-emerald-600 bg-emerald-50 text-emerald-800";
  const onNo = "border-2 border-neutral-700 bg-neutral-100 text-neutral-900";
  const off = "border border-neutral-300 text-neutral-500 bg-white";
  return (
    <div className="mt-1 flex gap-1.5">
      <div className={`flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg ${value === "yes" ? on : off}`}>Yes</div>
      <div className={`flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg ${value === "no" ? onNo : off}`}>No</div>
    </div>
  );
}

function QBox({ q, a }: { q: string; a: "yes" | "no" }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-2">
      <p className="text-[10px] font-medium text-neutral-900 leading-snug">{q}</p>
      <YesNo value={a} />
    </div>
  );
}

function Tick({ label, on = true }: { label: string; on?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
        on ? "border-emerald-300 bg-emerald-50" : "border-neutral-200 bg-white"
      }`}
    >
      <span
        className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
          on ? "bg-emerald-700 text-white" : "border border-neutral-300"
        }`}
      >
        {on && <I name="check" className="w-2.5 h-2.5" />}
      </span>
      <span className="text-[10px] text-neutral-800 leading-snug">{label}</span>
    </div>
  );
}

function Details() {
  return (
    <Step n={1} title="Assessment details">
      <H>Assessment details</H>
      <Field label="Date and time">Wed 29 Oct 2026, 6:45 am</Field>
      <Field label="Team">{TEAM} ▾</Field>
      <Field label="Location or work area">Block C, rows 41–48</Field>
      <Field label="Today's tasks">
        <Typing text="Install rails on rows 41–48" delay={300} speed={60} />
      </Field>
    </Step>
  );
}

function PlanTask() {
  return (
    <Step n={2} title="Plan the task">
      <H>Step 1 — Plan the task</H>
      <Note>If you select No, stop and speak to your supervisor before continuing.</Note>
      <QBox q="Do I understand today's task?" a="yes" />
      <QBox q="Do I have the required skills, training and licences for the task?" a="yes" />
      <QBox q="Do I have everything required to complete the task safely?" a="yes" />
      <QBox q="Are my tools and equipment in good condition?" a="yes" />
    </Step>
  );
}

function Swms() {
  return (
    <Step n={3} title="SWMS">
      <H>SWMS I work under</H>
      <div className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-[10px] text-neutral-400">
        <I name="search" className="w-3 h-3" /> Search SWMS...
      </div>
      <Tick label="Distribution of components and equipment in the field" on={false} />
      <Tick label="Manual handling" />
      <Tick label="General site works" />
      <Tick label="Outdoor work, heat and lightning" />
      <Tick label="Piling operations" on={false} />
    </Step>
  );
}

function Ppe() {
  return (
    <Step n={4} title="PPE">
      <H>PPE required for today&apos;s task</H>
      <Note>Select the PPE required for today&apos;s task.</Note>
      <div className="grid grid-cols-2 gap-1.5">
        <Tick label="Hard hat" />
        <Tick label="Gloves" />
        <Tick label="Safety glasses" />
        <Tick label="Hi-vis clothing" />
        <Tick label="Long sleeves & pants" />
        <Tick label="Steel-toed boots" />
        <Tick label="Hearing protection" on={false} />
        <Tick label="Sun protection" />
      </div>
      <Note>The usual ones are already ticked for you.</Note>
    </Step>
  );
}

function Permits() {
  return (
    <Step n={5} title="Permits">
      <H>Does today&apos;s task require a permit?</H>
      <div className="flex gap-1.5">
        <div className="flex-1 text-center text-[10px] font-semibold py-2 rounded-lg border border-neutral-300 bg-white text-neutral-500">
          Required
        </div>
        <div className="flex-1 text-center text-[10px] font-semibold py-2 rounded-lg border-2 border-emerald-600 bg-emerald-50 text-emerald-800">
          Not required
        </div>
      </div>
      <Note>If a permit is needed, pick it (hot works, drone, excavation…) and add the reference number.</Note>
    </Step>
  );
}

function Access() {
  return (
    <Step n={6} title="Access to work area">
      <H>Stop, look, think — access to the work area</H>
      <p className="text-[10.5px] font-medium">Is my usual access route still safe?</p>
      <YesNo value="yes" />
      <Note>Answer No and the app asks for details and a safer route, and flags it for your supervisor.</Note>
    </Step>
  );
}

function Changes() {
  return (
    <Step n={7} title="Changes on site">
      <H>Have I noticed any changes that could affect today&apos;s work?</H>
      <YesNo value="no" />
      <Note>For example new excavations, plant movements, exclusion zones, deliveries, soft ground or weather.</Note>
    </Step>
  );
}

function LookAround() {
  const [s, setS] = useState(20);
  useEffect(() => {
    if (s <= 0) return;
    const t = window.setTimeout(() => setS((v) => v - 1), 140);
    return () => window.clearTimeout(t);
  }, [s]);
  return (
    <Step n={8} title="Look around">
      <div className="h-full flex flex-col items-center justify-center text-center px-2 pb-6">
        <p className="text-[14px] font-semibold text-neutral-900">Now, look around you.</p>
        <p className="mt-2 text-[10.5px] text-neutral-700">
          Take in your work area. What could hurt you? What hazards do you see?
        </p>
        <div className="mt-5">
          {s > 0 ? (
            <span className="text-4xl font-bold text-emerald-700 tabular-nums">{s}</span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-700">You can continue now.</span>
          )}
        </div>
      </div>
    </Step>
  );
}

function HazardCardTop() {
  return (
    <Step n={9} title="Identify hazards" nextId="none">
      <H>Step 2.1 — Identify hazards</H>
      <div className="rounded-lg border border-neutral-200 bg-white p-2 space-y-1.5">
        <p className="text-[10px] font-medium leading-snug">Could I be caught in, on or between anything?</p>
        <YesNo value="yes" />
        <Field label="Hazard description">Pinch points lifting rails onto posts</Field>
        <div
          data-demo="photo"
          className="flex items-center justify-center gap-1 text-[9.5px] font-semibold py-1.5 rounded-lg border border-dashed border-emerald-400 text-emerald-700 cursor-pointer"
        >
          <I name="camera" className="w-3 h-3" /> Photo of the hazard (optional)
        </div>
        <div className="flex items-center gap-1 text-[9.5px]">
          <span className="font-semibold text-neutral-700">Initial risk rating</span>
          <Pill tone="orange">High</Pill>
        </div>
      </div>
    </Step>
  );
}

function HazardCardBottom() {
  return (
    <Step n={9} title="Identify hazards">
      <div className="rounded-lg border border-neutral-200 bg-white p-2 space-y-1.5">
        <div className="flex gap-1.5">
          <div className="w-12 h-12 rounded-lg" style={{ background: "linear-gradient(160deg,#94a3b8,#475569 60%,#1e293b)" }} />
          <p className="text-[9px] text-neutral-500 self-center">Hazard photo added ✓</p>
        </div>
        <Field label="Controls to be implemented">Gloves on, two-person lift, keep hands clear of the rail ends</Field>
        <Field label="Person responsible for the control">{WHO}</Field>
        <Tick label="Control has been implemented" />
        <div className="flex items-center gap-1 text-[9.5px]">
          <span className="font-semibold text-neutral-700">Residual risk rating</span>
          <Pill tone="green">Low</Pill>
        </div>
        <p className="text-[9.5px] text-emerald-700 font-semibold">+ Save as a reusable answer for {TEAM}</p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-2">
        <p className="text-[10px] font-medium leading-snug">Could I slip, trip, fall or lose my footing?</p>
        <YesNo value="no" />
      </div>
    </Step>
  );
}

function NewHazard() {
  return (
    <Step n={10} title="New hazards">
      <H>Was a new hazard identified today that is not currently covered by the selected SWMS?</H>
      <YesNo value="no" />
      <Note>Answer Yes and describe it with immediate controls — your supervisor must review it.</Note>
    </Step>
  );
}

function FinalCheck() {
  return (
    <Step n={11} title="Final check">
      <H>Final check</H>
      <Tick label="I have identified the hazards associated with today's work." />
      <Tick label="I have implemented the required controls." />
      <Tick label="If conditions change, I will stop and reassess before continuing." />
      <Tick label="I am satisfied that the task can be completed safely." />
    </Step>
  );
}

function YourSignature() {
  return (
    <Step n={12} title="Sign & submit" nextId="none">
      <H>Your signature</H>
      <Note>
        {WHO}: &ldquo;I have reviewed and understood this Daily Task Safety Awareness assessment,
        including the identified hazards and controls.&rdquo;
      </Note>
      <Signing />
      <div className="flex gap-1.5">
        <Btn tone="white" className="flex-1">Clear</Btn>
        <Btn id="save-sig" className="flex-1">Confirm signature</Btn>
      </div>
    </Step>
  );
}

function TeamAndSubmit() {
  return (
    <Step n={12} title="Sign & submit" nextId="none">
      <div className="rounded-lg bg-emerald-50 border border-emerald-300 px-2 py-1.5 text-[10px] font-medium text-emerald-800">
        ✓ Signed 6:58 am
      </div>
      <H>Team sign-on</H>
      <Note>Anyone else on the crew can sign now, or later from their own phone. Skip it if it&apos;s just you.</Note>
      <div className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-[10px] text-neutral-400">
        <I name="search" className="w-3 h-3" /> Search a team member&apos;s name...
      </div>
      <H>Review before submitting</H>
      <Note>When you submit, it goes to supervisor review and can no longer be edited by you.</Note>
      <Btn id="submit">Submit for supervisor review</Btn>
    </Step>
  );
}

function Submitted() {
  return (
    <Step n={12} title="Sign & submit" nextId="none">
      <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2 space-y-1.5">
        <p className="text-[11px] font-semibold text-emerald-800">Submitted — awaiting supervisor review.</p>
        <p className="text-[10px] text-emerald-800">You can now invite team members to sign on.</p>
        <Btn id="copy" tone="white">
          Copy sign-on link
        </Btn>
        <p className="text-[9.5px] text-emerald-800">Get notified when it&apos;s reviewed</p>
      </div>
    </Step>
  );
}

// ---------- Signing on to someone else's ----------

function CrewList() {
  const row = (id: string | undefined, team: string, who: string, where: string) => (
    <div data-demo={id} className="relative flex items-center gap-2 overflow-hidden rounded-xl border border-neutral-200 bg-white pl-3 pr-2 py-2 cursor-pointer">
      <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
      <span className="flex-1 min-w-0">
        <span className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-bold truncate">{team}</span>
          <Pill tone="amber">Awaiting review</Pill>
        </span>
        <span className="block text-[9px] text-neutral-500">
          {who} · {where}
        </span>
      </span>
    </div>
  );
  return (
    <div className="h-full flex flex-col">
      <HomeHeader greeting={false} />
      <div className="px-3 pt-3 space-y-2">
        <p className="text-[10px] font-semibold text-emerald-700">‹ Back</p>
        <Card>
          <p className="text-[13px] font-bold">Sign on to a crew</p>
          <p className="text-[9.5px] text-neutral-500">Find your crew&apos;s Take 5 for today, read it, then sign.</p>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2 py-1.5 text-[10px] text-neutral-400">
            <I name="search" className="w-3 h-3" /> Search team, name or location...
          </div>
          <div className="mt-2 space-y-1.5">
            {row("crew", TEAM, WHO, "Block C")}
            {row(undefined, "Piling", "Chris Doukas", "Block A")}
            {row(undefined, "Staging", "Elena Kovac", "Laydown 2")}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Viewing() {
  return (
    <Step n={1} title="Assessment details" viewing>
      <div className="rounded-lg bg-blue-50 border border-blue-300 p-2 text-[9.5px] font-medium text-blue-800">
        You&apos;re viewing this assessment. Only the person who completed it can change its
        contents — you can still add your signature on the Team sign-on step.
      </div>
      <Field label="Team">{TEAM}</Field>
      <Field label="Location or work area">Block C, rows 41–48</Field>
      <Field label="Today's tasks">Install rails on rows 41–48</Field>
    </Step>
  );
}

function CrewSign() {
  return (
    <Step n={12} title="Sign & submit" viewing nextId="none">
      <H>Team sign-on</H>
      <div className="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-[10.5px]">
        <I name="search" className="w-3 h-3 text-neutral-400" /> Brianna Fields
      </div>
      <Tick label="I confirm I have reviewed and understood this assessment" />
      <Signing delay={200} />
      <div className="flex gap-1.5">
        <Btn tone="white" className="flex-1">Clear</Btn>
        <Btn id="crew-signed" className="flex-1">Confirm signature</Btn>
      </div>
    </Step>
  );
}

// ---------- My assessments ----------

type Row = {
  id?: string;
  team: string;
  when: string;
  status: string;
  tone: string;
  bar: string;
  today?: boolean;
  note?: string;
  comments?: boolean;
};

const MY_ROWS: Row[] = [
  { id: "draft", team: TEAM, when: "6:45 am", status: "Draft", tone: "grey", bar: "bg-neutral-300", today: true },
  {
    id: "changes",
    team: TEAM,
    when: "6:10 am",
    status: "Changes required",
    tone: "orange",
    bar: "bg-orange-400",
    today: true,
    comments: true,
  },
  { id: "waiting", team: TEAM, when: "5:55 am", status: "Awaiting review", tone: "amber", bar: "bg-amber-400", today: true },
  { id: "approved", team: "Staging", when: "5:40 am", status: "Approved", tone: "green", bar: "bg-emerald-500", today: true },
  { id: "other", team: "Piling", when: "5:30 am", status: "Approved", tone: "green", bar: "bg-emerald-500", today: true, note: "by Chris Doukas — you signed" },
  { id: "old", team: TEAM, when: "Tue 28 Oct, 6:50 am", status: "Approved", tone: "green", bar: "bg-emerald-500", note: "Opens as PDF" },
];

function Mine({ only }: { only?: string[] }) {
  const rows = only ? MY_ROWS.filter((r) => only.includes(r.id ?? "")) : MY_ROWS;
  return (
    <div className="h-full flex flex-col">
      <HomeHeader greeting={false} />
      <div className="px-3 pt-2.5 space-y-2">
        <Card>
          <p className="text-[13px] font-bold">My assessments</p>
          <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-neutral-300 px-2 py-1.5 text-[10.5px]">
            <I name="search" className="w-3 h-3 text-neutral-400" /> {WHO}
          </div>
          <div className="mt-2 space-y-1.5">
            {rows.map((r) => (
              <div
                key={r.id}
                data-demo={r.id}
                className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white pl-3 pr-2 py-1.5 cursor-pointer"
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${r.bar}`} />
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10.5px] font-bold truncate">{r.team}</span>
                  <Pill tone={r.tone}>{r.status}</Pill>
                </div>
                <p className="text-[8.5px] text-neutral-500 mt-0.5">
                  {r.today && (
                    <span className="mr-1 px-1 py-px rounded bg-blue-100 text-blue-800 text-[7.5px] font-bold">TODAY</span>
                  )}
                  {r.when}
                  {r.note ? ` · ${r.note}` : ""}
                </p>
                {r.comments && (
                  <p className="text-[8.5px] font-semibold text-amber-700 mt-0.5">View supervisor comments ▾</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DraftOpen() {
  return (
    <Step n={7} title="Changes on site">
      <H>Have I noticed any changes that could affect today&apos;s work?</H>
      <YesNo value="no" />
      <Note>Picked up right where you left off — everything you filled in is still here.</Note>
    </Step>
  );
}

function ChangesOpen() {
  return (
    <Step n={9} title="Identify hazards">
      <div className="rounded-lg bg-amber-50 border-2 border-amber-400 p-2 text-[9.5px] text-amber-900">
        <p className="font-semibold">Changes requested by Jordan Micallef (Version 1):</p>
        <p className="mt-0.5">Add the spotter for the telehandler lifts.</p>
      </div>
      <Field label="Controls to be implemented">
        Gloves on, two-person lift, <span className="bg-emerald-100">spotter for telehandler lifts</span>
      </Field>
      <Note>Fix what was asked, then sign and submit again. It goes back as version 2 and your crew signs again.</Note>
    </Step>
  );
}

function LockedView() {
  return (
    <Step n={1} title="Assessment details" viewing>
      <div className="rounded-lg bg-blue-50 border border-blue-300 p-2 text-[9.5px] font-medium text-blue-800">
        You&apos;re viewing this assessment. Only the person who completed it can change its contents —
        you can still add your signature on the Team sign-on step.
      </div>
      <Field label="Team">{TEAM}</Field>
      <Field label="Today's tasks">Install rails on rows 41–48</Field>
      <Note>Waiting for review, so it&apos;s locked — even for you as the author.</Note>
    </Step>
  );
}

function ApprovedOpen() {
  return (
    <Step n={12} title="Sign & submit" nextId="none">
      <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-2 space-y-1.5">
        <p className="text-[11px] font-semibold text-emerald-800">This assessment has been approved.</p>
        <div
          data-demo="reassess"
          className="text-center text-[10px] font-semibold py-2 rounded-lg border-2 border-amber-500 text-amber-700 bg-white cursor-pointer"
        >
          Conditions have changed — reassess
        </div>
      </div>
      <Note>Things changed after approval? Reassess makes a new version for your supervisor, and your crew signs again.</Note>
    </Step>
  );
}

function Reassess() {
  return (
    <div className="h-full flex flex-col">
      <Header title="Reassess" sub="Conditions have changed" back="Back" />
      <div className="px-3 pt-2.5 space-y-2">
        <div className="rounded-lg bg-amber-50 border border-amber-300 p-2 text-[9.5px] text-amber-900">
          This creates <b>version 2</b> of this JSAFE. Your team will need to sign again for this version.
        </div>
        <Field label="What has changed?">Wind picked up — over 40 km/h</Field>
        <Field label="New controls (if any)">Stop lifting rails until the wind drops</Field>
        <Signing delay={300} />
      </div>
    </div>
  );
}

function OtherView() {
  return (
    <Step n={1} title="Assessment details" viewing>
      <div className="rounded-lg bg-blue-50 border border-blue-300 p-2 text-[9.5px] font-medium text-blue-800">
        You&apos;re viewing this assessment. Only the person who completed it can change its contents —
        you can still add your signature on the Team sign-on step.
      </div>
      <Field label="Team">Piling</Field>
      <Field label="Completed by">Chris Doukas</Field>
      <Note>Someone else&apos;s Take 5: you can read it and sign on, but not change it.</Note>
    </Step>
  );
}

function PdfView() {
  return (
    <div className="h-full flex flex-col bg-neutral-200">
      <div className="px-3 py-2 bg-neutral-800 text-white text-[9.5px] flex items-center justify-between">
        <span>JSAFE_Alex-Nguyen_2026-10-28.pdf</span>
        <span className="text-neutral-300">Share ↑</span>
      </div>
      <div className="m-3 flex-1 rounded bg-white shadow p-3 space-y-1.5">
        <p className="text-[11px] font-bold">Daily Task Safety Awareness</p>
        <p className="text-[8.5px] text-neutral-500">Blind Creek Solar Farm · Tue 28 Oct 2026</p>
        {[70, 90, 60, 85, 75, 50, 80, 65].map((w, n) => (
          <div key={n} className="h-1.5 rounded bg-neutral-200" style={{ width: `${w}%` }} />
        ))}
        <p className="pt-1 text-[8.5px] font-semibold text-emerald-700">Approved by Jordan Micallef</p>
      </div>
    </div>
  );
}

function Rules() {
  const rule = (tone: string, title: string, text: string) => (
    <div className="rounded-lg border border-neutral-200 bg-white p-2">
      <div className="flex items-center gap-1.5">
        <Pill tone={tone}>{title}</Pill>
      </div>
      <p className="mt-1 text-[9.5px] text-neutral-700 leading-snug">{text}</p>
    </div>
  );
  return (
    <div className="h-full flex flex-col">
      <Header title="Who can change what" sub="My assessments" />
      <div className="px-3 pt-2.5 space-y-1.5">
        {rule("grey", "Your draft, today", "Keep editing any time until you submit.")}
        {rule("orange", "Changes required", "Fix it and resubmit — your crew signs the new version.")}
        {rule("amber", "Waiting for review", "Locked. Read it, crew can still sign on.")}
        {rule("green", "Approved", "Things changed? Reassess — new version, crew signs again.")}
        {rule("blue", "Someone else's / past days", "Read only. Past days open as a PDF.")}
      </div>
    </div>
  );
}

// ---------- The three demos ----------

const START_SCENES: DemoScene[] = [
  {
    title: "Your JSAFE home",
    text: "Scan the QR code on site to get here. To write today's Take 5, tap Start new Take 5.",
    target: "start",
    wait: 2600,
    render: () => <Home />,
  },
  {
    title: "Who are you?",
    text: "Start typing your name and tap it. New on site? Tap “Add as a new worker” and you're in.",
    target: "name",
    wait: 2000,
    render: () => <StartScreen picked={false} />,
  },
  {
    title: "Start today's Take 5",
    text: "Tap Start. No signal? You can still fill it in — it sends as soon as you're back in range.",
    target: "go",
    render: () => <StartScreen picked />,
  },
  {
    title: "Step 1 of 12 · Assessment details",
    text: "Date and time are filled in for you. Pick your team, where you're working, and what today's tasks are.",
    target: "continue",
    wait: 3200,
    render: () => <Details />,
  },
  {
    title: "Step 2 of 12 · Plan the task",
    text: "Six quick Yes/No questions. Any No means stop and speak to your supervisor before you start.",
    target: "continue",
    wait: 2800,
    render: () => <PlanTask />,
  },
  {
    title: "Step 3 of 12 · SWMS",
    text: "Tick the SWMS you're working under today. Use the search to find one fast.",
    target: "continue",
    render: () => <Swms />,
  },
  {
    title: "Step 4 of 12 · PPE",
    text: "The usual PPE is already ticked. Add anything extra the task needs.",
    target: "continue",
    render: () => <Ppe />,
  },
  {
    title: "Step 5 of 12 · Permits",
    text: "Does the task need a permit? If yes, pick which one and add the reference number.",
    target: "continue",
    render: () => <Permits />,
  },
  {
    title: "Step 6 of 12 · Access to work area",
    text: "Is your usual way in still safe? If not, the app asks for details and a safer route.",
    target: "continue",
    render: () => <Access />,
  },
  {
    title: "Step 7 of 12 · Changes on site",
    text: "Anything new since yesterday — excavations, plant, deliveries, weather? Add each change and how it's controlled.",
    target: "continue",
    render: () => <Changes />,
  },
  {
    title: "Step 8 of 12 · Look around",
    text: "A 20-second pause to actually look at your work area before naming the hazards. (Sped up here.)",
    target: "continue",
    wait: 3600,
    render: () => <LookAround />,
  },
  {
    title: "Step 9 of 12 · Identify hazards",
    text: "Answer each hazard question. For every Yes, describe the hazard, add a photo if you like, and rate the risk.",
    target: "photo",
    wait: 3000,
    render: () => <HazardCardTop />,
  },
  {
    title: "Controls & residual risk",
    text: "Add the controls, who's responsible, tick once it's in place, and rate the risk again. Save answers your team uses often.",
    target: "continue",
    wait: 3400,
    render: () => <HazardCardBottom />,
  },
  {
    title: "Step 10 of 12 · New hazards",
    text: "Found something today that the SWMS doesn't cover? Say Yes, describe it, and your supervisor must review it.",
    target: "continue",
    render: () => <NewHazard />,
  },
  {
    title: "Step 11 of 12 · Final check",
    text: "Four statements to confirm before you sign.",
    target: "continue",
    render: () => <FinalCheck />,
  },
  {
    title: "Step 12 of 12 · Your signature",
    text: "Sign with your finger to confirm your Take 5.",
    target: "save-sig",
    wait: 2600,
    render: () => <YourSignature />,
  },
  {
    title: "Team sign-on & submit",
    text: "Crew members can sign on now on your phone, or later on theirs. Then submit for supervisor review.",
    target: "submit",
    wait: 3000,
    render: () => <TeamAndSubmit />,
  },
  {
    title: "Submitted!",
    text: "Your supervisor gets it to review. Share the sign-on link with your crew, and turn on notifications to hear when it's reviewed.",
    render: () => <Submitted />,
  },
];

const SIGNON_SCENES: DemoScene[] = [
  {
    title: "Joining a crew's Take 5",
    text: "Not writing one today? Someone on your crew has. From home, tap Sign on to a crew.",
    target: "signon",
    wait: 2200,
    render: () => <Home />,
  },
  {
    title: "Find your crew",
    text: "Every Take 5 started today on site. Search by team, name or location and tap yours.",
    target: "crew",
    wait: 2600,
    render: () => <CrewList />,
  },
  {
    title: "Read it through",
    text: "It opens read-only so you can go through every step with Continue. Only the person who wrote it can change it.",
    target: "continue",
    wait: 3000,
    render: () => <Viewing />,
  },
  {
    title: "Sign on",
    text: "On the last step, find your name, tick that you've understood it, and sign with your finger.",
    target: "crew-signed",
    wait: 2800,
    render: () => <CrewSign />,
  },
  {
    title: "You're on the crew",
    text: "Your signature is added to the Take 5 and shows on the PDF. If it's changed later, you'll be asked to sign the new version.",
    render: () => <CrewSign />,
  },
];

const MINE_SCENES: DemoScene[] = [
  {
    title: "Your Take 5s",
    text: "From home, tap My assessments to find everything you've written or signed.",
    target: "mine",
    wait: 2200,
    render: () => <Home />,
  },
  {
    title: "Pick your name",
    text: "Your list shows each Take 5 with its status. What you can do with one depends on that status, whether you wrote it, and if it's from today.",
    target: "draft",
    wait: 3800,
    render: () => <Mine />,
  },
  {
    title: "Your draft from today",
    text: "You wrote it and haven't submitted yet, so it opens to keep editing — right where you left off.",
    wait: 2600,
    render: () => <DraftOpen />,
  },
  {
    title: "Changes required",
    text: "Your supervisor sent it back. Tap “View supervisor comments” to see why, then open it to fix it.",
    target: "changes",
    wait: 2600,
    render: () => <Mine only={["changes", "waiting", "approved"]} />,
  },
  {
    title: "Fix and resubmit",
    text: "You can change it again. Submit it and it becomes version 2 — your crew signs the new version.",
    wait: 3200,
    render: () => <ChangesOpen />,
  },
  {
    title: "Waiting for review",
    text: "Once submitted, it's locked while your supervisor reviews it — even for you. Your crew can still sign on.",
    target: "waiting",
    wait: 2400,
    render: () => <Mine only={["changes", "waiting", "approved"]} />,
  },
  {
    title: "Locked while in review",
    text: "It opens read-only. Nothing can be changed until the supervisor approves it or asks for changes.",
    wait: 2800,
    render: () => <LockedView />,
  },
  {
    title: "Approved — but things changed?",
    text: "After approval it can't be edited. If conditions change, open it and tap Reassess.",
    target: "approved",
    wait: 2400,
    render: () => <Mine only={["changes", "waiting", "approved"]} />,
  },
  {
    title: "Reassess",
    text: "Tap Conditions have changed — reassess.",
    target: "reassess",
    wait: 2200,
    render: () => <ApprovedOpen />,
  },
  {
    title: "A new version",
    text: "Say what changed and sign. It goes back to your supervisor as version 2, and your crew signs again.",
    wait: 3200,
    render: () => <Reassess />,
  },
  {
    title: "Someone else's Take 5",
    text: "You signed on to Chris's Take 5, so it's in your list too. You can read it, but only Chris can change it.",
    target: "other",
    wait: 2800,
    render: () => <Mine only={["approved", "other", "old"]} />,
  },
  {
    title: "Read only",
    text: "Someone else's Take 5 opens read-only — no changes, but you can still sign on if you haven't.",
    wait: 2600,
    render: () => <OtherView />,
  },
  {
    title: "Previous days",
    text: "Anything from a previous day can't be changed by anyone. Tap it to open the PDF.",
    target: "old",
    wait: 2600,
    render: () => <Mine only={["approved", "other", "old"]} />,
  },
  {
    title: "Save the PDF",
    text: "The PDF saves to your phone so you can keep it or send it on.",
    wait: 2400,
    render: () => <PdfView />,
  },
  {
    title: "Who can change what",
    text: "Your own draft today: edit freely. Sent back: fix and resubmit. In review: locked. Approved: reassess. Someone else's or a past day: read only.",
    render: () => <Rules />,
  },
];

const CHAPTERS: DemoChapter[] = [
  {
    id: "start",
    title: "Start new Take 5",
    text: "All 12 steps, from your name to submitting",
    icon: <I name="plus" className="w-5 h-5" />,
    scenes: START_SCENES,
  },
  {
    id: "signon",
    title: "Sign on to a crew",
    text: "Find today's Take 5, read it and sign",
    icon: <I name="pen" className="w-5 h-5" />,
    scenes: SIGNON_SCENES,
  },
  {
    id: "mine",
    title: "My assessments",
    text: "Your past Take 5s, and who can change what",
    icon: <I name="list" className="w-5 h-5" />,
    scenes: MINE_SCENES,
  },
];

export default function WorkerDemo(props: { variant?: "light" | "plain"; className?: string; autoShow?: boolean }) {
  return <DemoPlayer label="Worker" chapters={CHAPTERS} storageKey="jsafe-demo-worker" {...props} />;
}
