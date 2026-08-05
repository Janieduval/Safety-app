import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "./seedData";

const prisma = new PrismaClient();

async function main() {
  const log = await seedDatabase(prisma);
  log.forEach((line) => console.log(line));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
