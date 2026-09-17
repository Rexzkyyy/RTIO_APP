import { config } from 'dotenv';
import path from 'path';

// Load .env
config({ path: path.resolve(process.cwd(), '.env') });

import prisma from '../src/lib/prisma';

async function main() {
  const admins = await prisma.admin.findMany();
  console.log("--- ADMIN LIST ---");
  admins.forEach(admin => {
    console.log(`Email: '${admin.email}' | Role: ${admin.role} | Name: ${admin.name}`);
  });
  console.log("------------------");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
