import 'dotenv/config';
import prisma from './src/lib/prisma';
import crypto from 'crypto';

async function main() {
  const tickets = await prisma.ticket.findMany();
  let updated = 0;
  
  for (const ticket of tickets) {
    if (ticket.barcodeString.length > 15) { // Needs update
      // Generate short barcode e.g. TIX-A1B2C3D4
      const shortId = crypto.randomBytes(4).toString('hex').toUpperCase();
      const newBarcode = `TX-${shortId}`;
      
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { barcodeString: newBarcode }
      });
      updated++;
    }
  }
  
  console.log(`Berhasil mengupdate ${updated} tiket dengan barcode pendek.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
