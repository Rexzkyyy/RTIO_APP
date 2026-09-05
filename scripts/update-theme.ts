import prisma from '../src/lib/prisma';

async function main() {
  const event = await prisma.event.findUnique({
    where: { slug: 'seni-memahami-cinta-2026' }
  });

  if (!event) {
    console.log('Event not found!');
    return;
  }

  const currentConfig = (event.ticketConfig as any) || {};

  await prisma.event.update({
    where: { slug: 'seni-memahami-cinta-2026' },
    data: {
      ticketConfig: {
        ...currentConfig,
        primaryColor: '#ec4899', // pink-500
        accentColor: '#f472b6', // pink-400
        pageBgColor: '#fdf2f8', // pink-50
        textColor: '#831843', // pink-900
        themeName: 'pink'
      }
    }
  });

  console.log('Successfully updated ticketConfig for seni-memahami-cinta-2026');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
