import fs from 'fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const isSupabaseUrl = (url?: string) => {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'supabase.com' || hostname.endsWith('.supabase.com');
  } catch {
    return false;
  }
};

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ 
  connectionString,
  max: 1, 
  ssl: isSupabaseUrl(connectionString) ? { rejectUnauthorized: false } : undefined
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Loading parsed data...");
  const data = JSON.parse(fs.readFileSync('C:\\laragon\\www\\E-Tiket\\parsed_data.json', 'utf8'));
  console.log(`Found ${data.length} records.`);

  // 1. Create a new Event
  const eventName = "Kajian Spesial Akhir Tahun";
  
  // Find or create event
  let event = await prisma.event.findFirst({
    where: { title: eventName }
  });

  if (!event) {
    console.log(`Creating event: ${eventName}...`);
    event = await prisma.event.create({
      data: {
        title: eventName,
        slug: "kajian-spesial-akhir-tahun-legacy",
        description: "Event migrasi dari sistem e-tiket lama.",
        location: "Kendari",
        eventDate: new Date("2026-12-31T00:00:00.000Z"),
        isActive: false // Since it's old
      }
    });
  } else {
    console.log(`Event '${eventName}' already exists. ID: ${event.id}`);
  }

  // 2. Identify unique ticket categories and create them
  const ticketTypes = [...new Set(data.map((d: any) => d.jenis_tiket).filter(Boolean))];
  const categoryIdMap: Record<string, string> = {};

  console.log("Setting up Ticket Categories...");
  for (const type of ticketTypes) {
    const nameStr = String(type);
    let price = 0;
    // Extract price from name e.g. 185k -> 185000, 130K -> 130000, 50k -> 50000
    const match = nameStr.match(/(\d+)k/i);
    if (match && match[1]) {
      price = parseInt(match[1]) * 1000;
    }

    let cat = await prisma.ticketCategory.findFirst({
      where: { eventId: event.id, name: nameStr }
    });
    
    if (!cat) {
      cat = await prisma.ticketCategory.create({
        data: {
          eventId: event.id,
          name: nameStr,
          price: price,
          quota: 1000
        }
      });
    }
    categoryIdMap[nameStr] = cat.id;
  }

  // 3. Insert Transactions and Tickets
  console.log("Importing transactions and tickets...");
  
  for (const row of data) {
    try {
      if (!row.barcode) continue;
      
      const qty = row.jumlah_tiket ? parseInt(row.jumlah_tiket) : 1;
      const categoryId = row.jenis_tiket ? categoryIdMap[row.jenis_tiket] : null;
      
      // If we don't have category ID (e.g. it was null), just pick the first one or skip
      if (!categoryId) {
        console.log(`Skipping row for ${row.nama_lengkap}, no ticket category.`);
        continue;
      }

      // Check if ticket with barcode already exists
      const existingTicket = await prisma.ticket.findUnique({
        where: { barcodeString: row.barcode }
      });

      if (existingTicket) {
        console.log(`Barcode ${row.barcode} already imported.`);
        continue;
      }

      const status = row.validasi_bayar === 'SUDAH' ? 'APPROVED' : 'PENDING';

      // Create Transaction
      const transaction = await prisma.transaction.create({
        data: {
          eventId: event.id,
          buyerName: row.nama_lengkap || 'Unknown',
          buyerEmail: row.email || 'unknown@example.com',
          buyerPhone: row.whatsapp || '',
          buyerGender: row.jenis_kelamin || null,
          buyerAddress: row.alamat || null,
          totalTickets: qty,
          totalPrice: 0, // could calculate, but historical data doesn't matter much
          paymentProofUrl: row.bukti_transfer || null,
          senderAccountName: row.nama_pengirim || null,
          status: status,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
        }
      });

      // Create Ticket
      let age = null;
      if (row.usia) {
        const ageMatch = row.usia.match(/(\d+)/);
        if (ageMatch && ageMatch[1]) {
           const parsedAge = parseInt(ageMatch[1]);
           if (parsedAge < 150) {
             age = parsedAge;
           }
        }
      }

      await prisma.ticket.create({
        data: {
          transactionId: transaction.id,
          ticketCategoryId: categoryId,
          barcodeString: row.barcode,
          isValidated: row.status_absen === 'SUDAH',
          checkedInAt: row.waktu_absen && row.waktu_absen !== 'null' ? new Date(row.waktu_absen) : null,
          holderName: row.nama_lengkap || 'Unknown',
          holderPhone: row.whatsapp || null,
          holderGender: row.jenis_kelamin || null,
          holderAge: age
        }
      });
      
    } catch (e: any) {
      console.error(`Error importing row ${row.barcode}:`, e.message);
    }
  }

  console.log("Import completed!");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
