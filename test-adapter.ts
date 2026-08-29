import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './src/lib/prisma';

async function testAdapter() {
  console.log("Testing PrismaAdapter...");
  const adapter = PrismaAdapter(prisma);
  
  try {
    const user = await adapter.createUser({
      name: "Test User",
      email: "test@example.com",
      emailVerified: null,
      image: null
    });
    console.log("Created user successfully:", user);
  } catch (error) {
    console.error("Adapter Error:", error);
  } finally {
    // cleanup
    try {
      await prisma.user.delete({ where: { email: "test@example.com" } });
    } catch(e) {}
    process.exit(0);
  }
}

testAdapter();
