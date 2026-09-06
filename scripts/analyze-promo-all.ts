import prisma from '../src/lib/prisma';

async function main() {
  console.log("Mengambil SELURUH data transaksi (Termasuk EXPIRED)...");

  const transactions = await prisma.transaction.findMany({
    include: {
      tickets: {
        include: {
          ticketCategory: true
        }
      }
    }
  });

  const result = {
    totalTransactions: transactions.length,
    active: { count: 0, promo: 0, normal: 0 },
    expired: { count: 0, promo: 0, normal: 0 },
  };

  for (const tx of transactions) {
    let isPromo = false;
    
    if (tx.tickets.length > 0) {
      const category = tx.tickets[0].ticketCategory;
      const activePrice = tx.totalTickets > 0 ? tx.totalPrice / tx.totalTickets : 0;
      if (category.hasDiscount && category.discountPrice !== null && activePrice === category.discountPrice) {
        isPromo = true;
      }
    }

    if (tx.status === 'EXPIRED') {
      result.expired.count++;
      if (isPromo) result.expired.promo++;
      else result.expired.normal++;
    } else {
      result.active.count++;
      if (isPromo) result.active.promo++;
      else result.active.normal++;
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
