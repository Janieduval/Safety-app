import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import StartAssessmentForm from "./StartAssessmentForm";
import WorkerDemo from "@/components/demo/WorkerDemo";

// Always build this page fresh, so the greeting and date are never stale.
export const dynamic = "force-dynamic";

// "Good morning" / "Good afternoon" / "Good evening" by Sydney time.
function greetingSydney(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
    <main className="min-h-dvh w-full min-w-0 bg-neutral-50">
      {/* ---------- JSAFE header ---------- */}
      <header
        className="px-5 pt-8 pb-6 rounded-b-3xl text-white shadow-md"
        style={{ background: "linear-gradient(135deg, #10b981 0%, #047857 55%, #064e3b 100%)" }}
      >
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192_2.png"
              alt=""
              className="w-12 h-12 rounded-2xl shadow-lg ring-2 ring-white/30 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-2xl font-extrabold tracking-wide leading-none">JSAFE</p>
              <p className="text-sm font-semibold text-white mt-1 truncate">{project.name}</p>
            </div>
          </div>

          {(project.address || project.contractor) && (
            <div className="mt-3 space-y-1 text-xs text-emerald-50/90">
              {project.address && (
                <p className="flex items-start gap-1.5">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 mt-px shrink-0"
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
              {project.contractor && <p className="pl-5">Contractor: {project.contractor}</p>}
            </div>
          )}

          <p className="mt-4 text-base font-semibold">Take 5. Work safe. Go home safe.</p>

          <div className="mt-4 pt-3 border-t border-white/20">
            <p className="text-lg font-bold leading-tight">{greetingSydney()}</p>
            <p className="text-sm text-emerald-50/90">{todayLabel}</p>
          </div>

          {/* "New here? Watch the demo" — only on this home page */}
          <div className="mt-4">
            <WorkerDemo />
          </div>
        </div>
      </header>

      {/* ---------- Tiles / chosen screen ---------- */}
      <div className="px-4 pt-6 pb-10">
        <div className="max-w-md mx-auto">
          <StartAssessmentForm projectId={project.id} qrSlug={params.projectSlug} workers={project.workers} />
        </div>

        <p className="max-w-md mx-auto mt-10 text-center text-xs font-medium text-neutral-400">
          Daily Task Safety Awareness
        </p>
      </div>
    </main>
  );
}
