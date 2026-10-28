import Link from "next/link";

// Green JSAFE header for the worker pages (sign-on, reassess).
// Same look as the worker home page, a bit more compact.

const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";

export default function WorkerHeader({
  context,
  title,
  subtitle,
  backHref,
  backLabel = "Home",
}: {
  context?: string;
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header
      className="rounded-b-3xl text-white shadow-md"
      style={{ background: BRAND_GRADIENT }}
    >
      <div className="max-w-md mx-auto px-5 pt-5 pb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192_2.png"
              alt=""
              className="w-9 h-9 rounded-xl shadow ring-2 ring-white/30 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-base font-extrabold tracking-wide leading-none">JSAFE</p>
              {context && (
                <p className="text-[11px] text-emerald-50/85 mt-0.5 truncate">{context}</p>
              )}
            </div>
          </div>
          {backHref && (
            <Link
              href={backHref}
              className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 ring-1 ring-white/30 active:bg-white/25"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
              {backLabel}
            </Link>
          )}
        </div>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-emerald-50/90">{subtitle}</p>}
      </div>
    </header>
  );
}
