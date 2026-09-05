import { test, expect } from '@playwright/test';
import prisma from '../src/lib/prisma';

test.use({ baseURL: 'http://localhost:3000' });
const EVENT_SLUG = 'e2e-checkout-test-event';

test.beforeAll(async () => {
  // Ensure cleanup first just in case
  const event = await prisma.event.findUnique({ where: { slug: EVENT_SLUG } });
  if (event) {
    await prisma.transaction.deleteMany({ where: { eventId: event.id } });
    await prisma.event.deleteMany({ where: { slug: EVENT_SLUG } });
  }

  // Seed a test event
  await prisma.event.create({
    data: {
      title: 'E2E Checkout Test Event',
      slug: EVENT_SLUG,
      description: 'Event for testing checkout flow automatically',
      eventDate: new Date(Date.now() + 86400000), // Tomorrow
      location: 'Jakarta',
      isActive: true,
      artists: ['Test Artist'],
      sponsors: ['Test Sponsor'],
      ticketCategories: {
        create: [
          {
            name: 'Regular',
            price: 100000,
            quota: 100,
            initialQuota: 100,
          }
        ]
      }
    }
  });
});

test.afterAll(async () => {
  // Clean up transactions first to satisfy foreign key constraint
  const event = await prisma.event.findUnique({ where: { slug: EVENT_SLUG } });
  if (event) {
    await prisma.transaction.deleteMany({
      where: { eventId: event.id }
    });
  }
  
  // Then clean up event
  await prisma.event.deleteMany({
    where: { slug: EVENT_SLUG }
  });
  await prisma.$disconnect();
});

test('User can complete a ticket registration flow', async ({ page }) => {
  // 1. Go to homepage
  await page.goto('/');

  // 2. Click the specifically created E2E event
  const testEvent = page.locator(`a[href^="/event/${EVENT_SLUG}"]`).first();
  await expect(testEvent).toBeVisible();
  await testEvent.click();

  // 3. Select the first available ticket in the event detail page
  const buyTicketBtn = page.locator('a[href*="/register?ticketId="]').first();
  await expect(buyTicketBtn).toBeVisible();
  
  // Navigate to registration
  await buyTicketBtn.click();

  // Handle Login Modal by clicking "Nanti Saja 😅"
  const nantiSajaBtn = page.getByRole('link', { name: 'Nanti Saja 😅' });
  await expect(nantiSajaBtn).toBeVisible({ timeout: 5000 });
  await nantiSajaBtn.click();

  // Wait for navigation to complete
  await page.waitForURL(/\/register/);

  // 4. STEP 1: Registration Form - Select Ticket (already selected by default)
  // Fill quantity
  const quantityInput = page.locator('input[name="ticketQuantity"]');
  await quantityInput.fill('1');
  
  // Click Next
  await page.getByRole('button', { name: 'Selanjutnya' }).click();

  // 5. STEP 2: Registration Form - Fill Buyer Data
  await page.locator('input[name="buyerName"]').fill('Tester Otomatis');
  await page.locator('textarea[name="buyerAddress"]').fill('Jl. Sudirman No 1');
  await page.locator('input[name="buyerEmail"]').fill('tester@otomatis.com');
  await page.locator('input[name="buyerPhone"]').fill('081234567890');
  await page.locator('select[name="buyerGender"]').selectOption('Laki-laki');
  await page.locator('input[name="holderAge_0"]').fill('25');
  // Fill Holder Data is skipped because quantity is 1 and it's only shown for quantity > 1

  // Click Next or Submit depending on event fields
  const submitBtn = page.getByRole('button', { name: 'Proses Pembayaran' });
  const nextBtn = page.getByRole('button', { name: 'Selanjutnya' });

  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    // Step 3: Custom Fields (if any)
    await submitBtn.click();
  } else {
    await submitBtn.click();
  }

  // 6. Verify we are redirected to the Payment page
  await expect(page).toHaveURL(/\/public\/.*\/pay/);
  await expect(page.getByText('Detail Pesanan')).toBeVisible();
  
  // Verify that copy account button is available
  await expect(page.locator('button[title="Salin Rekening"]').first()).toBeVisible();
});
