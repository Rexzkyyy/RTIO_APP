import prisma from './src/lib/prisma';

async function main() {
  const event = await prisma.event.create({
    data: {
      title: 'Kajian & Talkshow "Seni Memahami Cinta"',
      slug: 'seni-memahami-cinta-2026',
      description: 'Seni Memahami Cinta adalah kajian dan talkshow inspiratif yang menghadirkan Dimas Seto dan Dhini Aminarti untuk berbagi pengalaman tentang membangun hubungan yang sehat, memahami pasangan, menjaga komitmen, serta menghadapi dinamika kehidupan bersama. Melalui kegiatan ini, peserta diajak untuk belajar bahwa cinta bukan sekadar memiliki, tetapi tentang saling memahami, menjaga, dan menguatkan satu sama lain.',
      eventDate: new Date('2026-11-01T08:00:00.000Z'), // Asumsi pagi
      location: '(Menunggu konfirmasi)',
      bannerUrl: '/tiketeventvip.jpg', // Path from the prompt
      ticketDesignUrl: '/tiketeventvip.jpg',
      isActive: true,
      artists: ['Dimas Seto', 'Dhini Aminarti'],
      sponsors: [],
      socialMedias: [
        { platform: 'WhatsApp', link: '+6285299383426' },
        { platform: 'Instagram', link: '@ruangtenanng.community' }
      ],
      bankAccounts: [
        {
          bank: 'Bank Syariah Indonesia',
          number: '1047541278',
          name: 'Nurtina',
        }
      ],
      ticketCategories: {
        create: [
          {
            name: 'Diamond Ticket',
            price: 450000,
            originalPrice: 450000,
            quota: 50, // asumsi
            initialQuota: 50,
            hasDiscount: true,
            discountPrice: 350000,
            discountEndDate: new Date('2026-09-30T23:59:59.000+07:00'),
            hasBenefits: true,
            benefits: ['Snack Box', 'Air Mineral', 'Buku', 'Pulpen', 'Merchandise Ruang Tenang', 'Gelang Tiket', 'Posisi Duduk Priority']
          },
          {
            name: 'Gold Ticket',
            price: 350000,
            originalPrice: 350000,
            quota: 100, // asumsi
            initialQuota: 100,
            hasDiscount: true,
            discountPrice: 250000,
            discountEndDate: new Date('2026-09-30T23:59:59.000+07:00'),
            hasBenefits: true,
            benefits: ['Snack Box', 'Air Mineral', 'Buku', 'Pulpen', 'Gelang Tiket', 'Posisi Belakang Diamond']
          },
          {
            name: 'Silver Ticket',
            price: 250000,
            originalPrice: 250000,
            quota: 150, // asumsi
            initialQuota: 150,
            hasDiscount: true,
            discountPrice: 150000,
            discountEndDate: new Date('2026-09-30T23:59:59.000+07:00'),
            hasBenefits: true,
            benefits: ['Air Mineral', 'Gelang Tiket', 'Buku', 'Pulpen']
          },
          {
            name: 'Reguler Ticket',
            price: 150000,
            originalPrice: 150000,
            quota: 200, // asumsi
            initialQuota: 200,
            hasDiscount: true,
            discountPrice: 750000, // wait, 75.000 not 750.000
            discountEndDate: new Date('2026-09-30T23:59:59.000+07:00'),
            hasBenefits: true,
            benefits: ['Gelang Tiket', 'Air Mineral']
          }
        ]
      }
    }
  });

  // Fix Reguler Ticket discount price
  await prisma.ticketCategory.updateMany({
    where: { name: 'Reguler Ticket', eventId: event.id },
    data: { discountPrice: 75000 }
  });

  console.log("Event created successfully:", event.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
