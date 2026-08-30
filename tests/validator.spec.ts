import { test, expect } from '@playwright/test';

test.describe('Validator Role Tests', () => {
  const validatorEmail = 'test-validator-only@rtio.com';

  test.beforeEach(async ({ context, page }) => {
    // Inject the validator bypass cookie
    await context.addCookies([
      {
        name: 'dev-admin-bypass',
        value: 'VALIDATOR',
        domain: 'localhost',
        path: '/',
      }
    ]);
  });

  test('Validator should be redirected to transactions and have restricted access', async ({ page }) => {
    // Validators attempting to access /admin or /admin/events should be redirected to /admin/transactions
    await page.goto('/admin');
    await page.waitForURL('**/admin/transactions');
    
    // Verify we are on transactions page
    await expect(page.locator('h1:has-text("Pilih Event")').first()).toBeVisible();
    
    // Ensure that sidebar only shows authorized menus
    // Validasi Pembayaran should be visible
    await expect(page.locator('a:has-text("Validasi Pembayaran")').first()).toBeVisible();
    
    // Manajemen Event, Kelola User, Desain Tiket should NOT be visible
    await expect(page.locator('a:has-text("Manajemen Event")')).not.toBeVisible();
    await expect(page.locator('a:has-text("Kelola User")')).not.toBeVisible();
    await expect(page.locator('a:has-text("Desain Tiket")')).not.toBeVisible();

    // Verify manual navigation to restricted pages redirects or shows unauthorized
    await page.goto('/admin/users');
    await page.waitForURL('**/admin/transactions'); // middleware redirects
  });
});
