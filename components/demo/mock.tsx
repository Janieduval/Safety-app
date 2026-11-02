"use client";

import { useEffect, useRef, useState } from "react";

// Little building blocks for the demo screens — simplified copies of the real
// JSAFE pages, sized for the pretend phone.

export const GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";

const PATHS: Record<string, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  pen: (
    <>
      <path d="M14.5 3.5l4 4L9 17l-5 1 1-5z" />
      <path d="M12.5 5.5l4 4" />
    </>
  ),
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  check: <path d="M5 12l4 4 10-10" />,
  back: <path d="M15 5l-7 7 7 7" />,
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
    </>
  ),
  saved: <path d="M6 3h12v18l-6-4-6 4z" />,
  export: <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3" />,
  stats: <path d="M4 20V11M10 20V5M16 20v-6M2 20h20" />,
  doc: (
    <>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
};

export function I({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}

export function Header({
  title,
  sub,
  back,
  big = false,
}: {
  title: string;
  sub?: string;
  back?: string;
  big?: boolean;
}) {
  return (
    <div className="px-3.5 pt-4 pb-4 text-white rounded-b-2xl" style={{ background: GRADIENT }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-[9px] font-black">
            J
          </span>
          <span className="text-[11px] font-extrabold tracking-wide">JSAFE</span>
        </div>
        {back && (
          <span className="flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/30">
            <I name="back" className="w-2.5 h-2.5" />
            {back}
          </span>
        )}
      </div>
      <p className={`${big ? "mt-3 text-lg" : "mt-2 text-base"} font-extrabold leading-tight`}>{title}</p>
      {sub && <p className="text-[10px] text-emerald-50/90 mt-0.5">{sub}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm p-2.5 ${className}`}>{children}</div>
  );
}

export function Btn({
  id,
  children,
  tone = "green",
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  tone?: "green" | "white" | "amber";
  className?: string;
}) {
  const cls =
    tone === "green"
      ? "bg-emerald-700 text-white"
      : tone === "amber"
      ? "bg-amber-500 text-white"
      : "bg-white text-neutral-700 border border-neutral-300";
  return (
    <div data-demo={id} className={`text-center text-[11px] font-semibold py-2 rounded-lg cursor-pointer ${cls} ${className}`}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "grey" }: { children: React.ReactNode; tone?: string }) {
  const map: Record<string, string> = {
    grey: "bg-neutral-100 text-neutral-600",
    amber: "bg-amber-100 text-amber-800",
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
    orange: "bg-orange-100 text-orange-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return <span className={`inline-block text-[8.5px] font-semibold px-1.5 py-0.5 rounded-full ${map[tone]}`}>{children}</span>;
}

export function Avatar({ name }: { name: string }) {
  const ini = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 text-[8.5px] font-bold flex items-center justify-center shrink-0">
      {ini}
    </span>
  );
}

// Types text out letter by letter, like someone typing.
export function Typing({ text, delay = 400, speed = 90 }: { text: string; delay?: number; speed?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let t: number;
    const start = window.setTimeout(function tick() {
      setN((v) => {
        if (v >= text.length) return v;
        t = window.setTimeout(tick, speed);
        return v + 1;
      });
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(t);
    };
  }, [text, delay, speed]);
  return (
    <>
      {text.slice(0, n)}
      <span className="inline-block w-px h-3 bg-neutral-700 align-middle animate-pulse" />
    </>
  );
}

// A signature that draws itself.
export function Signing({ delay = 300 }: { delay?: number }) {
  return (
    <div className="h-20 rounded-lg border-2 border-dashed border-neutral-300 bg-white flex items-center justify-center">
      <svg viewBox="0 0 200 60" className="w-40 h-14">
        <path
          d="M10 40 C 25 10, 35 55, 50 30 S 75 15, 85 38 S 110 50, 120 25 S 150 20, 160 40 S 185 45, 192 28"
          fill="none"
          stroke="#064e3b"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: 420,
            strokeDashoffset: 420,
            animation: `demoDraw 1.6s ${delay}ms ease-in-out forwards`,
          }}
        />
        <style>{`@keyframes demoDraw { to { stroke-dashoffset: 0 } }`}</style>
      </svg>
    </div>
  );
}

// A little "Saved ✓" bubble that appears after a moment.
export function SavedToast({ text = "Saved", delay = 900 }: { text?: string; delay?: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), delay);
    return () => window.clearTimeout(t);
  }, [delay]);
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white text-emerald-700 transition-opacity"
      style={{ opacity: show ? 1 : 0 }}
    >
      <I name="check" className="w-2.5 h-2.5" /> {text}
    </span>
  );
}

// ---------- Staff (supervisor / admin) pieces ----------

// The green header on the phone dashboards.
export function DashHeader({ role, greeting }: { role: string; greeting: string }) {
  return (
    <div className="px-3.5 pt-4 pb-3.5 text-white rounded-b-2xl" style={{ background: GRADIENT }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-[10px] font-black">
            J
          </span>
          <div>
            <p className="text-[13px] font-extrabold tracking-wide leading-none">JSAFE</p>
            <p className="text-[9px] text-emerald-50/90 mt-0.5">{role}</p>
          </div>
        </div>
        <span className="text-[8.5px] font-semibold px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/30">
          Log out
        </span>
      </div>
      <p className="mt-2 text-[10.5px] font-semibold">Take 5. Work safe. Go home safe.</p>
      <div className="mt-2 pt-1.5 border-t border-white/20">
        <p className="text-[12px] font-bold leading-tight">{greeting}</p>
        <p className="text-[9px] text-emerald-50/90">Wednesday 29 October</p>
      </div>
    </div>
  );
}

// The green header on the other staff pages (with a back button).
export function PageHeader({ title, sub, back = "Dashboard" }: { title: string; sub?: string; back?: string }) {
  return (
    <div className="px-3.5 pt-3.5 pb-3.5 text-white rounded-b-2xl" style={{ background: GRADIENT }}>
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/15 ring-1 ring-white/30">
        <I name="back" className="w-2.5 h-2.5" />
        {back}
      </span>
      <p className="mt-2 text-[15px] font-extrabold leading-tight">{title}</p>
      {sub && <p className="text-[9.5px] text-emerald-50/90 mt-0.5">{sub}</p>}
    </div>
  );
}

export function NeedsReview({ n, id }: { n: number; id?: string }) {
  return (
    <div
      data-demo={id}
      className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-300 px-2.5 py-1.5 cursor-pointer"
    >
      <div>
        <p className="text-[10px] font-semibold text-amber-900">Needs your review</p>
        <p className="text-[8.5px] text-amber-800">{n} assessments waiting for a supervisor</p>
      </div>
      <span className="text-[9.5px] font-bold text-white bg-amber-600 rounded-full px-2 py-0.5">{n} →</span>
    </div>
  );
}

export function StatusPills({ active = "All", counts }: { active?: string; counts?: Record<string, number> }) {
  const list = ["All", "To review", "Completed", "Draft", "Changes", "Approved", "Archived"];
  const c = counts ?? { All: 48, "To review": 3, Completed: 0, Draft: 2, Changes: 1, Approved: 41, Archived: 1 };
  return (
    <div className="flex gap-1 overflow-hidden">
      {list.map((s) => (
        <span
          key={s}
          className={`shrink-0 flex items-center gap-1 text-[9px] px-2 py-1 rounded-full border ${
            s === active
              ? "bg-emerald-700 border-emerald-700 text-white font-semibold"
              : "bg-white border-neutral-300 text-neutral-700"
          }`}
        >
          {s}
          <span className={`text-[8px] font-bold px-1 rounded-full ${s === active ? "bg-white/25" : "bg-neutral-100 text-neutral-600"}`}>
            {c[s] ?? 0}
          </span>
        </span>
      ))}
    </div>
  );
}

export function AssessmentCard({
  name,
  team,
  when,
  status,
  tone,
  flags = [],
  today = true,
  review = false,
  reviewId,
  viewId,
  note,
  extra,
}: {
  name: string;
  team: string;
  when: string;
  status: string;
  tone: string;
  flags?: string[];
  today?: boolean;
  review?: boolean;
  reviewId?: string;
  viewId?: string;
  note?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[9.5px] ${today ? "font-semibold text-blue-800" : "text-neutral-600"}`}>
          {today && <span className="mr-1 px-1 py-px rounded bg-blue-100 text-blue-800 text-[7.5px] font-bold">TODAY</span>}
          {when}
        </p>
        <Pill tone={tone}>{status}</Pill>
      </div>
      <p className="mt-1 text-[11.5px] font-semibold text-neutral-900">{name}</p>
      <p className="text-[9.5px] text-neutral-600">Blind Creek Solar Farm · {team}</p>
      {note && <p className="text-[9px] font-semibold text-blue-700 mt-0.5">{note}</p>}
      {flags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {flags.map((f) => (
            <Pill key={f} tone="red">
              {f}
            </Pill>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-1.5">
        <div
          data-demo={viewId}
          className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg border border-emerald-700 text-emerald-700 cursor-pointer"
        >
          View
        </div>
        {review && (
          <div
            data-demo={reviewId}
            className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg bg-amber-600 text-white cursor-pointer"
          >
            Review
          </div>
        )}
      </div>
      {extra}
    </div>
  );
}

export function Check({ label, on = true }: { label: string; on?: boolean }) {
  return (
    <div
      className={`flex items-start gap-1.5 rounded-lg border px-2 py-1.5 ${
        on ? "border-emerald-300 bg-emerald-50" : "border-neutral-200 bg-white"
      }`}
    >
      <span
        className={`mt-px w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
          on ? "bg-emerald-700 text-white" : "border border-neutral-300 bg-white"
        }`}
      >
        {on && <I name="check" className="w-2.5 h-2.5" />}
      </span>
      <span className="text-[9.5px] text-neutral-800 leading-snug">{label}</span>
    </div>
  );
}

export function Input({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-[10.5px] ${
        muted ? "text-neutral-400" : "text-neutral-800"
      }`}
    >
      {children}
    </div>
  );
}

// ---------- Site photos ----------
// Real photos live in /public/demo: trench.jpg (or .png) and excavator.jpg
// (or .png). Until they're uploaded, a simple drawing shows instead.
export function SitePhoto({ kind, className = "" }: { kind: "trench" | "excavator"; className?: string }) {
  const tries = [`/demo/${kind}.jpg`, `/demo/${kind}.png`];
  const [n, setN] = useState(0);
  if (n >= tries.length) {
    return kind === "trench" ? (
      <svg viewBox="0 0 120 120" className={`bg-sky-200 ${className}`} preserveAspectRatio="xMidYMid slice">
        <rect y="48" width="120" height="72" fill="#b08455" />
        <path d="M18 70 L102 64 L106 96 L14 104 Z" fill="#4a3725" />
        <path d="M18 70 L102 64 L100 72 L22 78 Z" fill="#6b4f33" />
      </svg>
    ) : (
      <svg viewBox="0 0 120 120" className={`bg-sky-200 ${className}`} preserveAspectRatio="xMidYMid slice">
        <rect y="70" width="120" height="50" fill="#b08455" />
        <rect x="56" y="56" width="34" height="18" rx="2" fill="#f59e0b" />
        <rect x="52" y="74" width="44" height="8" rx="3" fill="#374151" />
        <path d="M60 58 L36 34 L20 52 L26 56 L38 42 L56 62 Z" fill="#d97706" />
      </svg>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tries[n]}
      alt={kind === "trench" ? "Open trench" : "Excavator working"}
      onError={() => setN((v) => v + 1)}
      className={`object-cover ${className}`}
    />
  );
}

// ---------- Timing helpers ----------

// Shows `children` only after `at` ms (and `before` until then).
export function Later({ at, children, before = null }: { at: number; children: React.ReactNode; before?: React.ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setOn(true), at);
    return () => window.clearTimeout(t);
  }, [at]);
  return <>{on ? children : before}</>;
}

// Scrolls its content like a finger swiping up the screen. Each stop scrolls
// to an element marked data-scroll="name" (or "end" for the bottom) at `at` ms.
export function AutoScroll({
  children,
  stops,
  className = "",
}: {
  children: React.ReactNode;
  stops: { at: number; to: string }[];
  className?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [y, setY] = useState(0);
  useEffect(() => {
    const timers = stops.map((s) =>
      window.setTimeout(() => {
        const o = outer.current;
        const i = inner.current;
        if (!o || !i) return;
        const max = Math.max(0, i.scrollHeight - o.clientHeight);
        let target = max;
        if (s.to !== "end") {
          const el = i.querySelector(`[data-scroll="${s.to}"]`) as HTMLElement | null;
          if (el) target = el.offsetTop - 6;
        }
        setY(Math.min(max, Math.max(0, target)));
      }, s.at)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={outer} className={`h-full overflow-hidden ${className}`}>
      <div
        ref={inner}
        className="relative"
        style={{ transform: `translateY(${-y}px)`, transition: "transform 1.1s ease-in-out" }}
      >
        {children}
      </div>
    </div>
  );
}

// Ticks a list of checkboxes one by one.
export function AutoChecks({ labels, start = 400, every = 350, show }: { labels: string[]; start?: number; every?: number; show?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const timers = labels.map((_, i) => window.setTimeout(() => setN(i + 1), start + i * every));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [labels, start, every]);
  return (
    <div className="space-y-1">
      {labels.slice(0, show ?? labels.length).map((c, i) => (
        <Check key={c} label={c} on={i < n} />
      ))}
    </div>
  );
}

// ---------- The PDF ----------
// A scrolling copy of the real JSAFE PDF, section by section.
export type PdfSignOn = { name: string; primary?: boolean; when: string };
export type PdfReview = { version: number; decision: "approved" | "changes required"; comments?: string };

export function PdfDoc({
  file = "JSAFE_Alex-Nguyen_2026-10-29.pdf",
  status = "AWAITING SUPERVISOR REVIEW",
  version = 1,
  signOns = [{ name: "Alex Nguyen", primary: true, when: "29/10/2026, 6:58 am" }],
  reviews = [],
  scrollFrom = 1200,
}: {
  file?: string;
  status?: string;
  version?: number;
  signOns?: PdfSignOn[];
  reviews?: PdfReview[];
  scrollFrom?: number;
}) {
  const h2 = "mt-2 text-[9px] font-bold text-neutral-900 border-b border-neutral-300 pb-0.5";
  const t = "text-[7.5px] text-neutral-800 leading-snug";
  const row = (l: string, v: string) => (
    <div className="flex justify-between gap-2">
      <span className={t}>{l}</span>
      <span className={`${t} font-semibold`}>{v}</span>
    </div>
  );
  return (
    <div className="h-full flex flex-col bg-neutral-300">
      <div className="px-3 py-2 bg-neutral-800 text-white text-[9px] flex items-center justify-between gap-2">
        <span className="truncate">{file}</span>
        <span className="text-neutral-300 shrink-0">Share ↑</span>
      </div>
      <div className="flex-1 min-h-0 p-2.5">
        <AutoScroll stops={[{ at: scrollFrom, to: "hazards" }, { at: scrollFrom + 2600, to: "end" }]}>
          <div className="bg-white shadow rounded-sm px-3 py-3 space-y-0.5">
            <p className="text-[11px] font-bold">Daily Task Safety Awareness</p>
            <p className={t}>Status: {status}</p>
            <p className={t}>Version: {version}</p>
            <p className={t}>Project: Blind Creek Solar Farm — 851 Tarago Road, Lake George NSW 2581 — ACLE Services Pty Ltd</p>
            <p className={t}>Date/time: 29/10/2026, 6:45 am</p>
            <p className={t}>Team: Rails installation | Location: Block C, rows 41–48</p>
            <p className={t}>Completed by: Alex Nguyen</p>
            <p className={t}>Task: Install rails on rows 41–48</p>

            <p className={h2}>Step 1 — Plan the task</p>
            {row("Do I understand today's task?", "Yes")}
            {row("Do I have the required skills, training and licences?", "Yes")}
            {row("Do I have everything required to complete the task safely?", "Yes")}
            {row("Are my tools and equipment in good condition?", "Yes")}

            <p className={h2}>SWMS</p>
            <p className={t}>Manual handling, General site works, Outdoor work, heat and lightning</p>
            <p className={h2}>PPE</p>
            <p className={t}>Hard hat, Gloves, Safety glasses, Hi-vis clothing, Long sleeves &amp; pants, Steel-toed boots, Sun protection</p>
            <p className={h2}>Permits</p>
            <p className={t}>Not required</p>
            <p className={h2}>Access &amp; changes</p>
            <p className={t}>Access route safe: Yes</p>

            <p className={h2} data-scroll="hazards">Hazards identified</p>
            <p className={`${t} font-bold`}>Could I slip, trip, fall or lose my footing?: Yes</p>
            <div className="border border-neutral-300 rounded-sm p-1.5 space-y-0.5">
              <p className={t}>Open trench beside the row 44 walkway</p>
              <p className={t}>Initial risk: High → Residual risk: Low</p>
              <p className={t}>Controls: Walk the marked path only, barricade and flag the trench edge</p>
              <p className={t}>Responsible: Alex Nguyen</p>
              <p className={t}>Control confirmed</p>
              <p className="text-[6.5px] text-neutral-500 pt-0.5">Photo of the hazard</p>
              <SitePhoto kind="trench" className="w-20 h-20 rounded-sm" />
            </div>
            <p className={`${t} font-bold pt-1`}>Could I be struck by moving plant, vehicles or falling objects?: Yes</p>
            <div className="border border-neutral-300 rounded-sm p-1.5 space-y-0.5">
              <p className={t}>Excavator digging next to row 44</p>
              <p className={t}>Initial risk: High → Residual risk: Low</p>
              <p className={t}>Controls: Stay outside the swing radius, eye contact with the operator before approaching</p>
              <p className={t}>Responsible: Alex Nguyen</p>
              <p className={t}>Control confirmed</p>
              <p className="text-[6.5px] text-neutral-500 pt-0.5">Photo of the hazard</p>
              <SitePhoto kind="excavator" className="w-20 h-20 rounded-sm" />
            </div>

            <p className={h2}>Declarations</p>
            <p className={t}>I have identified the hazards associated with today&apos;s work: Confirmed</p>
            <p className={t}>I have implemented the required controls: Confirmed</p>
            <p className={t}>If conditions change, I will stop and reassess before continuing: Confirmed</p>
            <p className={t}>I am satisfied that the task can be completed safely: Confirmed</p>

            <p className={h2}>Team sign-on ({signOns.length})</p>
            {signOns.map((s) => (
              <div key={s.name} className="pb-1">
                <p className={t}>
                  {s.name} {s.primary ? "(Primary)" : ""} · Version {version} — {s.when}
                </p>
                <svg viewBox="0 0 200 60" className="w-16 h-5">
                  <path
                    d="M10 40 C 25 10, 35 55, 50 30 S 75 15, 85 38 S 110 50, 120 25 S 150 20, 160 40"
                    fill="none"
                    stroke="#111"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            ))}

            {reviews.length > 0 && (
              <>
                <p className={h2}>Version history — supervisor reviews</p>
                {reviews.map((r) => (
                  <p key={r.version} className={t}>
                    Version {r.version} — Jordan Micallef — {r.decision}
                    {r.comments ? ` — ${r.comments}` : ""}
                  </p>
                ))}
              </>
            )}
          </div>
        </AutoScroll>
      </div>
    </div>
  );
}
