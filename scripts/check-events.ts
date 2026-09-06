import prisma from '../src/lib/prisma';

async function main() {
  const events = await prisma.event.findMany({
    include: { ticketCategories: true }
  });
  console.log(JSON.stringify(events, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
