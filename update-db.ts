import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany();
  if (events.length > 0) {
    const updated = await prisma.event.update({
      where: { id: events[0].id },
      data: {
        whatsapp: '081234567890',
        instagram: 'ruangtenang'
      }
    });
    console.log('Updated event:', updated.title);
  } else {
    console.log('No events found');
  }
}

main().finally(() => prisma.$disconnect());
