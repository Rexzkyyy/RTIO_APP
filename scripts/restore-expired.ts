import prisma from '../src/lib/prisma';

async function main() {
  console.log("Mencari transaksi yang berstatus EXPIRED tetapi sudah memiliki paymentProofUrl...");
  
  // Cari semua transaksi yang kedaluwarsa tapi sudah ada bukti bayar
  const txs = await prisma.transaction.findMany({
    where: {
      status: 'EXPIRED',
      paymentProofUrl: { not: null }
    },
    include: { tickets: true }
  });

  console.log(`Ditemukan ${txs.length} transaksi yang akan dikembalikan ke PENDING.`);

  for (const tx of txs) {
    // Hitung berapa tiket per kategori dalam transaksi ini
    const quotaToDeduct = new Map<string, number>();
    for (const ticket of tx.tickets) {
      const current = quotaToDeduct.get(ticket.ticketCategoryId) ?? 0;
      quotaToDeduct.set(ticket.ticketCategoryId, current + 1);
    }

    // Lakukan secara atomik
    await prisma.$transaction(async (prismaTx) => {
      // Ubah status kembali menjadi PENDING
      await prismaTx.transaction.update({
        where: { id: tx.id },
        data: { status: 'PENDING' }
      });

      // Kurangi kembali kuota tiketnya (karena sebelumnya dikembalikan saat expire)
      for (const [categoryId, count] of quotaToDeduct.entries()) {
        const category = await prismaTx.ticketCategory.findUnique({
          where: { id: categoryId },
        });

        if (category) {
          const activePrice = tx.totalTickets > 0 ? tx.totalPrice / tx.totalTickets : 0;
          const usedDiscount = category.hasDiscount && category.discountPrice !== null && activePrice === category.discountPrice;
          
          const updateData: any = {
            quota: { decrement: count },
          };

          if (usedDiscount && category.discountQuota !== null) {
            updateData.discountQuota = { decrement: count };
          }

          await prismaTx.ticketCategory.update({
            where: { id: categoryId },
            data: updateData,
          });
        }
      }
    });
    
    console.log(`Berhasil mengembalikan transaksi ID: ${tx.id}`);
  }
  
  console.log("Selesai mengembalikan semua transaksi!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
