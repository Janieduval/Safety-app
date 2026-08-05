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

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
      <div className="mb-6">
        <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
          Daily Task Safety Awareness
        </p>
        <h1 className="text-2xl font-bold text-neutral-900 mt-1">{project.name}</h1>
        <p className="text-neutral-600 mt-1">{project.address}</p>
        <p className="text-neutral-500 text-sm mt-1">Contractor: {project.contractor}</p>
      </div>

      <StartAssessmentForm projectId={project.id} workers={project.workers} />
    </main>
  );
}
