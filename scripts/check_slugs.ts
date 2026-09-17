import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    select: { title: true, slug: true }
  });
  console.log("=== DAFTAR EVENT DI DATABASE ===");
  events.forEach(e => {
    console.log(`Judul: "${e.title}" | Slug/URL: "${e.slug}"`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
