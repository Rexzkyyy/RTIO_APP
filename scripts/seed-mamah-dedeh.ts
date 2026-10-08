import prisma from '../src/lib/prisma';
import crypto from 'crypto';

async function main() {
  console.log('Seeding data Kajian Bareng Mamah Dedeh...');

  const event = await prisma.event.create({
    data: {
      title: 'Kajian Bareng Mamah Dedeh',
      slug: 'kajian-bareng-mamah-dedeh-' + Date.now(),
      description: 'Jalani Hidup Dengan Ikhtiar, Nikmati Proses Dengan Sabar, Hadapi Hidup Dengan Syukur',
      eventDate: new Date('2026-12-20T08:00:00Z'), // 20 Des 2026, 08:00
      location: 'Ball Room Hotel Nirwana, Bau-Bau',
      artists: ['Mamah Dedeh'],
      sponsors: ['Halimbubu', 'Angin Alterasi', 'Ruang Tenang'],
      ticketConfig: {
        themeFrom: '#3b82f6',
        themeTo: '#1e3a8a',
        textColor: '#ffffff'
      },
      // Insert custom fields if needed
    }
  });

  console.log('Event created:', event.id);

  const category = await prisma.ticketCategory.create({
    data: {
      eventId: event.id,
      name: 'Umum',
      price: 0,
      quota: 1000,
      initialQuota: 1000
    }
  });

  console.log('Category created:', category.id);

  const transaction = await prisma.transaction.create({
    data: {
      eventId: event.id,
      buyerName: 'Jamaah Mamah Dedeh',
      buyerEmail: 'jamaah@example.com',
      buyerPhone: '08123456789',
      totalTickets: 1,
      totalPrice: 0,
      status: 'APPROVED',
    }
  });

  console.log('Transaction created:', transaction.id);

  const ticket = await prisma.ticket.create({
    data: {
      transactionId: transaction.id,
      ticketCategoryId: category.id,
      barcodeString: 'MAMAH-DEDEH-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      holderName: 'Jamaah Mamah Dedeh',
    }
  });

  console.log('Ticket created:', ticket.id);
  console.log('=============================================');
  console.log(`✅ BERHASIL! Silakan buka URL berikut di browser Anda untuk melihat tiketnya:`);
  console.log(`http://localhost:3000/public/${transaction.id}/ticket`);
  console.log('=============================================');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
