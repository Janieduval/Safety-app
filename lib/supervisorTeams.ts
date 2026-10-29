import { prisma } from "@/lib/prisma";

// Every active team, plus the ones this supervisor looks after.
export async function getSupervisorTeams(supervisorId: string) {
  const [teams, mine] = await Promise.all([
    prisma.teamOption.findMany({
      where: { active: true },
      orderBy: { label: "asc" },
      select: { id: true, label: true },
    }),
    prisma.supervisorTeam.findMany({
      where: { supervisorId },
      select: { teamId: true },
    }),
  ]);
  return { teams, teamIds: mine.map((m) => m.teamId) };
}

// Replaces this supervisor's teams with the ones given.
export async function setSupervisorTeams(supervisorId: string, teamIds: unknown) {
  if (!Array.isArray(teamIds) || teamIds.some((t) => typeof t !== "string")) {
    throw new Error("teamIds must be a list");
  }
  const valid = await prisma.teamOption.findMany({
    where: { id: { in: teamIds as string[] } },
    select: { id: true },
  });
  const ids = valid.map((v) => v.id);
  await prisma.$transaction([
    prisma.supervisorTeam.deleteMany({ where: { supervisorId } }),
    prisma.supervisorTeam.createMany({
      data: ids.map((teamId) => ({ supervisorId, teamId })),
      skipDuplicates: true,
    }),
  ]);
  return ids;
}
