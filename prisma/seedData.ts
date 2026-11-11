import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED_TEAMS, SEED_SWMS, SEED_PPE, SEED_PERMITS } from "../lib/constants";

export async function seedDatabase(
  prisma: PrismaClient,
  opts: { adminEmail?: string; adminPassword?: string } = {}
) {
  const log: string[] = [];

  for (const label of SEED_TEAMS) {
    await prisma.teamOption.upsert({
      where: { label },
      update: {},
      create: { label },
    });
  }
  log.push(`Seeded ${SEED_TEAMS.length} teams`);

  // The project's details come from environment variables, so a separate copy
  // of JSAFE (its own Vercel project and database) can set up its own site.
  // Without them it falls back to Blind Creek, as before.
  const projectName = process.env.PROJECT_NAME?.trim() || "Blind Creek Solar Farm";
  const projectSlug =
    process.env.PROJECT_SLUG?.trim() ||
    projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const project = await prisma.project.upsert({
    where: { qrSlug: projectSlug },
    update: {},
    create: {
      name: projectName,
      address: process.env.PROJECT_ADDRESS?.trim() || "851 Tarago Road, Lake George NSW 2581",
      contractor: process.env.PROJECT_CONTRACTOR?.trim() || "ACLE Services Pty Ltd",
      qrSlug: projectSlug,
    },
  });
  log.push(`Project ready: ${project.name} (/${project.qrSlug})`);

  for (const label of SEED_SWMS) {
    const existing = await prisma.swmsOption.findFirst({ where: { projectId: project.id, label } });
    if (!existing) await prisma.swmsOption.create({ data: { projectId: project.id, label } });
  }
  log.push(`Seeded ${SEED_SWMS.length} SWMS options`);

  for (const { label, preselected } of SEED_PPE) {
    const existing = await prisma.ppeOption.findFirst({ where: { projectId: project.id, label } });
    if (!existing) {
      await prisma.ppeOption.create({ data: { projectId: project.id, label, preselected } });
    }
  }
  log.push(`Seeded ${SEED_PPE.length} PPE options`);

  for (const label of SEED_PERMITS) {
    const existing = await prisma.permitType.findFirst({ where: { projectId: project.id, label } });
    if (!existing) await prisma.permitType.create({ data: { projectId: project.id, label } });
  }
  log.push(`Seeded ${SEED_PERMITS.length} permit types`);

  // Sample people are only for trying the app out. A new site can skip them
  // by setting SAMPLE_PEOPLE to "no".
  const addSamples = process.env.SAMPLE_PEOPLE?.trim().toLowerCase() !== "no";

  const sampleWorkers = !addSamples ? [] : [
    "Alex Nguyen",
    "Brianna Fields",
    "Chris Doukas",
    "Dev Patel",
    "Elena Kovac",
    "Frank Ihimaera",
  ];
  for (const name of sampleWorkers) {
    const existing = await prisma.worker.findFirst({ where: { projectId: project.id, name } });
    if (!existing) await prisma.worker.create({ data: { projectId: project.id, name } });
  }
  log.push(`Seeded ${sampleWorkers.length} sample workers — replace these in the admin dashboard`);

  const sampleSupervisors = !addSamples ? [] : ["Jordan Micallef", "Priya Ramesh"];
  for (const name of sampleSupervisors) {
    const existing = await prisma.supervisor.findFirst({ where: { projectId: project.id, name } });
    if (!existing) await prisma.supervisor.create({ data: { projectId: project.id, name } });
  }
  log.push(`Seeded ${sampleSupervisors.length} sample supervisors — replace these in the admin dashboard`);

  if (opts.adminEmail && opts.adminPassword) {
    const passwordHash = await bcrypt.hash(opts.adminPassword, 12);
    await prisma.adminUser.upsert({
      where: { email: opts.adminEmail },
      update: { passwordHash },
      create: { email: opts.adminEmail, passwordHash },
    });
    log.push(`Admin account ready: ${opts.adminEmail}`);
  }

  return log;
}
