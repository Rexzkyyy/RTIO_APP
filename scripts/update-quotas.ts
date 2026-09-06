import prisma from '../src/lib/prisma';

async function main() {
  const event = await prisma.event.findFirst({
    include: { ticketCategories: { include: { tickets: true } } }
  });

  if (!event) return;

  const getCategory = (name: string) => event.ticketCategories.find(c => c.name.includes(name));

  const updates = [
    { cat: getCategory('Diamond'), newInitial: 100, newPromoLimit: 40 },
    { cat: getCategory('Gold'), newInitial: 200, newPromoLimit: 80 },
    { cat: getCategory('Silver'), newInitial: 400, newPromoLimit: 160 },
    { cat: getCategory('Reguler'), newInitial: 500, newPromoLimit: 220 }
  ];

  for (const u of updates) {
    if (!u.cat) continue;
    
    // Hitung berapa tiket yang sudah terjual / pending (TIDAK EXPIRED) untuk kategori ini
    // Kita harus fetch dari Transaction table karena Ticket bisa saja yatim jika tx expired tapi belum dihapus (meski harusnya cascade/diabaikan)
    // Cara paling aman: hitung selisih antara initialQuota saat ini dengan quota saat ini.
    // Misalnya initial 50, quota 49 -> berarti 1 tiket terpakai.
    const usedQuota = u.cat.initialQuota! - u.cat.quota;
    
    // Untuk promo, hitung selisih
    // Sayangnya initialPromoQuota tidak ada, tapi kita bisa deduksi dari:
    // Tadi di db: discountQuota 39, berarti 1 promo terpakai (karena kita tahu baru 1 yang beli).
    
    // Tapi kita bisa langsung hitung dari tiket aktif!
    const activeTickets = await prisma.ticket.count({
      where: {
        ticketCategoryId: u.cat.id,
        transaction: {
          status: { not: 'EXPIRED' }
        }
      }
    });

    // Kita asumsikan semua tiket aktif ini adalah tiket PROMO (sesuai analisa sebelumnya bahwa 100% promo).
    const activePromoTickets = activeTickets; // Karena analisa sebelumnya 100% promo

    const newCurrentQuota = u.newInitial - activeTickets;
    const newCurrentPromoQuota = u.newPromoLimit - activePromoTickets;

    await prisma.ticketCategory.update({
      where: { id: u.cat.id },
      data: {
        initialQuota: u.newInitial,
        quota: newCurrentQuota,
        discountQuota: newCurrentPromoQuota
      }
    });

    console.log(`Updated ${u.cat.name}: Total -> ${u.newInitial} (Sisa: ${newCurrentQuota}), Promo -> ${u.newPromoLimit} (Sisa: ${newCurrentPromoQuota})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
