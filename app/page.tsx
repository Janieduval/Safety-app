import Link from "next/link";

const BRAND_GRADIENT = "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)";

export default function HomePage() {
  return (
    <main
      className="min-h-dvh w-full min-w-0 flex items-center justify-center px-4 py-10"
      style={{ background: BRAND_GRADIENT }}
    >
      <div className="w-full max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192_2.png"
          alt=""
          className="w-20 h-20 mx-auto rounded-3xl shadow-xl ring-2 ring-white/30"
        />
        <p className="mt-4 text-3xl font-extrabold tracking-wide text-white">JSAFE</p>
        <p className="text-sm text-emerald-50/90">Daily Task Safety Awareness</p>
        <p className="mt-3 text-base font-semibold text-white">Take 5. Work safe. Go home safe.</p>

        <div className="mt-8 bg-white rounded-2xl shadow-xl p-5 text-left">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-neutral-900">Workers</p>
              <p className="text-sm text-neutral-600 mt-0.5">
                Scan the QR code posted at your site to start today&apos;s Take 5.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
              Staff
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/supervisor/login"
                className="text-center text-sm py-2.5 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
              >
                Supervisor
              </Link>
              <Link
                href="/admin/login"
                className="text-center text-sm py-2.5 rounded-xl border border-neutral-300 text-neutral-800 font-semibold hover:bg-neutral-50"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
