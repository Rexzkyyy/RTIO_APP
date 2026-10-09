import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

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
  const events = await prisma.event.findMany({
    include: { ticketCategories: true }
  });
  console.log("Events:");
  events.forEach(e => {
    console.log(`- ID: ${e.id} | Title: ${e.title}`);
    e.ticketCategories.forEach(c => {
      console.log(`    Cat ID: ${c.id} | Name: ${c.name} | Price: ${c.price}`);
    });
  });
}
main().catch(console.error).finally(() => process.exit(0));
