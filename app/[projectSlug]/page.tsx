import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import StartAssessmentForm from "./StartAssessmentForm";

export default async function ProjectLandingPage({
  params,
}: {
  params: { projectSlug: string };
}) {
  const project = await prisma.project.findUnique({
    where: { qrSlug: params.projectSlug },
    include: {
      workers: { where: { active: true, archived: false }, orderBy: { name: "asc" } },
    },
  });
  if (!project || !project.active) notFound();

  const todayLabel = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main className="min-h-dvh w-full min-w-0 bg-emerald-50/40">
      {/* ---------- Site banner ---------- */}
      <header
        className="px-5 pt-6 pb-14 text-white"
        style={{ background: "linear-gradient(150deg, #34d399 0%, #10b981 35%, #047857 100%)" }}
      >
        <div className="max-w-md mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 ring-1 ring-white/25 pl-1 pr-3 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192_2.png" alt="" className="w-6 h-6 rounded-full" />
            <span className="text-xs font-bold tracking-wider">JSAFE</span>
          </div>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight">{project.name}</h1>

          {project.address && (
            <p className="mt-2 flex items-start gap-1.5 text-sm text-emerald-50">
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {project.address}
            </p>
          )}
          {project.contractor && (
            <p className="mt-1 text-xs text-emerald-50/80">Contractor: {project.contractor}</p>
          )}

          <div className="mt-5 pt-4 border-t border-white/25">
            <p className="text-sm text-emerald-50/90">{todayLabel}</p>
            <p className="text-lg font-bold">Before you start, take 5.</p>
          </div>
        </div>
      </header>

      {/* ---------- Start / continue card ---------- */}
      <div className="px-4 -mt-8 pb-10">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-lg ring-1 ring-black/5 p-5">
          <StartAssessmentForm projectId={project.id} qrSlug={params.projectSlug} workers={project.workers} />
        </div>

        <p className="mt-8 text-center text-sm font-semibold text-emerald-800">
          Take 5. Work safe. Go home safe.
        </p>
        <p className="mt-1 text-center text-xs text-neutral-500">Daily Task Safety Awareness</p>
      </div>
    </main>
  );
}
