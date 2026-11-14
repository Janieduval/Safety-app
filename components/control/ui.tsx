import Link from "next/link";

// Small building blocks for the control centre pages.

export function PageTop({
  crumbs,
  title,
  sub,
  actions,
}: {
  crumbs?: { href?: string; label: string }[];
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <p className="text-sm text-neutral-500 mb-1">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && " › "}
              {c.href ? (
                <Link href={c.href} className="font-semibold text-emerald-700 hover:text-emerald-800">
                  {c.label}
                </Link>
              ) : (
                c.label
              )}
            </span>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          {sub && <p className="text-sm text-neutral-500 mt-0.5">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, right, children, className = "" }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 md:p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-neutral-900">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

const PILL: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
  grey: "bg-neutral-100 text-neutral-600",
};

export function Pill({ tone = "grey", children }: { tone?: keyof typeof PILL | string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${PILL[tone] ?? PILL.grey}`}>{children}</span>;
}

export function Dot({ tone }: { tone: "green" | "red" | "amber" | "grey" }) {
  const c = { green: "bg-emerald-500", red: "bg-red-500", amber: "bg-amber-500", grey: "bg-neutral-400" }[tone];
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} />;
}

// Little bar chart; the last bar (today) is darker.
export function Bars({ values, height = "h-10" }: { values: number[]; height?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className={`flex items-end gap-1 ${height}`}>
      {values.map((v, i) => (
        <span
          key={i}
          className={`flex-1 rounded-t ${i === values.length - 1 ? "bg-emerald-500" : "bg-emerald-200"}`}
          style={{ height: `${Math.max(v ? 8 : 3, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export const btnGreen = "inline-flex items-center justify-center gap-1 text-sm px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800";
export const btnOutline = "inline-flex items-center justify-center gap-1 text-sm px-4 py-2 rounded-xl border border-emerald-700 text-emerald-700 bg-white font-semibold hover:bg-emerald-50";
export const btnPlain = "inline-flex items-center justify-center gap-1 text-sm px-4 py-2 rounded-xl border border-neutral-300 text-neutral-800 bg-white font-semibold hover:bg-neutral-50";
