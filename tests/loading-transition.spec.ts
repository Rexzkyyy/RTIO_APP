import { test, expect } from '@playwright/test';

test('verify loading transition from register to pay', async ({ page }) => {
  // Go to homepage
  await page.goto('http://localhost:3000');
  
  // Wait for events to load and click the first event
  await page.waitForSelector('a[href^="/event/"]');
  await page.click('a[href^="/event/"]');
  // Wait for the event detail page to load by waiting for its title or button
  await page.waitForSelector('h1');
  await page.click('a:has-text("Amankan Kursi Sekarang"), a:has-text("Pilih Tiket")');
  
  // Choose Gold ticket if present
  try {
    await page.click('button:has-text("Gold")', { timeout: 2000 });
  } catch(e) {}
  
  // Click Nanti Saja if login modal appears
  try {
    await page.click('a:has-text("Nanti Saja")', { timeout: 2000 });
  } catch(e) {}
  
  // Click Selanjutnya to go from Step 1 (Pilih Tiket) to Step 2 (Data Diri)
  await page.click('button:has-text("Selanjutnya")');
  
  // Now we are on step 2. Fill form.
  await page.waitForSelector('input[name="buyerName"]');
  await page.fill('input[name="buyerName"]', 'Playwright Tester');
  await page.fill('input[name="buyerEmail"]', 'test@playwright.com');
  await page.fill('input[name="buyerPhone"]', '81234567890');
  
  // Click Selanjutnya again if there's a step 3, otherwise click Proses Pembayaran
  try {
    const isStep3 = await page.isVisible('text="Selanjutnya"', { timeout: 500 });
    if (isStep3) await page.click('button:has-text("Selanjutnya")');
  } catch(e) {}
  
  // Submit the form
  await page.click('button:has-text("Proses Pembayaran"), button[type="submit"]');
  
  // Take screenshots rapidly during transition
  for (let i = 0; i < 20; i++) {
    await page.screenshot({ path: `screenshots/transition-${i}.png` });
    await page.waitForTimeout(100);
  }
  
  // Check if we reached the pay page
  await expect(page.locator('text="Selesaikan Pembayaran"')).toBeVisible({ timeout: 10000 });
});
