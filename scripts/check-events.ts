import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.event.count();
  console.log(`Total events in database: ${count}`);
  const events = await prisma.event.findMany({ select: { title: true, isLocked: true } });
  console.log(events);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
