import 'dotenv/config';
import prisma from './src/lib/prisma';

async function main() {
  const tickets = await prisma.ticket.findMany({
    take: 5,
    orderBy: {
      id: 'desc'
    },
    include: {
      transaction: {
        select: {
          status: true,
          buyerName: true
        }
      },
      ticketCategory: {
        select: {
          name: true
        }
      }
    }
  });

  console.log("Daftar Tiket (Barcode):");
  tickets.forEach(t => {
    console.log(`- Barcode: ${t.barcodeString}`);
    console.log(`  Status Transaksi: ${t.transaction.status}`);
    console.log(`  Sudah Check-in: ${t.isValidated}`);
    console.log(`  Pembeli: ${t.transaction.buyerName}`);
    console.log(`  Kategori: ${t.ticketCategory.name}`);
    console.log('---');
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
