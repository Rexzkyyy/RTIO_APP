import prisma from '../src/lib/prisma';

async function main() {
  console.log("Mengambil data transaksi (Non-EXPIRED)...");

  const transactions = await prisma.transaction.findMany({
    where: {
      status: { not: 'EXPIRED' }
    },
    include: {
      tickets: {
        include: {
          ticketCategory: true
        }
      }
    }
  });

  let totalTransactions = transactions.length;
  let promoCount = 0;
  let normalCount = 0;
  let totalRevenue = 0;
  let promoRevenue = 0;
  let normalRevenue = 0;

  for (const tx of transactions) {
    let isPromo = false;
    
    // Asumsi harga tiket sama dalam 1 transaksi (karena biasanya checkout 1 jenis kategori)
    if (tx.tickets.length > 0) {
      const category = tx.tickets[0].ticketCategory;
      const activePrice = tx.totalTickets > 0 ? tx.totalPrice / tx.totalTickets : 0;
      
      if (category.hasDiscount && category.discountPrice !== null && activePrice === category.discountPrice) {
        isPromo = true;
      }
    }

    if (isPromo) {
      promoCount++;
      promoRevenue += tx.totalPrice;
    } else {
      normalCount++;
      normalRevenue += tx.totalPrice;
    }
    
    totalRevenue += tx.totalPrice;
  }

  console.log(JSON.stringify({
    totalTransactions,
    promoCount,
    normalCount,
    totalRevenue,
    promoRevenue,
    normalRevenue,
    statusBreakdown: transactions.reduce((acc: any, curr: any) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {})
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
