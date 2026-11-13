"use client";

import DemoPlayer, { DemoChapter, DemoScene } from "./DemoPlayer";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AssessmentCard,
  AutoChecks,
  AutoScroll,
  Later,
  PdfDoc,
  SitePhoto,
  Card,
  Check,
  DashHeader,
  GRADIENT,
  I,
  Input,
  NeedsReview,
  PageHeader,
  Pill,
  Signing,
  StatusPills,
  Typing,
} from "./mock";

// Supervisor demo — same screens, words and buttons as the real supervisor pages,
// with made-up people (supervisor Jordan Micallef, worker Alex Nguyen).

const ME = "Jordan Micallef";

const CHECKLIST = [
  "The task is understood and appropriate for the crew.",
  "The identified hazards are appropriate for the task.",
  "The controls in place are suitable for the identified hazards.",
  "The workers involved are competent and fit for the task.",
  "Any additional hazards or changes have been discussed with the crew.",
  "Any stop-work items raised have been resolved.",
  "Any high or extreme residual risk ratings have been reviewed.",
  "Any required permits have been confirmed as issued and valid.",
  "Any comments or notes added below have been discussed with the crew.",
];

// ---------- Screens ----------

function Dashboard({
  filter = "All",
  approvedAlex = false,
  amended = false,
  target,
}: {
  filter?: string;
  approvedAlex?: boolean;
  amended?: boolean;
  target?: "needs" | "review" | "stats" | "view" | "suggest";
}) {
  return (
    <div className="h-full flex flex-col">
      <DashHeader role="Supervisor" greeting="Good morning, Jordan" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        {filter === "All" && <NeedsReview n={approvedAlex ? 2 : 3} id="needs" />}
        {filter === "All" && (
          <div
            data-demo="stats"
            className="flex items-center gap-2 rounded-xl bg-white border border-neutral-200 px-2.5 py-1.5 shadow-sm cursor-pointer"
          >
            <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <I name="stats" className="w-3.5 h-3.5" />
            </span>
            <span className="flex-1 text-[10px] font-semibold">View statistics</span>
            <span className="text-neutral-400 text-xs">→</span>
          </div>
        )}
        {filter === "All" && (
          <div>
            <p className="text-[7.5px] font-semibold uppercase tracking-wide text-neutral-500 mb-1">Links</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5 rounded-xl bg-white border border-neutral-200 px-2 py-1.5 shadow-sm">
                <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <PhoneIcon className="w-3 h-3" />
                </span>
                <span className="text-[8.5px] font-medium text-neutral-800">Worker page</span>
              </div>
              <div
                data-demo="suggest"
                className="flex items-center gap-1.5 rounded-xl bg-white border border-neutral-200 px-2 py-1.5 shadow-sm cursor-pointer"
              >
                <span className="w-5 h-5 shrink-0 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <I name="idea" className="w-3 h-3" />
                </span>
                <span className="text-[8.5px] font-medium text-neutral-800">Suggest an idea</span>
              </div>
            </div>
          </div>
        )}
        <StatusPills active={filter} />
        <p className="text-[11px] font-bold text-neutral-900">Assessments</p>
        {!approvedAlex && (
          <AssessmentCard
            name="Alex Nguyen"
            team="Rails installation"
            when="29 Oct, 6:58 am"
            status="Awaiting Supervisor Review"
            tone="amber"
            flags={["High/Extreme risk"]}
            review
            reviewId={target === "review" ? "review" : undefined}
            viewId={target === "view" ? "view" : undefined}
            note={amended ? "Amended — v2 ready for review" : undefined}
          />
        )}
        <AssessmentCard
          name="Chris Doukas"
          team="Piling"
          when="29 Oct, 6:40 am"
          status="Awaiting Supervisor Review"
          tone="amber"
          flags={["Stop-work"]}
          review
        />
        {approvedAlex && (
          <AssessmentCard
            name="Alex Nguyen"
            team="Rails installation"
            when="29 Oct, 6:58 am"
            status="Approved"
            tone="green"
            extra={<p className="mt-1 text-[8.5px] text-neutral-500">Reviewed by {ME}</p>}
          />
        )}
      </div>
    </div>
  );
}

// The real Supervisor review page, scrolling from the summary down through
// the hazards (with photos) and the team sign-ons, to "Your review".
function ReviewPage({ v = 1, scroll = true }: { v?: number; scroll?: boolean }) {
  const card = "rounded-xl bg-white border border-neutral-200 shadow-sm p-2.5";
  const label = "text-[8px] font-semibold uppercase tracking-wide text-neutral-500";
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub={`Alex Nguyen · Version ${v}`} />
      <div className="flex-1 min-h-0 px-3 pt-2.5">
        <AutoScroll
          stops={
            scroll
              ? [
                  { at: 2000, to: "step1" },
                  { at: 3600, to: "hazards" },
                  { at: 5600, to: "excavator" },
                  { at: 7400, to: "signons" },
                ]
              : []
          }
        >
          <div className="space-y-2 pb-3">
            <div className="flex">
              <span className="text-[9.5px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800">
                Open PDF
              </span>
            </div>
            <div className={card}>
              <div className="flex flex-wrap gap-1">
                <Pill tone="amber">Awaiting Supervisor Review</Pill>
                <Pill>Version {v}</Pill>
              </div>
              <p className="mt-1.5 text-[11.5px] font-semibold leading-snug">Install rails on rows 41–48</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[9px]">
                <div>
                  <p className={label}>Date</p>29 Oct 2026
                </div>
                <div>
                  <p className={label}>Completed by</p>Alex Nguyen
                </div>
                <div>
                  <p className={label}>Team</p>Rails installation
                </div>
                <div>
                  <p className={label}>Location</p>Block C, rows 41–48
                </div>
              </div>
            </div>
            <div className={card} data-scroll="step1">
              <p className="text-[11px] font-bold">Step 1 — plan the task</p>
              {[
                "Do I understand today's task?",
                "Do I have the required skills, training and licences for the task?",
                "Do I have everything required to complete the task safely?",
                "Are my tools and equipment in good condition?",
              ].map((q) => (
                <div key={q} className="mt-1 flex items-start justify-between gap-2">
                  <span className="text-[9.5px] text-neutral-800">{q}</span>
                  <Pill tone="green">Yes</Pill>
                </div>
              ))}
            </div>
            <div className={card}>
              <p className="text-[11px] font-bold">SWMS</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Pill>Manual handling</Pill>
                <Pill>General site works</Pill>
                <Pill>Outdoor work, heat and lightning</Pill>
              </div>
              <p className="mt-2 text-[11px] font-bold">PPE</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {["Hard hat", "Gloves", "Safety glasses", "Hi-vis clothing", "Steel-toed boots"].map((x) => (
                  <Pill key={x}>{x}</Pill>
                ))}
              </div>
            </div>
            <div className={card} data-scroll="hazards">
              <p className="text-[11px] font-bold">
                Hazards identified <span className="text-neutral-400">2</span>
              </p>
              <p className="mt-1 text-[8.5px] text-neutral-500">Could I slip, trip, fall or lose my footing?</p>
              <div className="mt-1 rounded-lg border border-neutral-200 p-2">
                <p className="text-[10px] font-semibold">Open trench beside the row 44 walkway</p>
                <div className="mt-1 flex items-center gap-1 text-[8.5px]">
                  <span className="text-neutral-500">Initial</span>
                  <Pill tone="orange">high</Pill>
                  <span className="text-neutral-400">→</span>
                  <span className="text-neutral-500">Residual</span>
                  <Pill tone="green">low</Pill>
                </div>
                <div className="mt-1 rounded bg-neutral-50 px-1.5 py-1 text-[9px]">
                  <span className={`${label} block`}>Controls</span>
                  Walk the marked path only, barricade and flag the trench edge
                </div>
                <div className="mt-1 flex items-center justify-between text-[8.5px]">
                  <span className="text-neutral-600">
                    Responsible: <b className="font-medium">Alex Nguyen</b>
                  </span>
                  <Pill tone="green">Control in place</Pill>
                </div>
                <div className="mt-1.5 inline-block text-center">
                  <SitePhoto kind="trench" className="w-20 h-20 rounded-lg border border-neutral-200" />
                  <p className="text-[7.5px] text-neutral-500">hazard</p>
                </div>
              </div>
              <p data-scroll="excavator" className="mt-2 text-[8.5px] text-neutral-500">Could I be struck by moving plant, vehicles or falling objects?</p>
              <div className="mt-1 rounded-lg border border-neutral-200 p-2">
                <p className="text-[10px] font-semibold">Excavator digging next to row 44</p>
                <div className="mt-1 flex items-center gap-1 text-[8.5px]">
                  <span className="text-neutral-500">Initial</span>
                  <Pill tone="orange">high</Pill>
                  <span className="text-neutral-400">→</span>
                  <span className="text-neutral-500">Residual</span>
                  <Pill tone="green">low</Pill>
                </div>
                <div className="mt-1 rounded bg-neutral-50 px-1.5 py-1 text-[9px]">
                  <span className={`${label} block`}>Controls</span>
                  Stay outside the swing radius, eye contact with the operator before approaching
                </div>
                <div className="mt-1.5 inline-block text-center">
                  <SitePhoto kind="excavator" className="w-20 h-20 rounded-lg border border-neutral-200" />
                  <p className="text-[7.5px] text-neutral-500">hazard</p>
                </div>
              </div>
              <p className="mt-1.5 text-[9px] font-semibold text-emerald-700">Other hazard questions (10) ▾</p>
            </div>
            <div className={card}>
              <p className="text-[11px] font-bold">Final check</p>
              <p className="text-[9px] text-neutral-700">All 4 statements confirmed ✓</p>
            </div>
            <div className={card} data-scroll="signons">
              <p className="text-[11px] font-bold">
                Team sign-ons <span className="text-neutral-400">3</span>
              </p>
              {[
                ["Alex Nguyen", "6:58 am", true],
                ["Brianna Fields", "7:04 am", false],
                ["Dev Patel", "7:06 am", false],
              ].map(([n, t, p]) => (
                <div key={n as string} className="mt-1 flex items-center justify-between text-[9.5px]">
                  <span>
                    {n as string}
                    {p && <span className="ml-1 text-[7.5px] font-semibold px-1 rounded-full bg-emerald-100 text-emerald-800">Primary</span>}
                  </span>
                  <span className="text-neutral-500">{t as string}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border-2 border-amber-300 bg-white p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-[11.5px] font-bold">Your review</p>
              </div>
              <p className="text-[9px] text-neutral-500 mt-0.5">On a phone it&apos;s here, below the Take 5. On a computer it sits beside it.</p>
            </div>
          </div>
        </AutoScroll>
      </div>
    </div>
  );
}

// "Your review", filled in from top to bottom: name, the 9 checks, notes, decision.
// mode "changes" types a comment and heads for Request changes; "approve" for Approve.
function ReviewPanel({ mode, v = 1 }: { mode: "changes" | "approve"; v?: number }) {
  const changes = mode === "changes";
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub={`Alex Nguyen · Version ${v}`} />
      <div className="flex-1 min-h-0 px-3 pt-2.5">
        <AutoScroll
          stops={[
            { at: 2600, to: "checklist" },
            { at: changes ? 6200 : 5400, to: "notes" },
            { at: changes ? 9000 : 6800, to: "end" },
          ]}
        >
          <div className="rounded-xl bg-white border border-neutral-200 shadow-sm p-2.5 space-y-2 mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <p className="text-[11.5px] font-bold">Your review</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-neutral-800 mb-1">1. Reviewing supervisor</p>
              <Later at={1600} before={<Input><Typing text="Jordan" delay={300} speed={110} /></Input>}>
                <Input>{ME}</Input>
                <p className="mt-1 text-[9px] font-semibold text-emerald-700">✓ Reviewing as {ME}</p>
              </Later>
            </div>
            <div data-scroll="checklist">
              <p className="text-[10px] font-semibold text-neutral-800 mb-1">2. Checklist</p>
              <AutoChecks labels={CHECKLIST} start={2900} every={changes ? 330 : 250} />
            </div>
            <div className="space-y-1.5" data-scroll="notes">
              <p className="text-[10px] font-semibold text-neutral-800">3. Notes</p>
              <div>
                <p className="text-[9px] font-semibold text-neutral-600">Comments (optional)</p>
                <Input muted={!changes}>
                  {changes ? (
                    <Typing text="Add a spotter for the telehandler lifts near the trench." delay={6900} speed={38} />
                  ) : (
                    "Any notes for the worker, especially if requesting changes..."
                  )}
                </Input>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-neutral-600">Additional controls (optional)</p>
                <Input muted>&nbsp;</Input>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-neutral-800 mb-1">4. Decision</p>
              <div className="flex gap-1.5">
                <div
                  data-demo="changes"
                  className="flex-1 text-center text-[10px] font-semibold py-2 rounded-lg border-2 border-amber-500 text-amber-700 bg-white cursor-pointer"
                >
                  Request changes
                </div>
                <div
                  data-demo="approve"
                  className="flex-1 text-center text-[10px] font-semibold py-2 rounded-lg bg-emerald-700 text-white cursor-pointer"
                >
                  Approve
                </div>
              </div>
            </div>
          </div>
        </AutoScroll>
      </div>
    </div>
  );
}

function SignDecision({ decision, v = 1 }: { decision: "approved" | "changes"; v?: number }) {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub={`Alex Nguyen · Version ${v}`} />
      <div className="px-3 pt-2.5 overflow-hidden">
        <Card className="space-y-2">
          <p className="text-[11.5px] font-bold">Your review</p>
          <div
            className={`rounded-lg px-2 py-1.5 text-[10px] font-medium ${
              decision === "approved" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
            }`}
          >
            {decision === "approved"
              ? "Sign below to confirm this assessment is approved."
              : "Sign below to confirm you are sending this assessment back for changes."}
          </div>
          <Signing />
          <div className="flex gap-1.5">
            <div className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg border border-neutral-400 text-neutral-700">
              Clear
            </div>
            <div
              data-demo="confirm"
              className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg bg-emerald-700 text-white cursor-pointer"
            >
              Confirm signature
            </div>
          </div>
          <p className="text-[10px] font-semibold text-emerald-700">← Change decision</p>
        </Card>
      </div>
    </div>
  );
}

function Reviewed({ decision, v = 1 }: { decision: "approved" | "changes required"; v?: number }) {
  const rows: { ver: number; d: "approved" | "changes required" }[] =
    v === 2 ? [{ ver: 1, d: "changes required" }, { ver: 2, d: decision }] : [{ ver: 1, d: decision }];
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub={`Alex Nguyen · Version ${v}`} />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="rounded-xl border p-2.5 text-[10px] border-emerald-300 bg-emerald-50 text-emerald-900">
          Already reviewed by <b>{ME}</b> — <b className="capitalize">{decision}</b>.
        </div>
        <Card>
          <div className="flex flex-wrap gap-1">
            <Pill tone={decision === "approved" ? "green" : "orange"}>
              {decision === "approved" ? "Approved" : "Changes Required"}
            </Pill>
            <Pill>Version {v}</Pill>
          </div>
          <p className="mt-1.5 text-[11px] font-bold">Supervisor reviews</p>
          <div className="mt-1 space-y-1">
            {rows.map((r) => (
              <div key={r.ver} className="rounded-lg border border-neutral-200 p-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[9.5px] font-semibold">
                    Version {r.ver} · {ME}
                  </p>
                  <Pill tone={r.d === "approved" ? "green" : "orange"}>{r.d}</Pill>
                </div>
                {r.d !== "approved" && (
                  <p className="mt-0.5 text-[9px] text-neutral-700">
                    <b>Comments:</b> Add the spotter for the telehandler lifts.
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// What the worker sees on their side after you request changes.
function WorkerSide({ stage }: { stage: "list" | "fix" }) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-3.5 pt-4 pb-3.5 text-white rounded-b-2xl" style={{ background: GRADIENT }}>
        <div className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-[10px] font-black">
            J
          </span>
          <div>
            <p className="text-[13px] font-extrabold tracking-wide leading-none">JSAFE</p>
            <p className="text-[9px] text-emerald-50/90 mt-0.5">Blind Creek Solar Farm</p>
          </div>
        </div>
        <p className="mt-2 text-[9px] font-semibold text-emerald-50/90">The worker&apos;s phone · Alex Nguyen</p>
      </div>
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        {stage === "list" ? (
          <Card>
            <p className="text-[13px] font-bold">My assessments</p>
            <div className="mt-2 relative overflow-hidden rounded-xl border border-neutral-200 bg-white pl-3 pr-2 py-1.5">
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400" />
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10.5px] font-bold">Rails installation</span>
                <Pill tone="orange">Changes required</Pill>
              </div>
              <p className="text-[8.5px] text-neutral-500 mt-0.5">
                <span className="mr-1 px-1 py-px rounded bg-blue-100 text-blue-800 text-[7.5px] font-bold">TODAY</span>
                6:58 am
              </p>
              <p className="text-[8.5px] font-semibold text-amber-700 mt-0.5">View supervisor comments ▴</p>
              <div className="mt-1 rounded-lg bg-amber-50 border border-amber-200 px-1.5 py-1 text-[9px] text-amber-900">
                <b>{ME}:</b> Add the spotter for the telehandler lifts.
              </div>
            </div>
          </Card>
        ) : (
          <Card className="space-y-2">
            <p className="text-[11px] font-bold">Step 9 · Identify hazards</p>
            <div className="rounded-lg bg-amber-50 border-2 border-amber-400 p-2 text-[9.5px] text-amber-900">
              <p className="font-semibold">Changes requested by {ME} (Version 1):</p>
              <p className="mt-0.5">Add the spotter for the telehandler lifts.</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-neutral-600">Controls to be implemented</p>
              <Input>
                Gloves on, two-person lift, <span className="bg-emerald-100">spotter for telehandler lifts</span>
              </Input>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function SearchDash() {
  return (
    <div className="h-full flex flex-col">
      <DashHeader role="Supervisor" greeting="Good morning, Jordan" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <p className="text-[11px] font-bold text-neutral-900">Assessments</p>
        <div className="flex gap-1.5">
          <div className="flex-1">
            <Input>
              <Typing text="Piling" />
            </Input>
          </div>
          <span className="text-[10px] px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white font-medium">Search</span>
        </div>
        <AssessmentCard
          name="Chris Doukas"
          team="Piling"
          when="29 Oct, 6:40 am"
          status="Awaiting Supervisor Review"
          tone="amber"
          flags={["Stop-work"]}
          review
        />
        <AssessmentCard name="Chris Doukas" team="Piling" when="28 Oct, 6:35 am" status="Approved" tone="green" today={false} />
      </div>
    </div>
  );
}

// What a supervisor sees when they tap View on a Take 5 that's still a Draft.
function DraftDash() {
  return (
    <div className="h-full flex flex-col">
      <DashHeader role="Supervisor" greeting="Good morning, Jordan" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <StatusPills active="Draft" />
        <p className="text-[11px] font-bold text-neutral-900">Assessments</p>
        <AssessmentCard
          name="Alex Nguyen"
          team="Rails installation"
          when="29 Oct, 6:45 am"
          status="Draft"
          tone="grey"
          viewId="view"
        />
        <AssessmentCard name="Sam Taylor" team="Surveying" when="29 Oct, 6:31 am" status="Draft" tone="grey" />
      </div>
    </div>
  );
}

function RecordView() {
  const card = "rounded-xl bg-white border border-neutral-200 shadow-sm p-2.5";
  return (
    <div className="h-full flex flex-col">
      <div className="px-3.5 pt-3.5 pb-3 text-white rounded-b-2xl" style={{ background: GRADIENT }}>
        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/30">
          <I name="back" className="w-2.5 h-2.5" />
          Dashboard
        </span>
        <p className="mt-2 text-[15px] font-extrabold leading-tight">Alex Nguyen</p>
        <p className="text-[9.5px] text-emerald-50/90">Rails installation · 29 Oct 2026</p>
        <div className="mt-2 flex gap-1.5">
          <span data-demo="pdf" className="text-[9.5px] font-semibold px-2.5 py-1 rounded-lg bg-white text-emerald-800 cursor-pointer">
            Open PDF
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 px-3 pt-2.5">
        <AutoScroll stops={[{ at: 2200, to: "hazards" }, { at: 4200, to: "top" }]}>
          <div className="space-y-2 pb-3" data-scroll="top">
            <div className={card}>
              <div className="flex flex-wrap gap-1">
                <Pill>Draft</Pill>
                <Pill>Version 1</Pill>
              </div>
              <p className="mt-1 text-[11px] font-semibold">Install rails on rows 41–48</p>
              <p className="text-[9px] text-neutral-500">Still being filled in — you see everything written so far.</p>
            </div>
            <div className={card}>
              <p className="text-[11px] font-bold">Step 1 — plan the task</p>
              <p className="text-[9px] text-neutral-700">4 of 4 answered · all Yes</p>
            </div>
            <div className={card}>
              <p className="text-[11px] font-bold">SWMS</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Pill>Manual handling</Pill>
                <Pill>General site works</Pill>
              </div>
            </div>
            <div className={card} data-scroll="hazards">
              <p className="text-[11px] font-bold">
                Hazards identified <span className="text-neutral-400">2</span>
              </p>
              <p className="text-[9.5px] font-semibold mt-1">Open trench beside the row 44 walkway</p>
              <SitePhoto kind="trench" className="mt-1 w-14 h-14 rounded-lg" />
              <p className="text-[9.5px] font-semibold mt-1.5">Excavator digging next to row 44</p>
              <SitePhoto kind="excavator" className="mt-1 w-14 h-14 rounded-lg" />
            </div>
            <div className={card}>
              <p className="text-[11px] font-bold">
                Team sign-ons <span className="text-neutral-400">0</span>
              </p>
              <p className="text-[9px] text-neutral-500">Not signed yet.</p>
            </div>
          </div>
        </AutoScroll>
      </div>
    </div>
  );
}

// A pointer clicks through the status filters and the list changes each time.
const FILTER_LISTS: Record<string, { name: string; team: string; when: string; status: string; tone: string; review?: boolean }[]> = {
  All: [
    { name: "Alex Nguyen", team: "Rails installation", when: "29 Oct, 6:58 am", status: "Awaiting Supervisor Review", tone: "amber", review: true },
    { name: "Sam Taylor", team: "Surveying", when: "29 Oct, 6:31 am", status: "Draft", tone: "grey" },
  ],
  "To review": [
    { name: "Alex Nguyen", team: "Rails installation", when: "29 Oct, 6:58 am", status: "Awaiting Supervisor Review", tone: "amber", review: true },
    { name: "Chris Doukas", team: "Piling", when: "29 Oct, 6:40 am", status: "Awaiting Supervisor Review", tone: "amber", review: true },
  ],
  Draft: [
    { name: "Sam Taylor", team: "Surveying", when: "29 Oct, 6:31 am", status: "Draft", tone: "grey" },
    { name: "Elena Kovac", team: "Staging", when: "29 Oct, 6:20 am", status: "Draft", tone: "grey" },
  ],
  Changes: [{ name: "Dev Patel", team: "Post-head installation", when: "29 Oct, 6:12 am", status: "Changes Required", tone: "orange" }],
  Approved: [
    { name: "Brianna Fields", team: "Staging", when: "29 Oct, 6:05 am", status: "Approved", tone: "green" },
    { name: "Chris Doukas", team: "Piling", when: "28 Oct, 6:35 am", status: "Approved", tone: "green" },
  ],
};
const TOUR = ["To review", "Draft", "Changes", "Approved", "All"];

function FilterTour() {
  const pills = ["All", "To review", "Completed", "Draft", "Changes", "Approved", "Archived"];
  const counts: Record<string, number> = { All: 48, "To review": 3, Completed: 0, Draft: 2, Changes: 1, Approved: 41, Archived: 1 };
  const [step, setStep] = useState(-1);
  const [active, setActive] = useState("All");
  const [shift, setShift] = useState(0);
  const [ptr, setPtr] = useState({ x: 180, y: 260, click: false });
  const rowRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers = TOUR.map((_, i) => window.setTimeout(() => setStep(i), 900 + i * 1900));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    if (step < 0) return;
    const name = TOUR[step];
    const row = rowRef.current;
    const screen = screenRef.current;
    const pill = row?.querySelector(`[data-pill="${name}"]`) as HTMLElement | null;
    if (!row || !screen || !pill) return;
    const visible = row.parentElement!.clientWidth;
    const newShift = Math.max(0, pill.offsetLeft + pill.offsetWidth - visible + 8);
    setShift(newShift);
    const r = screen.getBoundingClientRect();
    const rr = row.parentElement!.getBoundingClientRect();
    const x = rr.left - r.left + pill.offsetLeft - newShift + pill.offsetWidth / 2;
    const y = rr.top - r.top + pill.offsetHeight / 2;
    setPtr({ x, y, click: false });
    const t1 = window.setTimeout(() => setPtr((p) => ({ ...p, click: true })), 750);
    const t2 = window.setTimeout(() => setActive(name), 850);
    const t3 = window.setTimeout(() => setPtr((p) => ({ ...p, click: false })), 1150);
    return () => [t1, t2, t3].forEach((t) => window.clearTimeout(t));
  }, [step]);

  return (
    <div ref={screenRef} className="h-full flex flex-col relative">
      <DashHeader role="Supervisor" greeting="Good morning, Jordan" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="overflow-hidden">
          <div
            ref={rowRef}
            className="flex gap-1"
            style={{ transform: `translateX(${-shift}px)`, transition: "transform .5s ease-in-out" }}
          >
            {pills.map((s) => (
              <span
                key={s}
                data-pill={s}
                className={`shrink-0 flex items-center gap-1 text-[9px] px-2 py-1 rounded-full border transition-colors ${
                  s === active
                    ? "bg-emerald-700 border-emerald-700 text-white font-semibold"
                    : "bg-white border-neutral-300 text-neutral-700"
                }`}
              >
                {s}
                <span className={`text-[8px] font-bold px-1 rounded-full ${s === active ? "bg-white/25" : "bg-neutral-100 text-neutral-600"}`}>
                  {counts[s]}
                </span>
              </span>
            ))}
          </div>
        </div>
        <p className="text-[11px] font-bold text-neutral-900">Assessments</p>
        <div key={active} className="space-y-2" style={{ animation: "demoIn .35s ease-out" }}>
          {(FILTER_LISTS[active] ?? []).map((c) => (
            <AssessmentCard key={c.name + c.when} name={c.name} team={c.team} when={c.when} status={c.status} tone={c.tone} review={c.review} />
          ))}
        </div>
      </div>

      {/* Mouse pointer */}
      <div
        className="pointer-events-none absolute z-20"
        style={{ left: ptr.x - 3, top: ptr.y - 2, transition: "left .6s ease-in-out, top .6s ease-in-out" }}
      >
        {ptr.click && (
          <span className="absolute -left-3 -top-3 w-7 h-7 rounded-full bg-emerald-400/50" style={{ animation: "demoTap .5s ease-out forwards" }} />
        )}
        <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-md" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round">
          <path d="M4 3l14 7-6 1.5L9.5 18z" />
        </svg>
      </div>
    </div>
  );
}

function Stats({ hazardsOpen = false }: { hazardsOpen?: boolean }) {
  const bars = [3, 5, 4, 6, 2, 0, 5, 7, 6, 4, 5, 3, 6, 8];
  if (hazardsOpen) {
    const answers = [
      ["Lifting rails onto the tracker", "Two-person lift, keep back straight", "medium", "low", "Alex Nguyen · Rails installation · Wed 29 Oct"],
      ["Carrying post-heads across the row", "Use the trolley, max 2 at a time", "high", "low", "Dev Patel · Post-head installation · Tue 28 Oct"],
    ];
    return (
      <div className="h-full flex flex-col">
        <PageHeader title="Statistics" sub="Last 30 days · Supervisor" />
        <div className="px-3 pt-2.5 overflow-hidden">
          <Card>
            <p className="text-[10.5px] font-bold">Most common hazards</p>
            <p className="text-[8px] text-neutral-500">Times answered &quot;Yes&quot; · tap one to see what people wrote</p>
            <div className="mt-1.5 rounded-lg bg-rose-50/60 ring-1 ring-rose-100 p-1.5">
              <div className="flex justify-between text-[9px]">
                <span>1. Could I strain or overexert myself?</span>
                <span className="font-bold">42</span>
              </div>
              <p className="mt-1 text-[8px] text-neutral-500">58 hazards written · newest first</p>
              <div className="mt-1 space-y-1">
                {answers.map(([d, c, i, r, m]) => (
                  <div key={d} className="rounded-lg border border-neutral-200 bg-white p-1.5">
                    <p className="text-[9.5px] font-semibold">
                      <span className="text-[7.5px] font-semibold uppercase text-neutral-500">Hazard </span>
                      {d}
                    </p>
                    <p className="text-[8.5px] text-neutral-700">
                      <span className="text-[7.5px] font-semibold uppercase text-neutral-500">Controls </span>
                      {c}
                    </p>
                    <div className="mt-0.5 flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1">
                        <Pill tone={i === "high" ? "orange" : "amber"}>{i}</Pill>
                        <span className="text-[8px] text-neutral-400">→</span>
                        <Pill tone="green">{r}</Pill>
                      </span>
                      <span className="text-[7.5px] font-semibold text-emerald-700 shrink-0">View JSAFE →</span>
                    </div>
                    <p className="mt-0.5 text-[7.5px] text-neutral-500">{m}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-1.5 text-[9px] text-neutral-700">2. Could I slip, trip, fall…? · 38</p>
          </Card>
        </div>
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Statistics" sub="Last 30 days · Supervisor" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="flex p-0.5 rounded-full bg-white border border-neutral-200">
          {["Daily", "Weekly", "Monthly"].map((p, n) => (
            <span
              key={p}
              className={`flex-1 text-center text-[9.5px] font-semibold py-1 rounded-full ${
                n === 0 ? "bg-emerald-700 text-white" : "text-neutral-600"
              }`}
            >
              {p}
            </span>
          ))}
        </div>
        <p className="text-[8.5px] font-semibold uppercase text-neutral-500">Today</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ["6", "JSAFEs completed"],
            ["27", "Workers signed on"],
            ["4", "Reviewed"],
          ].map(([v, l]) => (
            <div key={l} className="bg-white rounded-lg border border-neutral-200 p-1.5">
              <p className="text-[14px] font-bold">{v}</p>
              <p className="text-[8px] text-neutral-600 leading-tight">{l}</p>
            </div>
          ))}
        </div>
        <Card>
          <div className="flex justify-between">
            <p className="text-[10.5px] font-bold">JSAFEs completed</p>
            <p className="text-[12px] font-bold">109</p>
          </div>
          <div className="mt-2 h-16 flex items-end gap-0.5">
            {bars.map((b, n) => (
              <div key={n} className="flex-1 rounded-t bg-emerald-600" style={{ height: `${(b / 8) * 100}%` }} />
            ))}
          </div>
          <p className="mt-1 text-[8.5px] text-neutral-600">Average 3.6 per day · Busiest Tue, 13 Oct (7)</p>
        </Card>
        <Card>
          <p className="text-[10.5px] font-bold">Most common hazards</p>
          <p data-demo="hz1" className="text-[9px] text-neutral-700 mt-0.5 cursor-pointer">1. Could I strain or overexert myself? · 42</p>
          <p className="text-[9px] text-neutral-700">2. Could I slip, trip, fall…? · 38</p>
        </Card>
      </div>
    </div>
  );
}

function PullRefresh() {
  return (
    <div className="h-full flex flex-col relative">
      <div className="absolute left-1/2 -translate-x-1/2 top-10 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-emerald-700 animate-spin">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M20 12a8 8 0 1 1-2.3-5.7" />
          <path d="M20 4v4.5h-4.5" />
        </svg>
      </div>
      <div className="translate-y-6 h-full">
        <Dashboard />
      </div>
    </div>
  );
}

// ---------- My teams & notifications ----------

const TEAM_CHIPS = [
  "Piling",
  "Piling remediation",
  "Post-head installation",
  "Quality inspections",
  "Rails installation",
  "Remediation",
  "Splice plates installation",
  "Surveying",
];
const MY_TEAMS = ["Piling", "Rails installation"];

function MyTeamsCard({
  stage,
  locked = false,
}: {
  stage: "none" | "picking" | "saved" | "ask" | "on" | "mine";
  locked?: boolean; // the admin sets the teams on this site
}) {
  const chosen = stage !== "none" && stage !== "picking";
  return (
    <div className="rounded-xl bg-white border border-neutral-200 shadow-sm p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11.5px] font-bold">My teams</p>
          <p className="text-[8.5px] text-neutral-500 leading-snug">
            Get a notification when one of your teams submits a JSAFE for review.
          </p>
        </div>
        {stage !== "picking" && !locked && (
          <span
            data-demo="choose"
            className="shrink-0 text-[9.5px] px-2 py-1 rounded-full border border-emerald-700 text-emerald-700 font-semibold cursor-pointer"
          >
            {chosen ? "Edit" : "Choose teams"}
          </span>
        )}
      </div>

      <div className="mt-2">
        {stage === "picking" ? (
          <div>
            <p className="text-[8.5px] text-neutral-500 mb-1">Tap the teams you're responsible for.</p>
            <div className="flex flex-wrap gap-1">
              {TEAM_CHIPS.map((t) => {
                const on = MY_TEAMS.includes(t);
                return (
                  <span
                    key={t}
                    className={`text-[9px] px-2 py-1 rounded-full border font-medium ${
                      on ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-neutral-300 text-neutral-700"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {t}
                  </span>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1.5">
              <span
                data-demo="save-teams"
                className="text-[9.5px] px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
              >
                Save teams
              </span>
              <span className="text-[9.5px] px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700">
                Cancel
              </span>
            </div>
          </div>
        ) : chosen ? (
          <div className="flex flex-wrap gap-1">
            {MY_TEAMS.map((t) => (
              <span
                key={t}
                className="text-[8.5px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              >
                {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[9.5px] text-neutral-500">No teams chosen yet.</p>
        )}
        {locked && chosen && <p className="mt-1 text-[8px] text-neutral-500">Your teams are set by the admin.</p>}
      </div>

      {stage !== "picking" && (
        <div className="mt-2 pt-2 border-t border-neutral-100">
          {stage === "on" || stage === "mine" ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9.5px] text-emerald-800 font-medium">✓ Notifications are on for this device</p>
              <span className="text-[8.5px] font-semibold text-neutral-500 underline">Turn off</span>
            </div>
          ) : (
            <span
              data-demo="notify-on"
              className="inline-block text-[9.5px] px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Turn on notifications
            </span>
          )}
        </div>
      )}

      {chosen && (
        <div className="mt-2 flex p-0.5 rounded-full bg-neutral-100">
          <span
            className={`flex-1 text-center text-[9.5px] py-1 rounded-full font-semibold ${
              stage !== "mine" ? "bg-emerald-700 text-white" : "text-neutral-600"
            }`}
          >
            All teams
          </span>
          <span
            data-demo="mine"
            className={`flex-1 text-center text-[9.5px] py-1 rounded-full font-semibold cursor-pointer ${
              stage === "mine" ? "bg-emerald-700 text-white" : "text-neutral-600"
            }`}
          >
            My teams
          </span>
        </div>
      )}
    </div>
  );
}

function TeamsDash({
  stage,
  locked = false,
}: {
  stage: "none" | "picking" | "saved" | "ask" | "on" | "mine";
  locked?: boolean;
}) {
  const mine = stage === "mine";
  return (
    <div className="h-full flex flex-col relative">
      <DashHeader role="Supervisor" greeting="Good morning, Jordan" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <MyTeamsCard stage={stage} locked={locked} />
        {stage !== "picking" && (
          <>
            <StatusPills
              counts={
                mine ? { All: 12, "To review": 1, Completed: 0, Draft: 1, Changes: 0, Approved: 10, Archived: 0 } : undefined
              }
            />
            <p className="text-[11px] font-bold text-neutral-900">{mine ? "My teams' assessments" : "Assessments"}</p>
            <AssessmentCard
              name="Alex Nguyen"
              team="Rails installation"
              when="29 Oct, 6:58 am"
              status="Awaiting Supervisor Review"
              tone="amber"
              flags={["High/Extreme risk"]}
              review
            />
            {!mine && (
              <AssessmentCard
                name="Sam Taylor"
                team="Surveying"
                when="29 Oct, 6:45 am"
                status="Awaiting Supervisor Review"
                tone="amber"
                review
              />
            )}
          </>
        )}
      </div>

      {stage === "ask" && (
        <div className="absolute inset-0 bg-black/30 flex items-start justify-center pt-24 px-4">
          <div className="w-full rounded-2xl bg-white shadow-2xl p-3">
            <p className="text-[11px] font-semibold text-neutral-900">safety-app01.vercel.app wants to</p>
            <p className="mt-1 text-[10px] text-neutral-700 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Show notifications
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <span className="text-[10px] px-3 py-1.5 rounded-full border border-neutral-300 text-neutral-700 font-medium">
                Block
              </span>
              <span
                data-demo="allow"
                className="text-[10px] px-3 py-1.5 rounded-full bg-blue-600 text-white font-semibold cursor-pointer"
              >
                Allow
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bell({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function PhoneIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

// The "Suggest an idea" form, as it slides up over the dashboard.
function IdeaSheet({ sent = false }: { sent?: boolean }) {
  return (
    <div className="h-full relative">
      <Dashboard />
      <div className="absolute inset-0 bg-black/40 flex items-end">
        <div className="w-full bg-white rounded-t-2xl p-3 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 shrink-0 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <I name="idea" className="w-4 h-4" />
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-bold leading-tight">Suggest an idea</span>
              <span className="block text-[8.5px] text-neutral-500">It goes to the JSAFE admin team.</span>
            </span>
            <span className="text-neutral-400 text-[12px]">✕</span>
          </div>
          {sent ? (
            <div className="mt-3 text-center">
              <span className="mx-auto w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[14px] font-bold">✓</span>
              <p className="mt-1.5 text-[11px] font-semibold">Thanks — your idea has been sent.</p>
              <p className="text-[9px] text-neutral-600">The admin team reads every one.</p>
              <div className="mt-2.5 text-center text-[11px] font-semibold py-2 rounded-lg bg-emerald-700 text-white">Done</div>
            </div>
          ) : (
            <div className="mt-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold text-neutral-800">What would you like changed or added?</p>
              <div className="h-16 rounded-lg border border-neutral-300 px-2 py-1.5 text-[10.5px]">
                <Typing text="Show how many of my crew have signed on today" delay={400} speed={55} />
              </div>
              <div data-demo="send-idea" className="text-center text-[11px] font-semibold py-2 rounded-lg bg-emerald-700 text-white cursor-pointer">
                Send idea
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// A phone lock screen with the JSAFE notification on it.
function LockScreen() {
  return (
    <div
      className="h-full flex flex-col items-center px-3 pt-10 text-white"
      style={{ background: "linear-gradient(170deg,#1e293b 0%,#0f172a 60%,#064e3b 100%)" }}
    >
      <p className="text-[10px] text-white/70">Wednesday 29 October</p>
      <p className="text-[40px] font-semibold leading-none mt-1">7:02</p>
      <div
        data-demo="notif"
        className="mt-8 w-full rounded-2xl bg-white/90 text-neutral-900 p-2.5 shadow-lg cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-md flex items-center justify-center text-[7px] font-black text-white" style={{ background: GRADIENT }}>
            J
          </span>
          <span className="text-[8.5px] font-semibold uppercase tracking-wide text-neutral-500 flex-1">JSAFE</span>
          <span className="text-[8.5px] text-neutral-500">now</span>
        </div>
        <p className="mt-1 text-[10.5px] font-semibold">JSAFE to review · Rails installation</p>
        <p className="text-[9.5px] text-neutral-700">Alex Nguyen submitted a JSAFE for review.</p>
      </div>
    </div>
  );
}

// ---------- Demos ----------

// 2. Dashboard — how to get around it.
const DASH_SCENES: DemoScene[] = [
  {
    title: "Your dashboard",
    text: "Every Take 5 on site. The amber “Needs your review” box shows how many are waiting — tap it to see just those.",
    target: "needs",
    wait: 3000,
    render: () => <Dashboard />,
  },
  {
    title: "To review",
    text: "Today's ones waiting for you are always at the top, and reviewed ones drop to the bottom. Red tags like High/Extreme risk or Stop-work show what to look at first.",
    wait: 3600,
    render: () => <Dashboard filter="To review" />,
  },
  {
    title: "Status filters",
    text: "Tap a status — To review, Draft, Changes, Approved… — to see only those. The numbers show how many of each. Tap All to see everything again.",
    wait: 10600,
    render: () => <FilterTour />,
  },
  {
    title: "Search",
    text: "Search by worker or team to find a Take 5 fast.",
    wait: 3000,
    render: () => <SearchDash />,
  },
  {
    title: "View assessment",
    text: "Tap View on any Take 5 to open it — even a Draft that's still being filled in.",
    target: "view",
    wait: 2600,
    render: () => <DraftDash />,
  },
  {
    title: "View assessment",
    text: "You see everything written so far: answers, hazards, photos and sign-ons. Tap Open PDF for a copy you can print or send.",
    target: "pdf",
    wait: 5200,
    render: () => <RecordView />,
  },
  {
    title: "The PDF",
    text: "The whole Take 5 on one PDF — it opens straight in your browser.",
    wait: 6000,
    render: () => <PdfDoc status="DRAFT" />,
  },
  {
    title: "Pull down to refresh",
    text: "On your phone, pull down from the top of the dashboard to load the newest Take 5s.",
    render: () => <PullRefresh />,
  },
];

// 3. Review a Take 5 — from start to approved, including a round of changes.
const REVIEW_SCENES: DemoScene[] = [
  {
    title: "To review",
    text: "On your dashboard, tap Review on a Take 5 that's waiting for you.",
    target: "review",
    wait: 2600,
    render: () => <Dashboard filter="To review" target="review" />,
  },
  {
    title: "Supervisor review",
    text: "The whole Take 5 is on this page — no need to open the PDF. Scroll through the summary, every answer, each hazard with its photos and controls, and who signed on.",
    wait: 9200,
    render: () => <ReviewPage />,
  },
  {
    title: "Your review",
    text: "Type your name and tap it, tick the 9 checks, add notes, then decide. Here something needs fixing: write it in Comments — the worker sees exactly what you write — and tap Request changes.",
    target: "changes",
    wait: 11400,
    render: () => <ReviewPanel mode="changes" />,
  },
  {
    title: "Sign",
    text: "Sign with your finger (or mouse) and tap Confirm signature.",
    target: "confirm",
    wait: 2400,
    render: () => <SignDecision decision="changes" />,
  },
  {
    title: "Sent back to the worker",
    text: "Your decision and comments are saved on the record.",
    wait: 2800,
    render: () => <Reviewed decision="changes required" />,
  },
  {
    title: "What the worker sees",
    text: "In My assessments, the worker sees “Changes required”. They tap View supervisor comments to read what you wrote.",
    wait: 3600,
    render: () => <WorkerSide stage="list" />,
  },
  {
    title: "The worker fixes it",
    text: "Your comments show at the top while they fix it. They submit again — it becomes version 2, and the crew signs the new version.",
    wait: 3800,
    render: () => <WorkerSide stage="fix" />,
  },
  {
    title: "It comes back to you",
    text: "It's back in your list marked “Amended — v2 ready for review”. Tap Review.",
    target: "review",
    wait: 3000,
    render: () => <Dashboard filter="To review" amended target="review" />,
  },
  {
    title: "Review version 2",
    text: "Check the change, tick the checklist, then tap Approve.",
    target: "approve",
    wait: 8000,
    render: () => <ReviewPanel mode="approve" v={2} />,
  },
  {
    title: "Sign",
    text: "Sign and tap Confirm signature.",
    target: "confirm",
    wait: 2400,
    render: () => <SignDecision decision="approved" v={2} />,
  },
  {
    title: "Approved",
    text: "Done. The worker sees it's approved. Both versions and both of your reviews are kept on the record and the PDF.",
    wait: 3400,
    render: () => <Reviewed decision="approved" v={2} />,
  },
  {
    title: "Back on the dashboard",
    text: "Reviewed ones drop to the bottom of today's list, so what's left to review stays on top.",
    render: () => <Dashboard approvedAlex />,
  },
];

// 4. Statistics.
const STATS_SCENES: DemoScene[] = [
  {
    title: "Statistics",
    text: "On the dashboard, tap View statistics.",
    target: "stats",
    wait: 2200,
    render: () => <Dashboard />,
  },
  {
    title: "Statistics",
    text: "Today's numbers, Take 5s done, people signed on, reviews and the most common hazards — by day, week or month. Tap a bar for that day. Tap a hazard to see what people wrote.",
    target: "hz1",
    wait: 4200,
    render: () => <Stats />,
  },
  {
    title: "What people wrote",
    text: "Every hazard written under that question: the hazard, its controls, the risk before and after, and who wrote it. Tap View JSAFE to open the full Take 5.",
    render: () => <Stats hazardsOpen />,
  },
];

// 1. My teams & notifications. On sites where the admin sets supervisors'
// teams (`locked`), the card just shows them — there's no Choose teams.
const teamsScenes = (locked: boolean): DemoScene[] => [
  ...(locked
    ? [
        {
          title: "My teams",
          text: "The My teams card on your dashboard shows the teams you're responsible for. Your admin sets them. Tap Turn on notifications.",
          target: "notify-on",
          wait: 3600,
          render: () => <TeamsDash stage="saved" locked />,
        },
      ]
    : [
        {
          title: "My teams",
          text: "On your dashboard, the My teams card lets you choose the teams you're responsible for. Tap Choose teams.",
          target: "choose",
          wait: 3000,
          render: () => <TeamsDash stage="none" />,
        },
        {
          title: "Choose your teams",
          text: "Tap the teams you're responsible for — they turn green with a tick. Then tap Save teams.",
          target: "save-teams",
          wait: 3200,
          render: () => <TeamsDash stage="picking" />,
        },
        {
          title: "Turn on notifications",
          text: "Your teams now show on the card. Tap Turn on notifications.",
          target: "notify-on",
          wait: 2600,
          render: () => <TeamsDash stage="saved" />,
        },
      ]),
  {
    title: "Allow",
    text: "Your phone or browser asks if JSAFE can send notifications. Tap Allow.",
    target: "allow",
    wait: 2400,
    render: () => <TeamsDash stage="ask" locked={locked} />,
  },
  {
    title: "Notifications are on",
    text: "Do this on each phone or computer you use. On an iPhone, open JSAFE from your home screen icon first.",
    wait: 3400,
    render: () => <TeamsDash stage="on" locked={locked} />,
  },
  {
    title: "JSAFE to review",
    text: "When one of your teams submits a JSAFE for review — or sends back an amended one — you get a notification, even with the app closed. Tap it.",
    target: "notif",
    wait: 3800,
    render: () => <LockScreen />,
  },
  {
    title: "Supervisor review",
    text: "It opens the Supervisor review for that Take 5, ready for you to check and sign.",
    wait: 6000,
    render: () => <ReviewPage />,
  },
  {
    title: "All teams | My teams",
    text: "Back on the dashboard, tap My teams to see only your teams' JSAFEs.",
    target: "mine",
    wait: 2600,
    render: () => <TeamsDash stage="on" locked={locked} />,
  },
  {
    title: "My teams' assessments",
    text: "Only your teams are listed, and the numbers change to match. Tap All teams to see everything again.",
    render: () => <TeamsDash stage="mine" locked={locked} />,
  },
];

// 5. Suggest an idea.
const IDEA_SCENES: DemoScene[] = [
  {
    title: "Got an idea?",
    text: "Something in JSAFE you'd change, or something missing? On your dashboard, under Links, tap Suggest an idea.",
    target: "suggest",
    wait: 3000,
    render: () => <Dashboard />,
  },
  {
    title: "Tell us",
    text: "Write what you'd like changed or added, then tap Send idea. Your name is added for you.",
    target: "send-idea",
    wait: 4200,
    render: () => <IdeaSheet />,
  },
  {
    title: "Sent",
    text: "It goes straight to the JSAFE admin team. On a computer, Suggest an idea is in the green menu on the left.",
    render: () => <IdeaSheet sent />,
  },
];

const chapters = (adminSetsTeams: boolean): DemoChapter[] => [
  {
    id: "teams",
    title: "My teams",
    text: adminSetsTeams
      ? "See your teams and get a notification when they submit a Take 5"
      : "Choose your teams and get a notification when they submit a Take 5",
    icon: <Bell className="w-5 h-5" />,
    scenes: teamsScenes(adminSetsTeams),
  },
  {
    id: "dash",
    title: "Dashboard",
    text: "Getting around: filters, search, records and PDFs",
    icon: <I name="home" className="w-5 h-5" />,
    scenes: DASH_SCENES,
  },
  {
    id: "review",
    title: "Review a Take 5",
    text: "Start to finish: request changes, what the worker sees, then approve",
    icon: <I name="check" className="w-5 h-5" />,
    scenes: REVIEW_SCENES,
  },
  {
    id: "stats",
    title: "Statistics",
    text: "Today's numbers, trends and what people wrote for each hazard",
    icon: <I name="stats" className="w-5 h-5" />,
    scenes: STATS_SCENES,
  },
  {
    id: "idea",
    title: "Suggest an idea",
    text: "Tell the admin team what to change or add",
    icon: <I name="idea" className="w-5 h-5" />,
    scenes: IDEA_SCENES,
  },
];

export default function SupervisorDemo({
  adminSetsTeams = false,
  ...props
}: {
  adminSetsTeams?: boolean; // this site's admin sets supervisors' teams
  variant?: "light" | "plain";
  className?: string;
  autoShow?: boolean;
}) {
  const list = useMemo(() => chapters(adminSetsTeams), [adminSetsTeams]);
  return <DemoPlayer label="Supervisor" chapters={list} storageKey="jsafe-demo-supervisor" {...props} />;
}
