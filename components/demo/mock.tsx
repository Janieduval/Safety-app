"use client";

import { useEffect, useState } from "react";

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
