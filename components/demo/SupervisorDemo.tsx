"use client";

import DemoPlayer, { DemoChapter, DemoScene } from "./DemoPlayer";
import {
  AssessmentCard,
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
  target?: "needs" | "review" | "stats" | "view";
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

function ReviewTop() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub="Alex Nguyen · Version 1" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="flex">
          <span className="text-[9.5px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800">
            Open PDF
          </span>
        </div>
        <Card>
          <div className="flex flex-wrap gap-1">
            <Pill tone="amber">Awaiting Supervisor Review</Pill>
            <Pill>Version 1</Pill>
            <Pill tone="red">High/Extreme risk</Pill>
          </div>
          <p className="mt-1.5 text-[11.5px] font-semibold leading-snug">Install rails on rows 41–48</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[9px]">
            <div>
              <p className="font-semibold text-neutral-500 uppercase text-[8px]">Date</p>29 Oct 2026
            </div>
            <div>
              <p className="font-semibold text-neutral-500 uppercase text-[8px]">Completed by</p>Alex Nguyen
            </div>
            <div>
              <p className="font-semibold text-neutral-500 uppercase text-[8px]">Team</p>Rails installation
            </div>
            <div>
              <p className="font-semibold text-neutral-500 uppercase text-[8px]">Location</p>Block C, rows 41–48
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-[11px] font-bold">Step 1 — plan the task</p>
          {["Do I understand today's task?", "Do I have the required skills, training and licences for the task?"].map((q) => (
            <div key={q} className="mt-1 flex items-start justify-between gap-2">
              <span className="text-[9.5px] text-neutral-800">{q}</span>
              <Pill tone="green">Yes</Pill>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ReviewHazards() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub="Alex Nguyen · Version 1" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <Card>
          <p className="text-[11px] font-bold">
            Hazards identified <span className="text-neutral-400">1</span>
          </p>
          <p className="mt-1 text-[8.5px] text-neutral-500">Could I be caught in, on or between anything?</p>
          <div className="mt-1 rounded-lg border border-neutral-200 p-2">
            <p className="text-[10px] font-semibold">Pinch points lifting rails onto posts</p>
            <div className="mt-1 flex items-center gap-1 text-[8.5px]">
              <span className="text-neutral-500">Initial</span>
              <Pill tone="orange">High</Pill>
              <span className="text-neutral-400">→</span>
              <span className="text-neutral-500">Residual</span>
              <Pill tone="green">Low</Pill>
            </div>
            <div className="mt-1 rounded bg-neutral-50 px-1.5 py-1 text-[9px]">
              <span className="font-semibold text-neutral-500 text-[8px] uppercase block">Controls</span>
              Gloves on, two-person lift, keep hands clear of the rail ends
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <div className="w-11 h-11 rounded-lg" style={{ background: "linear-gradient(160deg,#94a3b8,#475569 60%,#1e293b)" }} />
              <div className="w-11 h-11 rounded-lg" style={{ background: "linear-gradient(160deg,#a7f3d0,#059669 60%,#064e3b)" }} />
            </div>
          </div>
        </Card>
        <Card>
          <p className="text-[11px] font-bold">
            Team sign-ons <span className="text-neutral-400">3</span>
          </p>
          <p className="text-[9.5px] text-neutral-600">Alex Nguyen · Brianna Fields · Dev Patel</p>
        </Card>
      </div>
    </div>
  );
}

function YourReview({ stage }: { stage: "name" | "picked" | "checklist" | "decide" | "changes" }) {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub="Alex Nguyen · Version 1" />
      <div className="px-3 pt-2.5 overflow-hidden">
        <Card className="space-y-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <p className="text-[11.5px] font-bold">Your review</p>
          </div>
          {(stage === "name" || stage === "picked") && (
            <div>
              <p className="text-[10px] font-semibold text-neutral-800 mb-1">1. Reviewing supervisor</p>
              <Input>{stage === "name" ? <Typing text="Jordan" /> : ME}</Input>
              {stage === "name" && (
                <div className="mt-1 rounded-lg border border-neutral-200 bg-white">
                  <div data-demo="me" className="px-2 py-1.5 text-[10.5px] cursor-pointer">
                    {ME}
                  </div>
                </div>
              )}
              {stage === "picked" && (
                <p className="mt-1 text-[9px] font-semibold text-emerald-700">✓ Reviewing as {ME}</p>
              )}
            </div>
          )}
          {stage === "picked" && (
            <div>
              <div className="flex justify-between">
                <p className="text-[10px] font-semibold text-neutral-800 mb-1">2. Checklist</p>
                <span className="text-[9px] text-neutral-500">0/9</span>
              </div>
              <div className="space-y-1">
                {CHECKLIST.slice(0, 4).map((c) => (
                  <Check key={c} label={c} on={false} />
                ))}
              </div>
            </div>
          )}
          {stage === "checklist" && (
            <div>
              <div className="flex justify-between">
                <p className="text-[10px] font-semibold text-neutral-800 mb-1">2. Checklist</p>
                <span className="text-[9px] text-neutral-500">9/9</span>
              </div>
              <div className="space-y-1">
                {CHECKLIST.slice(0, 6).map((c) => (
                  <Check key={c} label={c} />
                ))}
              </div>
            </div>
          )}
          {(stage === "decide" || stage === "changes") && (
            <>
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-neutral-800">3. Notes</p>
                <div>
                  <p className="text-[9px] font-semibold text-neutral-600">Comments (optional)</p>
                  <Input muted={stage === "decide"}>
                    {stage === "changes" ? (
                      <Typing text="Add the spotter for the telehandler lifts." speed={45} />
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
                    className={`flex-1 text-center text-[10px] font-semibold py-2 rounded-lg bg-emerald-700 text-white cursor-pointer ${
                      stage === "changes" ? "opacity-40" : ""
                    }`}
                  >
                    Approve
                  </div>
                </div>
                {stage === "changes" && (
                  <p className="mt-1 text-[8.5px] text-neutral-500 text-center">
                    Tick every checklist item to approve. You can still request changes without it.
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function SignDecision({ decision }: { decision: "approved" | "changes" }) {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub="Alex Nguyen · Version 1" />
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

function Reviewed({ decision }: { decision: "approved" | "changes required" }) {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Supervisor review" sub="Alex Nguyen · Version 1" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div
          className={`rounded-xl border p-2.5 text-[10px] ${
            decision === "approved"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          Already reviewed by <b>{ME}</b> — <b className="capitalize">{decision}</b>.
        </div>
        <Card>
          <div className="flex flex-wrap gap-1">
            <Pill tone={decision === "approved" ? "green" : "orange"}>
              {decision === "approved" ? "Approved" : "Changes Required"}
            </Pill>
            <Pill>Version 1</Pill>
          </div>
          <p className="mt-1.5 text-[11px] font-bold">Supervisor reviews</p>
          <div className="mt-1 rounded-lg border border-neutral-200 p-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-semibold">Version 1 · {ME}</p>
              <Pill tone={decision === "approved" ? "green" : "orange"}>{decision}</Pill>
            </div>
            {decision !== "approved" && (
              <p className="mt-0.5 text-[9px] text-neutral-700">
                <b>Comments:</b> Add the spotter for the telehandler lifts.
              </p>
            )}
          </div>
        </Card>
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

function RecordView() {
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
          <span className="text-[9.5px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500 text-white">Review</span>
          <span data-demo="pdf" className="text-[9.5px] font-semibold px-2.5 py-1 rounded-lg bg-white text-emerald-800 cursor-pointer">
            Open PDF
          </span>
        </div>
      </div>
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <Card>
          <div className="flex flex-wrap gap-1">
            <Pill tone="amber">Awaiting Supervisor Review</Pill>
            <Pill tone="red">High/Extreme risk</Pill>
          </div>
          <p className="mt-1 text-[11px] font-semibold">Install rails on rows 41–48</p>
        </Card>
        <Card>
          <p className="text-[11px] font-bold">SWMS</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Pill>Manual handling</Pill>
            <Pill>General site works</Pill>
          </div>
        </Card>
        <Card>
          <p className="text-[11px] font-bold">Audit trail</p>
          <p className="text-[9px] text-emerald-700 font-semibold">Show ▾</p>
        </Card>
      </div>
    </div>
  );
}

function PdfOpen() {
  return (
    <div className="h-full flex flex-col bg-neutral-200">
      <div className="px-3 py-2 bg-neutral-800 text-white text-[9.5px]">JSAFE_Alex-Nguyen_2026-10-29.pdf</div>
      <div className="m-3 flex-1 rounded bg-white shadow p-3 space-y-1.5">
        <p className="text-[11px] font-bold">Daily Task Safety Awareness</p>
        <p className="text-[8.5px] text-neutral-500">Blind Creek Solar Farm · Wed 29 Oct 2026</p>
        {[70, 90, 60, 85, 75, 50, 80, 65, 72].map((w, n) => (
          <div key={n} className="h-1.5 rounded bg-neutral-200" style={{ width: `${w}%` }} />
        ))}
        <div className="flex gap-1.5 pt-1">
          <div className="w-10 h-10 rounded" style={{ background: "linear-gradient(160deg,#94a3b8,#475569)" }} />
          <div className="w-10 h-10 rounded" style={{ background: "linear-gradient(160deg,#a7f3d0,#059669)" }} />
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const bars = [3, 5, 4, 6, 2, 0, 5, 7, 6, 4, 5, 3, 6, 8];
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
          <p className="text-[9px] text-neutral-700 mt-0.5">1. Could I strain or overexert myself? · 42</p>
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

// ---------- Demos ----------

const REVIEW_SCENES: DemoScene[] = [
  {
    title: "Your dashboard",
    text: "Every Take 5 on site. The amber “Needs your review” box shows how many are waiting — tap it to see just those.",
    target: "needs",
    wait: 3000,
    render: () => <Dashboard target="review" />,
  },
  {
    title: "To review",
    text: "Today's ones waiting for you are always at the top. Red tags like High/Extreme risk or Stop-work show what to look at first. Tap Review.",
    target: "review",
    wait: 3000,
    render: () => <Dashboard filter="To review" target="review" />,
  },
  {
    title: "Supervisor review",
    text: "The whole Take 5 is on this page — no need to open the PDF. Start with the summary: task, team, location and any red flags.",
    wait: 3600,
    render: () => <ReviewTop />,
  },
  {
    title: "Hazards, controls & photos",
    text: "Scroll through each hazard with its risk before and after, the controls, and the worker's photos. Tap a photo to see it bigger.",
    wait: 3800,
    render: () => <ReviewHazards />,
  },
  {
    title: "Your review · 1. Reviewing supervisor",
    text: "On a computer this panel sits beside the Take 5; on a phone it's below it. Start typing your name and tap it.",
    target: "me",
    wait: 2400,
    render: () => <YourReview stage="name" />,
  },
  {
    title: "2. Checklist",
    text: "Nine checks. Tick each one once you're happy with it.",
    wait: 2600,
    render: () => <YourReview stage="picked" />,
  },
  {
    title: "All ticked",
    text: "You need all 9 ticked to approve. Then add any notes for the crew.",
    wait: 2600,
    render: () => <YourReview stage="checklist" />,
  },
  {
    title: "3. Notes · 4. Decision",
    text: "Comments and additional controls are optional. Then choose Approve or Request changes.",
    target: "approve",
    wait: 2800,
    render: () => <YourReview stage="decide" />,
  },
  {
    title: "Sign",
    text: "Sign with your finger (or mouse) and tap Confirm signature.",
    target: "confirm",
    wait: 2600,
    render: () => <SignDecision decision="approved" />,
  },
  {
    title: "Approved",
    text: "Done. The worker can see it's approved, and your review is saved on the record and the PDF.",
    wait: 2800,
    render: () => <Reviewed decision="approved" />,
  },
  {
    title: "Back on the dashboard",
    text: "Reviewed ones drop to the bottom of today's list, so what's left to review stays on top.",
    render: () => <Dashboard approvedAlex />,
  },
];

const CHANGES_SCENES: DemoScene[] = [
  {
    title: "Something needs fixing?",
    text: "If the Take 5 isn't right, write what needs changing in Comments — the worker sees exactly what you write.",
    target: "changes",
    wait: 4200,
    render: () => <YourReview stage="changes" />,
  },
  {
    title: "Request changes",
    text: "You don't need the full checklist to send it back. Sign to confirm.",
    target: "confirm",
    wait: 2400,
    render: () => <SignDecision decision="changes" />,
  },
  {
    title: "Sent back to the worker",
    text: "The worker sees “Changes required” with your comments in My assessments, fixes it and submits again.",
    wait: 3200,
    render: () => <Reviewed decision="changes required" />,
  },
  {
    title: "The new version comes back",
    text: "It returns to your list marked “Amended — v2 ready for review”, and the crew signs the new version. Review it the same way.",
    target: "review",
    wait: 3200,
    render: () => <Dashboard filter="To review" amended target="review" />,
  },
  {
    title: "That's it",
    text: "Review → Approve or Request changes → sign. Every version and decision is kept on the record.",
    render: () => <Reviewed decision="changes required" />,
  },
];

const DASH_SCENES: DemoScene[] = [
  {
    title: "Status filters",
    text: "Tap a status — To review, Draft, Changes, Approved… — to see only those. The numbers show how many of each.",
    wait: 3200,
    render: () => <Dashboard />,
  },
  {
    title: "Search",
    text: "Search by worker or team to find a Take 5 fast.",
    wait: 3000,
    render: () => <SearchDash />,
  },
  {
    title: "View the full record",
    text: "Tap View on any Take 5 to see everything that was filled in.",
    target: "view",
    wait: 2200,
    render: () => <Dashboard target="view" />,
  },
  {
    title: "The record",
    text: "Every answer, hazard, photo, sign-on and review. Tap Open PDF for a copy you can print or send.",
    target: "pdf",
    wait: 3000,
    render: () => <RecordView />,
  },
  {
    title: "The PDF",
    text: "It opens straight in your browser.",
    wait: 2200,
    render: () => <PdfOpen />,
  },
  {
    title: "Statistics",
    text: "Back on the dashboard, tap View statistics.",
    target: "stats",
    wait: 2000,
    render: () => <Dashboard />,
  },
  {
    title: "Statistics",
    text: "Today's numbers, Take 5s done, people signed on, reviews and the most common hazards — by day, week or month. Tap a bar for that day.",
    wait: 4200,
    render: () => <Stats />,
  },
  {
    title: "Pull down to refresh",
    text: "On your phone, pull down from the top of the dashboard to load the newest Take 5s.",
    render: () => <PullRefresh />,
  },
];

const CHAPTERS: DemoChapter[] = [
  {
    id: "review",
    title: "Review a Take 5",
    text: "From “Needs your review” to approved and signed",
    icon: <I name="check" className="w-5 h-5" />,
    scenes: REVIEW_SCENES,
  },
  {
    id: "changes",
    title: "Request changes",
    text: "Send it back with comments, then review version 2",
    icon: <I name="back" className="w-5 h-5" />,
    scenes: CHANGES_SCENES,
  },
  {
    id: "dash",
    title: "Dashboard & statistics",
    text: "Filters, search, records, PDFs and statistics",
    icon: <I name="stats" className="w-5 h-5" />,
    scenes: DASH_SCENES,
  },
];

export default function SupervisorDemo(props: { variant?: "light" | "plain"; className?: string; autoShow?: boolean }) {
  return <DemoPlayer label="Supervisor" chapters={CHAPTERS} storageKey="jsafe-demo-supervisor" {...props} />;
}
