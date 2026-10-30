"use client";

import DemoPlayer, { DemoChapter, DemoScene } from "./DemoPlayer";
import {
  AssessmentCard,
  Avatar,
  Card,
  DashHeader,
  I,
  Input,
  NeedsReview,
  PageHeader,
  Pill,
  StatusPills,
  Typing,
} from "./mock";

// Admin demo — same screens, words and buttons as the real admin pages,
// with made-up people.

// ---------- Screens ----------

const SHORTCUTS: [string, string, string][] = [
  ["people", "people", "People"],
  ["saved", "saved", "Saved answers"],
  ["export", "export", "Export"],
  ["stats", "stats", "Statistics"],
  ["supervisor", "check", "Supervisor"],
  ["worker", "list", "Worker page"],
];

function Dashboard({ showCard = true }: { showCard?: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <DashHeader role="Admin dashboard" greeting="Good morning" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <NeedsReview n={3} id="needs" />
        <div className="grid grid-cols-3 gap-1.5">
          {SHORTCUTS.map(([id, icon, label]) => (
            <div
              key={id}
              data-demo={id}
              className="flex flex-col items-center gap-1 rounded-xl bg-white border border-neutral-200 py-1.5 shadow-sm cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <I name={icon} className="w-3.5 h-3.5" />
              </span>
              <span className="text-[8.5px] font-medium text-neutral-700">{label}</span>
            </div>
          ))}
        </div>
        <StatusPills />
        {showCard && (
          <AssessmentCard
            name="Alex Nguyen"
            team="Rails installation"
            when="29 Oct, 6:58 am"
            status="Awaiting Supervisor Review"
            tone="amber"
            review
            reviewId="review"
            viewId="view"
            extra={
              <div className="mt-1.5 flex gap-3 text-[9px]">
                <span data-demo="archive" className="text-neutral-500 font-medium cursor-pointer">
                  Archive
                </span>
                <span data-demo="copy" className="text-neutral-500 font-medium cursor-pointer">
                  Copy sign-on link
                </span>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}

function PersonRow({
  name,
  tags,
  actions,
  amber = false,
  confirmId,
  pinId,
  teamsLine,
  teamsId,
}: {
  name: string;
  tags?: React.ReactNode;
  actions: string[];
  amber?: boolean;
  confirmId?: string;
  pinId?: string;
  teamsLine?: string;
  teamsId?: string;
}) {
  return (
    <div className={`px-2.5 py-2 ${amber ? "bg-amber-50/70" : ""}`}>
      <div className="flex items-center gap-2">
        <Avatar name={name} />
        <div className="min-w-0">
          <p className="text-[10.5px] font-semibold">{name}</p>
          {tags && <div className="flex gap-1 mt-0.5">{tags}</div>}
          {teamsLine && <p className="mt-0.5 text-[8.5px] text-neutral-500">{teamsLine}</p>}
        </div>
      </div>
      <div className="mt-1 ml-8 flex flex-wrap gap-1">
        {actions.map((a) => (
          <span
            key={a}
            data-demo={a === "Confirm" ? confirmId : a.includes("PIN") ? pinId : a === "Teams" ? teamsId : undefined}
            className={`text-[8.5px] px-2 py-0.5 rounded-full cursor-pointer ${
              a === "Confirm"
                ? "bg-emerald-700 text-white font-semibold"
                : "border border-neutral-300 text-neutral-700 bg-white font-medium"
            }`}
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

function People({ tab = "workers", typing = false, confirmed = false }: { tab?: "workers" | "supervisors"; typing?: boolean; confirmed?: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="People" sub="Workers & supervisors · Blind Creek Solar Farm" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="flex p-0.5 rounded-full bg-white border border-neutral-200">
          {(["workers", "supervisors"] as const).map((t) => (
            <span
              key={t}
              data-demo={t === "supervisors" ? "sup-tab" : undefined}
              className={`flex-1 text-center text-[9.5px] font-semibold py-1 rounded-full capitalize cursor-pointer ${
                tab === t ? "bg-emerald-700 text-white" : "text-neutral-600"
              }`}
            >
              {t} <span className="text-[8px] opacity-80">{t === "workers" ? 42 : 2}</span>
            </span>
          ))}
        </div>
        {tab === "workers" ? (
          <>
            {!confirmed && (
              <div className="rounded-xl bg-amber-50 border border-amber-300 px-2 py-1.5 text-[9px] text-amber-900">
                <b>New worker to check.</b> Someone added themselves on site. Tap <b>Confirm</b> once you know the name is right.
              </div>
            )}
            <Card>
              <p className="text-[10.5px] font-semibold">Add a worker</p>
              <div className="mt-1 flex gap-1.5">
                <div className="flex-1">
                  <Input muted={!typing}>{typing ? <Typing text="Sam Taylor" /> : "Full name"}</Input>
                </div>
                <span data-demo="add" className="text-[10px] px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer">
                  + Add
                </span>
              </div>
              <p className="mt-1 text-[9px] font-semibold text-emerald-700">Add many at once ▾</p>
            </Card>
            <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
              {!confirmed && (
                <PersonRow name="Sam O'Brien" amber tags={<Pill tone="amber">New — unverified</Pill>} actions={["Confirm", "Set inactive", "Archive"]} confirmId="confirm" />
              )}
              <PersonRow name="Alex Nguyen" actions={["Set inactive", "Archive"]} />
              <PersonRow name="Brianna Fields" actions={["Set inactive", "Archive"]} />
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
            <PersonRow
              name="Jordan Micallef"
              tags={<Pill tone="green">PIN set</Pill>}
              teamsLine="Teams: Piling, Rails installation"
              actions={["Change PIN", "Teams", "Set inactive", "Archive"]}
              teamsId="teams"
            />
            <PersonRow
              name="Priya Ramesh"
              tags={<Pill>No PIN</Pill>}
              teamsLine="No teams chosen"
              actions={["Set PIN", "Teams", "Set inactive", "Archive"]}
              pinId="pin"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SupervisorTeams() {
  const chips = ["Piling", "Piling remediation", "Post-head installation", "Rails installation", "Surveying", "Tubes installation"];
  const on = ["Piling", "Rails installation", "Surveying"];
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="People" sub="Workers & supervisors · Blind Creek Solar Farm" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="bg-white rounded-xl border border-neutral-200 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <Avatar name="Jordan Micallef" />
            <div>
              <p className="text-[10.5px] font-semibold">Jordan Micallef</p>
              <Pill tone="green">PIN set</Pill>
              <p className="mt-0.5 text-[8.5px] text-neutral-500">Teams: Piling, Rails installation</p>
            </div>
          </div>
          <div className="mt-2 ml-8">
            <p className="text-[8.5px] text-neutral-500 mb-1">Tap the teams you're responsible for.</p>
            <div className="flex flex-wrap gap-1">
              {chips.map((t) => (
                <span
                  key={t}
                  className={`text-[9px] px-2 py-1 rounded-full border font-medium ${
                    on.includes(t) ? "bg-emerald-700 border-emerald-700 text-white" : "bg-white border-neutral-300 text-neutral-700"
                  }`}
                >
                  {on.includes(t) ? "✓ " : ""}
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <span data-demo="save-teams" className="text-[9.5px] px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer">
                Save teams
              </span>
              <span className="text-[9.5px] px-2.5 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700">Cancel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetPin() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="People" sub="Workers & supervisors · Blind Creek Solar Farm" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="bg-white rounded-xl border border-neutral-200 px-2.5 py-2">
          <div className="flex items-center gap-2">
            <Avatar name="Priya Ramesh" />
            <div>
              <p className="text-[10.5px] font-semibold">Priya Ramesh</p>
              <Pill>No PIN</Pill>
            </div>
          </div>
          <div className="mt-2 ml-8 flex items-center gap-1.5">
            <div className="w-24">
              <Input>
                <Typing text="4821" />
              </Input>
            </div>
            <span data-demo="save-pin" className="text-[9px] px-2 py-1 rounded-full bg-emerald-700 text-white font-semibold cursor-pointer">
              Save PIN
            </span>
          </div>
        </div>
        <div data-demo="dups" className="flex items-center gap-2 rounded-xl bg-white border border-neutral-200 px-2.5 py-2 shadow-sm cursor-pointer">
          <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <I name="people" className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1">
            <span className="block text-[10px] font-semibold">Check duplicates</span>
            <span className="block text-[8.5px] text-neutral-500">Same person added twice? Review and merge them.</span>
          </span>
          <span className="text-neutral-400 text-xs">→</span>
        </div>
      </div>
    </div>
  );
}

function Duplicates({ confirming = false }: { confirming?: boolean }) {
  const box = (name: string, added: string, done: string, id?: string, isNew = false) => (
    <div className="flex-1 min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 p-1.5 flex flex-col">
      <div className="flex items-center gap-1">
        <Avatar name={name} />
        <p className="text-[9.5px] font-semibold leading-tight">{name}</p>
      </div>
      {isNew && (
        <span className="mt-1 self-start">
          <Pill tone="amber">New — unverified</Pill>
        </span>
      )}
      <p className="text-[8px] text-neutral-500 mt-1">Added {added}</p>
      <p className="text-[8px] text-neutral-600">{done}</p>
      <span data-demo={id} className="mt-1.5 text-center text-[9px] font-semibold py-1 rounded-lg bg-emerald-700 text-white cursor-pointer">
        Keep this one
      </span>
    </div>
  );
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Duplicates" sub="Names that look alike" back="People" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <Card>
          <Pill tone="amber">Very similar spelling</Pill>
          <div className="mt-1.5 flex gap-1.5">
            {box("Jon Smith", "20/10/2026", "1 assessment · 3 signatures", undefined, true)}
            {box("John Smith", "01/08/2026", "14 assessments · 40 signatures", "keep")}
          </div>
          {confirming ? (
            <div className="mt-1.5 rounded-lg border-2 border-red-300 bg-red-50 p-1.5">
              <p className="text-[9.5px] font-semibold text-red-900">Merge &quot;Jon Smith&quot; into &quot;John Smith&quot;?</p>
              <p className="text-[8.5px] text-red-800">Everything moves across. This can&apos;t be undone.</p>
              <div className="mt-1 flex gap-1">
                <span className="flex-1 text-center text-[9px] font-semibold py-1 rounded-lg bg-red-600 text-white">Yes, merge</span>
                <span className="flex-1 text-center text-[9px] font-semibold py-1 rounded-lg border border-neutral-300 bg-white">Cancel</span>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-center text-[9px] font-semibold py-1 rounded-lg border border-neutral-300">Not the same person</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function SavedAnswers({ editing = false, removing = false }: { editing?: boolean; removing?: boolean }) {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Saved answers" sub="Reusable hazards & controls" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="flex p-0.5 rounded-full bg-white border border-neutral-200">
          <span className="flex-1 text-center text-[9.5px] font-semibold py-1 rounded-full bg-emerald-700 text-white">To review 1</span>
          <span className="flex-1 text-center text-[9.5px] font-semibold py-1 rounded-full text-neutral-600">All 12</span>
        </div>
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-2">
          <div className="flex items-start justify-between">
            <span className="text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
              Rails installation
            </span>
            <Pill tone="amber">To review</Pill>
          </div>
          <p className="mt-1 text-[8.5px] text-neutral-500">Could I be caught in, on or between anything?</p>
          {editing ? (
            <div className="mt-1 space-y-1">
              <p className="text-[8.5px] font-semibold text-neutral-600">Hazard</p>
              <Input>Pinch points lifting rails onto posts</Input>
              <p className="text-[8.5px] font-semibold text-neutral-600">Controls</p>
              <Input>
                Gloves on, two-person lift<Typing text=", keep hands clear of rail ends" delay={300} speed={50} />
              </Input>
            </div>
          ) : (
            <>
              <p className="mt-1 text-[10.5px] font-semibold">Pinch points lifting rails onto posts</p>
              <div className="mt-1 rounded-lg bg-white border border-neutral-100 px-1.5 py-1">
                <p className="text-[8px] font-semibold uppercase text-neutral-500">Controls</p>
                <p className="text-[9.5px]">Gloves on, two-person lift</p>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[8.5px]">
                <span className="text-neutral-500">Initial</span>
                <Pill tone="orange">high</Pill>
                <span className="text-neutral-400">→</span>
                <span className="text-neutral-500">Residual</span>
                <Pill tone="green">low</Pill>
              </div>
            </>
          )}
          <p className="mt-1 text-[8.5px] text-neutral-400">Saved by Alex Nguyen · 29/10/2026</p>
          <div className="mt-1.5 pt-1.5 border-t border-neutral-200 flex items-center gap-1">
            {editing ? (
              <>
                <span data-demo="save" className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-700 text-white font-semibold cursor-pointer">
                  Save changes
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-neutral-300 bg-white">Cancel</span>
              </>
            ) : (
              <>
                <span data-demo="approve" className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-700 text-white font-semibold cursor-pointer">
                  Approve
                </span>
                <span data-demo="edit" className="text-[9px] px-2 py-0.5 rounded-full border border-neutral-300 bg-white cursor-pointer">
                  Edit
                </span>
              </>
            )}
            {removing ? (
              <span className="ml-auto flex gap-1">
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-600 text-white font-semibold">Yes, remove</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full border border-neutral-300 bg-white">Keep</span>
              </span>
            ) : (
              <span data-demo="remove" className="ml-auto text-[9px] px-2 py-0.5 rounded-full border border-red-200 text-red-700 bg-white cursor-pointer">
                Remove
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Export({ open = false }: { open?: boolean }) {
  const day = (id: string | undefined, wd: string, d: string, label: string, n: number) => (
    <div data-demo={id} className="flex items-center gap-2 px-2.5 py-2 cursor-pointer">
      <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex flex-col items-center justify-center leading-none">
        <span className="text-[7px] font-semibold uppercase">{wd}</span>
        <span className="text-[11px] font-bold">{d}</span>
      </span>
      <span className="flex-1">
        <span className="block text-[10.5px] font-semibold">{label}</span>
        <span className="block text-[8.5px] text-neutral-500">{n} assessments</span>
      </span>
      <span className="text-neutral-400 text-[10px]">▾</span>
    </div>
  );
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Export" sub="Download records by day" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-white rounded-lg border border-neutral-200 p-1.5">
            <p className="text-[13px] font-bold">64</p>
            <p className="text-[8px] text-neutral-600">Days with records</p>
          </div>
          <div className="bg-white rounded-lg border border-neutral-200 p-1.5">
            <p className="text-[13px] font-bold">412</p>
            <p className="text-[8px] text-neutral-600">Assessments in total</p>
          </div>
        </div>
        <p className="text-[8.5px] font-semibold uppercase text-neutral-500">October 2026</p>
        <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
          {day("day", "Wed", "29", "Wednesday 29 Oct", 6)}
          {open && (
            <div className="px-2.5 pb-2 pt-1 bg-emerald-50/40 space-y-1.5">
              <span data-demo="zip" className="inline-block text-[9.5px] px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-semibold cursor-pointer">
                Download all as ZIP
              </span>
              {["Alex Nguyen · Rails installation", "Chris Doukas · Piling"].map((r) => (
                <div key={r} className="flex items-center justify-between rounded-lg bg-white border border-neutral-200 px-2 py-1">
                  <span className="text-[9px]">{r}</span>
                  <span className="text-[8.5px] px-1.5 py-0.5 rounded-full border border-emerald-600 text-emerald-700 font-semibold">Open</span>
                </div>
              ))}
            </div>
          )}
          {day(undefined, "Tue", "28", "Tuesday 28 Oct", 9)}
          {!open && day(undefined, "Mon", "27", "Monday 27 Oct", 7)}
        </div>
      </div>
    </div>
  );
}

function ZipDone() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Export" sub="Download records by day" />
      <div className="px-3 pt-6">
        <div className="rounded-xl bg-white border border-neutral-200 shadow p-3 text-center">
          <span className="mx-auto w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <I name="export" className="w-5 h-5" />
          </span>
          <p className="mt-2 text-[10.5px] font-semibold">2026-10-29.zip</p>
          <p className="text-[9px] text-neutral-500">6 PDFs, one per Take 5 — named by worker, team and date</p>
        </div>
      </div>
    </div>
  );
}

function RecordView() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Alex Nguyen" sub="Rails installation · 29 Oct 2026" />
      <div className="px-3 pt-2.5 space-y-2 overflow-hidden">
        <div className="flex gap-1.5">
          <span className="text-[9.5px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500 text-white">Review</span>
          <span className="text-[9.5px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-800">Open PDF</span>
        </div>
        <Card>
          <div className="flex flex-wrap gap-1">
            <Pill tone="amber">Awaiting Supervisor Review</Pill>
            <Pill>Version 1</Pill>
          </div>
          <p className="mt-1 text-[11px] font-semibold">Install rails on rows 41–48</p>
        </Card>
        <Card>
          <p className="text-[11px] font-bold">Hazards identified <span className="text-neutral-400">1</span></p>
          <p className="text-[9.5px]">Pinch points lifting rails onto posts</p>
        </Card>
        <Card>
          <p className="text-[11px] font-bold">Team sign-ons <span className="text-neutral-400">3</span></p>
        </Card>
      </div>
    </div>
  );
}

// ---------- Demos ----------

const DASH_SCENES: DemoScene[] = [
  {
    title: "Your admin dashboard",
    text: "Everything for the site in one place. The shortcut buttons take you to People, Saved answers, Export, Statistics, the supervisor login and the worker page.",
    wait: 4000,
    render: () => <Dashboard />,
  },
  {
    title: "Filters & View",
    text: "Tap a status to see only those — “Needs your review” jumps to what's waiting, and admins can review too. Tap View to open a Take 5.",
    target: "view",
    wait: 3600,
    render: () => <Dashboard />,
  },
  {
    title: "The full record",
    text: "View shows every answer, hazard, photo, sign-on and review. Open PDF gives you a copy to print or send.",
    wait: 3400,
    render: () => <RecordView />,
  },
  {
    title: "Copy sign-on link",
    text: "On today's Take 5s, Copy sign-on link gives you a link to send the crew so they can sign straight on.",
    target: "copy",
    wait: 2800,
    render: () => <Dashboard />,
  },
  {
    title: "Archive",
    text: "Archive moves a Take 5 out of the active list (it asks you to confirm first). You can still find it under the Archived filter.",
    target: "archive",
    wait: 2800,
    render: () => <Dashboard />,
  },
  {
    title: "That's the dashboard",
    text: "Pull down from the top on your phone to refresh. The other demos show People, Saved answers and Export.",
    render: () => <Dashboard />,
  },
];

const PEOPLE_SCENES: DemoScene[] = [
  {
    title: "People",
    text: "Tap People to manage workers and supervisors.",
    target: "people",
    wait: 2000,
    render: () => <Dashboard showCard={false} />,
  },
  {
    title: "Add a worker",
    text: "Type the full name and tap Add. Got a whole list? “Add many at once” lets you paste a column of names from a spreadsheet.",
    target: "add",
    wait: 3000,
    render: () => <People typing />,
  },
  {
    title: "New worker to check",
    text: "Workers who add themselves on site show in amber. Check the name is right and tap Confirm.",
    target: "confirm",
    wait: 3000,
    render: () => <People />,
  },
  {
    title: "Supervisors",
    text: "Switch to Supervisors. Here you set their teams and their PIN.",
    target: "sup-tab",
    wait: 2200,
    render: () => <People confirmed />,
  },
  {
    title: "Teams",
    text: "Under each supervisor you can see the teams they look after. Tap Teams to change them.",
    target: "teams",
    wait: 2800,
    render: () => <People tab="supervisors" />,
  },
  {
    title: "Save teams",
    text: "Tap teams on or off, then Save teams. They'll get a notification when those teams submit a JSAFE. Supervisors can also choose their own teams from their dashboard.",
    target: "save-teams",
    wait: 4200,
    render: () => <SupervisorTeams />,
  },
  {
    title: "Set PIN",
    text: "Tap Set PIN for anyone showing “No PIN”.",
    target: "pin",
    wait: 2400,
    render: () => <People tab="supervisors" />,
  },
  {
    title: "4–6 digits",
    text: "Type a 4–6 digit PIN, tap Save PIN, and tell the supervisor. They log in with their name and PIN.",
    target: "save-pin",
    wait: 3000,
    render: () => <SetPin />,
  },
  {
    title: "Check duplicates",
    text: "Back on the Workers list, Check duplicates finds names that look alike.",
    target: "dups",
    wait: 2200,
    render: () => <SetPin />,
  },
  {
    title: "Possible duplicates",
    text: "Same person added twice? Pick the one to keep — everything from the other moves across. Or tap Not the same person.",
    target: "keep",
    wait: 3600,
    render: () => <Duplicates />,
  },
  {
    title: "Confirm the merge",
    text: "It asks you to confirm, because a merge can't be undone.",
    render: () => <Duplicates confirming />,
  },
];

const SAVED_SCENES: DemoScene[] = [
  {
    title: "Saved answers",
    text: "Tap Saved answers to see the hazards and controls workers have saved for their team.",
    target: "saved",
    wait: 2000,
    render: () => <Dashboard showCard={false} />,
  },
  {
    title: "To review",
    text: "New ones show to the team straight away, and wait here for you. Check the wording and the risk ratings.",
    target: "edit",
    wait: 3600,
    render: () => <SavedAnswers />,
  },
  {
    title: "Edit",
    text: "Tidy up the wording or change a risk rating, then Save changes.",
    target: "save",
    wait: 3600,
    render: () => <SavedAnswers editing />,
  },
  {
    title: "Approve",
    text: "Happy with it? Tap Approve and it leaves the To review list.",
    target: "approve",
    wait: 2600,
    render: () => <SavedAnswers />,
  },
  {
    title: "Remove",
    text: "Not useful? Tap Remove.",
    target: "remove",
    wait: 2000,
    render: () => <SavedAnswers />,
  },
  {
    title: "Yes, remove",
    text: "Remove takes two taps — “Yes, remove” or “Keep” — so it can't happen by accident. Workers won't be offered it any more.",
    render: () => <SavedAnswers removing />,
  },
];

const EXPORT_SCENES: DemoScene[] = [
  {
    title: "Export",
    text: "Tap Export to download records.",
    target: "export",
    wait: 2000,
    render: () => <Dashboard showCard={false} />,
  },
  {
    title: "Pick a day",
    text: "Days are grouped by month. Tap one to open it.",
    target: "day",
    wait: 2800,
    render: () => <Export />,
  },
  {
    title: "Download all as ZIP",
    text: "See who did what that day, open any single PDF, or download the whole day at once.",
    target: "zip",
    wait: 3000,
    render: () => <Export open />,
  },
  {
    title: "One ZIP per day",
    text: "Every Take 5 from that day as a PDF, ready to upload wherever you keep your records.",
    wait: 2800,
    render: () => <ZipDone />,
  },
  {
    title: "Statistics",
    text: "For trends — Take 5s done, people signed on, reviews and the most common hazards — tap Statistics on the dashboard.",
    target: "stats",
    render: () => <Dashboard showCard={false} />,
  },
];

const CHAPTERS: DemoChapter[] = [
  {
    id: "dash",
    title: "Dashboard",
    text: "Filters, records, sign-on links and archiving",
    icon: <I name="home" className="w-5 h-5" />,
    scenes: DASH_SCENES,
  },
  {
    id: "people",
    title: "People",
    text: "Add workers, confirm new ones, supervisors' teams and PINs, duplicates",
    icon: <I name="people" className="w-5 h-5" />,
    scenes: PEOPLE_SCENES,
  },
  {
    id: "saved",
    title: "Saved answers",
    text: "Check, edit, approve or remove team answers",
    icon: <I name="saved" className="w-5 h-5" />,
    scenes: SAVED_SCENES,
  },
  {
    id: "export",
    title: "Export & statistics",
    text: "Download a day's records as a ZIP",
    icon: <I name="export" className="w-5 h-5" />,
    scenes: EXPORT_SCENES,
  },
];

export default function AdminDemo(props: { variant?: "light" | "plain"; className?: string; autoShow?: boolean }) {
  return <DemoPlayer label="Admin" chapters={CHAPTERS} storageKey="jsafe-demo-admin" {...props} />;
}
