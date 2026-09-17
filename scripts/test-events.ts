import prisma from './src/lib/prisma';

async function testEvents() {
  try {
    const events = await prisma.event.findMany();
    console.log("Events:", events.length);
  } catch (error) {
    console.error("Event Error:", error);
  }
}

testEvents();
