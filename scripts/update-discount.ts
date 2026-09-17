import 'dotenv/config';
import prisma from './src/lib/prisma';

async function main() {
  const categories = await prisma.ticketCategory.findMany({
    where: { name: { contains: 'Reguler', mode: 'insensitive' } },
    include: { event: true }
  });
  
  if (categories.length === 0) {
    console.log("Tidak ada tiket Reguler ditemukan.");
    return;
  }
  
  for (const cat of categories) {
    const updated = await prisma.ticketCategory.update({
      where: { id: cat.id },
      data: {
        hasDiscount: true,
        discountPrice: Math.floor(cat.price * 0.5), // 50% discount
        discountStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        discountEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        discountQuota: 50,
      }
    });
    console.log(`Updated Ticket [${cat.name}] in Event [${cat.event.title}]: Price ${cat.price} -> Discount Price ${updated.discountPrice}`);
  }
}

main().catch(console.error).finally(async () => {
  // await prisma.$disconnect();
});
