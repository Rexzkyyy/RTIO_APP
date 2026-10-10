import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false} });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function dump() {
  const e = await prisma.event.findFirst({
    where: { slug: 'jeda-sejenak-menguatkan-hati' },
    include: { ticketCategories: true }
  });
  if(!e) return;
  
  const bankAccountsStr = e.bankAccounts ? `'${JSON.stringify(e.bankAccounts)}'` : 'NULL';
  const socialMediasStr = e.socialMedias ? `'${JSON.stringify(e.socialMedias)}'` : 'NULL';
  const waGroupLinkStr = e.waGroupLink ? `'${e.waGroupLink}'` : 'NULL';

  console.log('-- 1. Insert Event');
  console.log('INSERT INTO "Event" ("id", "title", "slug", "description", "eventDate", "location", "isActive", "isLocked", "artists", "sponsors", "bankAccounts", "socialMedias", "waGroupLink", "createdAt") VALUES');
  console.log(`('${e.id}', '${e.title}', '${e.slug}', '${e.description.replace(/'/g, "''")}', '${e.eventDate.toISOString()}', '${e.location}', true, false, '{"Ghinan Rhinda", "Sasmita Sugiardi"}', '{"Ruang Tenang", "Rumah Pelangi", "Dompet Dhuafa", "Elegan", "Custom", "Hisana", "Bang Awal"}', ${bankAccountsStr}, ${socialMediasStr}, ${waGroupLinkStr}, NOW());`);
  
  console.log('\n-- 2. Insert Ticket Categories');
  console.log('INSERT INTO "TicketCategory" ("id", "eventId", "name", "price", "quota", "hasDiscount", "hasBenefits") VALUES');
  e.ticketCategories.forEach((tc, idx) => {
    const isLast = idx === e.ticketCategories.length - 1;
    console.log(`('${tc.id}', '${e.id}', '${tc.name}', ${tc.price}, ${tc.quota}, false, false)${isLast ? ';' : ','}`);
  });
}
dump().then(()=>process.exit(0));
