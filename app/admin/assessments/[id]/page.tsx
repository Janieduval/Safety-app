import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import StaffShell from "@/components/StaffShell";
import AssessmentRecord from "@/components/AssessmentRecord";

export const dynamic = "force-dynamic";

export default async function AssessmentRecordPage({ params }: { params: { id: string } }) {
  const a = await prisma.assessment.findUnique({
    where: { id: params.id },
    include: {
      project: true,
      team: true,
      completedByWorker: true,
      step1Responses: true,
      swms: { include: { swmsOption: true } },
      ppe: { include: { ppeOption: true } },
      permits: { include: { permitType: true } },
      accessCheck: true,
      changeEntries: true,
      hazardResponses: { include: { cards: { include: { photos: { orderBy: { createdAt: "asc" } } } } } },
      declarations: true,
      newHazardFlag: true,
      signOns: { include: { worker: true }, orderBy: { signedAt: "asc" } },
      supervisorReviews: { include: { supervisor: true }, orderBy: { version: "asc" } },
      reassessments: true,
      auditLogs: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!a) notFound();

  const actions = (
    <>
      {a.status === "awaiting_supervisor_review" && (
        <Link
          href={`/assess/${a.id}/supervisor-review?from=admin`}
          className="text-sm px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold shadow-sm hover:bg-amber-600"
        >
          Review
        </Link>
      )}
      <a href={`/api/assessments/${a.id}/pdf?view=1`} target="_blank" rel="noreferrer" className="text-sm px-4 py-2 rounded-xl bg-white text-emerald-800 font-semibold border border-emerald-200 shadow-sm hover:bg-emerald-50">
        Open PDF
      </a>
    </>
  );

  return (
    <StaffShell
      role="admin"
      active="/admin/dashboard"
      title={a.completedByWorker?.name ?? "Assessment"}
      subtitle={`${a.team?.label ?? a.otherTeamText ?? "No team"} · ${new Date(a.dateTime).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short", year: "numeric" })}`}
      icon="doc"
      backHref="/admin/dashboard"
      backLabel="Dashboard"
      actions={actions}
    >
      <AssessmentRecord a={a} />
    </StaffShell>
  );
}
