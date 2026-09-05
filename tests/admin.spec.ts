import { test, expect } from '@playwright/test';
import prisma from '../src/lib/prisma';

test.describe('Admin Panel Tests', () => {
  test.beforeAll(async () => {
    // Clean up any test users that might have been left over from previous failed runs
    try {
      await prisma.adminEventAccess.deleteMany({
        where: {
          admin: {
            email: {
              in: ['e2e-validator@rtio.com', 'e2e-superadmin@rtio.com']
            }
          }
        }
      });
      await prisma.admin.deleteMany({
        where: {
          email: {
            in: ['e2e-validator@rtio.com', 'e2e-superadmin@rtio.com']
          }
        }
      });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([
      {
        name: 'dev-admin-bypass',
        value: 'true',
        domain: 'localhost',
        path: '/',
      }
    ]);
    await page.goto('/admin');
  });

  test('should load and interact with Dashboard properly', async ({ page }) => {
    // Navigate to Dashboard
    await page.click('text=Dashboard');
    await page.waitForURL('**/admin');
    
    // Verify Dashboard loads
    await expect(page.locator('h1:has-text("Dashboard Overview")')).toBeVisible();
    
    // Check if stat cards are visible
    await expect(page.locator('text=Total Event')).toBeVisible();
    await expect(page.locator('text=Total Peserta')).toBeVisible();
    await expect(page.locator('text=Tiket Terjual')).toBeVisible();
    await expect(page.locator('text=Pendapatan')).toBeVisible();
  });

  test('should load and interact with Manajemen Event properly', async ({ page }) => {
    await page.goto('/admin/events');
    
    // Verify Events list loads
    await expect(page.locator('h1:has-text("Manajemen Event")')).toBeVisible();
    
    // Create new event
    await page.click('text=Buat Event Baru');
    await page.waitForURL('**/admin/events/create');
    
    const testEventName = 'E2E Test Event ' + Date.now();
    await page.fill('input[name="title"]', testEventName);
    await page.fill('textarea[name="description"]', 'E2E Testing Description');
    await page.fill('input[name="eventDate"]', '2026-10-10T10:00');
    await page.fill('input[name="location"]', 'E2E Stadium');
    await page.fill('input[name="ticketName[]"]', 'VIP');
    await page.fill('input[name="ticketPrice[]"]', '150000');
    await page.fill('input[name="ticketQuota[]"]', '100');
    
    // Bank account fields (required)
    await page.fill('input[name="bankName[]"]', 'BCA');
    await page.fill('input[name="bankNumber[]"]', '1234567890');
    await page.fill('input[name="bankAccountName[]"]', 'PT E2E Testing');
    
    // Social Media fields (required default row)
    await page.fill('input[name="socialLink[]"]', 'https://instagram.com/e2e');
    
    // Submit
    await page.click('button[type="submit"]:has-text("Simpan & Buka Pendaftaran")');
    await page.waitForURL('**/admin/events');
    
    // Verify event is in the list
    await expect(page.locator(`text=${testEventName}`).first()).toBeVisible();
    
    // Setup dialog handler to auto-accept delete confirmation
    page.on('dialog', dialog => dialog.accept());
    
    // Delete the event
    const eventRow = page.locator(`tr:has-text("${testEventName}")`).first();
    await eventRow.locator('text=Hapus').click();
    
    // Verify event is deleted
    await expect(page.locator(`text=${testEventName}`).first()).not.toBeVisible();
  });

  test('should load and interact with Desain Tiket properly', async ({ page }) => {
    await page.goto('/admin/tickets');
    
    // Verify Ticket Design page loads
    await expect(page.locator('h1:has-text("Desain Tiket")')).toBeVisible();
    
    // Check if the search input is visible and interact with it
    const searchInput = page.locator('input[name="q"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Konser E2E');
    await searchInput.press('Enter');
    
    // Wait for either results or empty state to appear
    await expect(async () => {
      const resultsCount = await page.locator('.grid > div').count();
      const emptyVisible = await page.locator('text=Belum ada event').isVisible();
      expect(resultsCount > 0 || emptyVisible).toBeTruthy();
    }).toPass({ timeout: 10000 });
  });

  test('should load and interact with Validasi Pembayaran properly', async ({ page }) => {
    await page.goto('/admin/transactions');
    
    // Verify Transactions page loads
    await expect(page.locator('h1:has-text("Pilih Event")').first()).toBeVisible();
    
    // Check if there are events to select or empty state
    const hasEvents = await page.locator('.grid > a').count() > 0;
    const hasEmptyState = await page.locator('text=Tidak ada event yang dapat diakses.').isVisible();
    expect(hasEvents || hasEmptyState).toBeTruthy();
    
    if (hasEvents) {
       await page.locator('.grid > a').first().click();
       await page.waitForURL('**/admin/transactions?eventId=**');
       await expect(page.locator('h1:has-text("Validasi Pembayaran")').first()).toBeVisible();
    }
  });

  test('should load and interact with Kelola User properly', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Verify Users page loads
    await expect(page.locator('h1:has-text("Kelola Akses Admin")')).toBeVisible();
    
    // Add a new test admin (VALIDATOR)
    const testValidatorEmail = 'e2e-validator@rtio.com';
    await page.fill('input[name="email"]', testValidatorEmail);
    await page.selectOption('select[name="role"]', 'VALIDATOR');
    await page.click('text=Simpan Akses');
    
    // Verify it was added to the list
    await expect(page.locator(`text=${testValidatorEmail}`)).toBeVisible();
    
    // Add a new test admin (SUPER_ADMIN)
    const testSuperAdminEmail = 'e2e-superadmin@rtio.com';
    await page.fill('input[name="email"]', testSuperAdminEmail);
    await page.selectOption('select[name="role"]', 'SUPER_ADMIN');
    await page.click('text=Simpan Akses');
    
    // Verify it was added to the list
    await expect(page.locator(`text=${testSuperAdminEmail}`)).toBeVisible();
    
    // Delete the test Validator
    const validatorRow = page.locator('.divide-y > div').filter({ hasText: testValidatorEmail }).first();
    await validatorRow.locator('button[title="Cabut Akses"]').click();
    await expect(page.locator(`text=${testValidatorEmail}`)).not.toBeVisible();
    
    // Delete the test Super Admin
    const superAdminRow = page.locator('.divide-y > div').filter({ hasText: testSuperAdminEmail }).first();
    await superAdminRow.locator('button[title="Cabut Akses"]').click();
    await expect(page.locator(`text=${testSuperAdminEmail}`)).not.toBeVisible();
  });
});
