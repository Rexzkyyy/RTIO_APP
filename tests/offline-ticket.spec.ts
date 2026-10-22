import { test, expect } from '@playwright/test';

test.describe('Offline Ticket Feature Tests', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'dev-admin-bypass',
        value: 'true',
        domain: 'localhost',
        path: '/',
      }
    ]);
  });

  test('should display Tiket Offline link in Admin Sidebar', async ({ page }) => {
    await page.goto('/admin');
    const offlineLink = page.locator('a[href="/admin/offline-tickets"]');
    await expect(offlineLink.first()).toBeVisible();
    await expect(offlineLink.first()).toContainText('Tiket Offline');
  });

  test('should load /admin/offline-tickets page and render form controls', async ({ page }) => {
    await page.goto('/admin/offline-tickets');
    await expect(page.locator('h1')).toContainText('Input Tiket Offline');
    
    // Check key form elements
    await expect(page.locator('input[name="ticketNumber"]')).toBeVisible();
    await expect(page.locator('input[name="date"]')).toBeVisible();
    await expect(page.locator('input[name="pjName"]')).toBeVisible();
    await expect(page.locator('input[name="buyerName"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
