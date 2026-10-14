import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Kind = "worker" | "supervisor";

type Person = {
  id: string;
  name: string;
  needsReview: boolean;
  createdAt: Date;
  assessments: number;
  signOns: number;
  reviews: number;
};

function isKind(value: unknown): value is Kind {
  return value === "worker" || value === "supervisor";
}

// ---------- Name matching ----------

function normalise(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sortedWords(name: string) {
  return normalise(name).split(" ").sort().join(" ");
}

function editDistance(a: string, b: string) {
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return dp[b.length];
}

function matchReason(nameA: string, nameB: string): string | null {
  const a = normalise(nameA);
  const b = normalise(nameB);
  if (!a || !b) return null;
  if (a === b) return "Same name";
  if (sortedWords(nameA) === sortedWords(nameB)) return "Same words in a different order";
  const wordsA = a.split(" ");
  const wordsB = b.split(" ");
  const shorter = wordsA.length <= wordsB.length ? wordsA : wordsB;
  const longer = wordsA.length <= wordsB.length ? wordsB : wordsA;
  if (shorter.length >= 2 && shorter.length < longer.length && shorter.every((w, i) => longer[i] === w)) {
    return "One looks like a shortened version of the other";
  }
  const shortest = Math.min(a.length, b.length);
  const allowed = shortest >= 8 ? 2 : shortest >= 5 ? 1 : 0;
  if (allowed > 0 && editDistance(a, b) <= allowed) return "Very similar spelling";
  return null;
}

function pairKey(kind: Kind, idA: string, idB: string) {
  return `${kind}:${[idA, idB].sort().join(":")}`;
}

// ---------- Loading people ----------

async function loadPeople(projectId: string, kind: Kind): Promise<Person[]> {
  if (kind === "worker") {
    const rows = await prisma.worker.findMany({
      where: { projectId, archived: false },
    });
    const ids = rows.map((w) => w.id);
    const authored = await prisma.assessment.groupBy({
      by: ["completedByWorkerId"],
      where: { completedByWorkerId: { in: ids } },
      _count: { _all: true },
    });
    const signed = await prisma.signOn.groupBy({
      by: ["workerId"],
      where: { workerId: { in: ids } },
      _count: { _all: true },
    });
    const authoredMap = new Map<string, number>();
    for (const r of authored) {
      if (r.completedByWorkerId) authoredMap.set(r.completedByWorkerId, r._count._all);
    }
    const signedMap = new Map<string, number>();
    for (const r of signed) signedMap.set(r.workerId, r._count._all);

    return rows.map((w) => ({
      id: w.id,
      name: w.name,
      needsReview: w.needsReview,
      createdAt: w.createdAt,
      assessments: authoredMap.get(w.id) ?? 0,
      signOns: signedMap.get(w.id) ?? 0,
      reviews: 0,
    }));
  }

  const rows = await prisma.supervisor.findMany({
    where: { projectId, archived: false },
  });
  const ids = rows.map((s) => s.id);
  const reviewed = await prisma.supervisorReview.groupBy({
    by: ["supervisorId"],
    where: { supervisorId: { in: ids } },
    _count: { _all: true },
  });
  const reviewedMap = new Map<string, number>();
  for (const r of reviewed) reviewedMap.set(r.supervisorId, r._count._all);

  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    needsReview: false,
    createdAt: s.createdAt,
    assessments: 0,
    signOns: 0,
    reviews: reviewedMap.get(s.id) ?? 0,
  }));
}

// ---------- GET: list suggested duplicate pairs ----------

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const kind = req.nextUrl.searchParams.get("kind") ?? "worker";
  if (!projectId || !isKind(kind)) {
    return NextResponse.json({ error: "projectId and a valid kind are required" }, { status: 400 });
  }

  const people = await loadPeople(projectId, kind);

  const dismissedRows = await prisma.auditLog.findMany({
    where: { entityType: "MergeDismissal", entityId: { startsWith: `${kind}:` } },
    select: { entityId: true },
  });
  const dismissed = new Set(dismissedRows.map((r) => r.entityId));

  const pairs: { reason: string; a: Person; b: Person }[] = [];
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      if (dismissed.has(pairKey(kind, a.id, b.id))) continue;
      const reason = matchReason(a.name, b.name);
      if (reason) pairs.push({ reason, a, b });
    }
  }

  return NextResponse.json({ pairs });
}

// ---------- Merging ----------

async function mergeWorkers(keepId: string, removeId: string) {
  const keep = await prisma.worker.findUnique({ where: { id: keepId } });
  const remove = await prisma.worker.findUnique({ where: { id: removeId } });
  if (!keep || !remove) {
    return { status: 404, body: { error: "One of those people no longer exists." } };
  }
  if (keep.projectId !== remove.projectId) {
    return { status: 400, body: { error: "Those two people are on different projects." } };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      let signaturesMoved = 0;
      let duplicateSignaturesDropped = 0;

      const removeSignOns = await tx.signOn.findMany({ where: { workerId: removeId } });
      for (const s of removeSignOns) {
        const clash = await tx.signOn.findUnique({
          where: {
            assessmentId_workerId_version: {
              assessmentId: s.assessmentId,
              workerId: keepId,
              version: s.version,
            },
          },
        });
        if (clash) {
          // Both people signed the same version: keep one signature.
          if (s.isPrimary && !clash.isPrimary) {
            await tx.signOn.update({ where: { id: clash.id }, data: { isPrimary: true } });
          }
          await tx.signOn.delete({ where: { id: s.id } });
          duplicateSignaturesDropped++;
        } else {
          await tx.signOn.update({ where: { id: s.id }, data: { workerId: keepId } });
          signaturesMoved++;
        }
      }

      const authored = await tx.assessment.updateMany({
        where: { completedByWorkerId: removeId },
        data: { completedByWorkerId: keepId },
      });
      await tx.changeAcknowledgment.updateMany({
        where: { workerId: removeId },
        data: { workerId: keepId },
      });
      await tx.reassessment.updateMany({
        where: { initiatedByWorkerId: removeId },
        data: { initiatedByWorkerId: keepId },
      });
      await tx.auditLog.updateMany({
        where: { actorName: removeId },
        data: { actorName: keepId },
      });

      // The admin has confirmed these are the same person, so clear the unverified flag.
      await tx.worker.update({ where: { id: keepId }, data: { needsReview: false } });
      await tx.worker.delete({ where: { id: removeId } });

      await tx.auditLog.create({
        data: {
          entityType: "WorkerMerge",
          entityId: keepId,
          action: "workers_merged",
          actorName: "admin",
          beforeJson: JSON.stringify({ removed: { id: removeId, name: remove.name } }),
          afterJson: JSON.stringify({
            kept: { id: keepId, name: keep.name },
            assessmentsMoved: authored.count,
            signaturesMoved,
            duplicateSignaturesDropped,
          }),
        },
      });

      return { assessmentsMoved: authored.count, signaturesMoved, duplicateSignaturesDropped };
    },
    { timeout: 20000 }
  );

  return { status: 200, body: { ok: true, ...result } };
}

async function mergeSupervisors(keepId: string, removeId: string) {
  const keep = await prisma.supervisor.findUnique({ where: { id: keepId } });
  const remove = await prisma.supervisor.findUnique({ where: { id: removeId } });
  if (!keep || !remove) {
    return { status: 404, body: { error: "One of those people no longer exists." } };
  }
  if (keep.projectId !== remove.projectId) {
    return { status: 400, body: { error: "Those two people are on different projects." } };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const moved = await tx.supervisorReview.updateMany({
        where: { supervisorId: removeId },
        data: { supervisorId: keepId },
      });
      await tx.auditLog.updateMany({
        where: { actorName: removeId },
        data: { actorName: keepId },
      });
      await tx.supervisor.delete({ where: { id: removeId } });

      await tx.auditLog.create({
        data: {
          entityType: "SupervisorMerge",
          entityId: keepId,
          action: "supervisors_merged",
          actorName: "admin",
          beforeJson: JSON.stringify({ removed: { id: removeId, name: remove.name } }),
          afterJson: JSON.stringify({
            kept: { id: keepId, name: keep.name },
            reviewsMoved: moved.count,
          }),
        },
      });

      return { reviewsMoved: moved.count };
    },
    { timeout: 20000 }
  );

  return { status: 200, body: { ok: true, ...result } };
}

// ---------- POST: merge or dismiss ----------

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action as string;
  const kind = body.kind;
  if (!isKind(kind)) {
    return NextResponse.json({ error: "A valid kind is required" }, { status: 400 });
  }

  if (action === "dismiss") {
    const { idA, idB } = body as { idA?: string; idB?: string };
    if (!idA || !idB || idA === idB) {
      return NextResponse.json({ error: "Two different ids are required" }, { status: 400 });
    }
    const key = pairKey(kind, idA, idB);
    const existing = await prisma.auditLog.findFirst({
      where: { entityType: "MergeDismissal", entityId: key },
    });
    if (!existing) {
      await prisma.auditLog.create({
        data: {
          entityType: "MergeDismissal",
          entityId: key,
          action: "merge_declined",
          actorName: "admin",
        },
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "merge") {
    const { keepId, removeId } = body as { keepId?: string; removeId?: string };
    if (!keepId || !removeId || keepId === removeId) {
      return NextResponse.json({ error: "Two different ids are required" }, { status: 400 });
    }
    const outcome =
      kind === "worker"
        ? await mergeWorkers(keepId, removeId)
        : await mergeSupervisors(keepId, removeId);
    return NextResponse.json(outcome.body, { status: outcome.status });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
