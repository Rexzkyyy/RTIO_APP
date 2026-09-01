import { test, expect, Page } from '@playwright/test';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function loginAsAdmin(page: Page) {
  await page.context().addCookies([
    { name: 'dev-admin-bypass', value: 'true', domain: 'localhost', path: '/' }
  ]);
}

async function loginAsValidator(page: Page) {
  await page.context().addCookies([
    { name: 'dev-admin-bypass', value: 'VALIDATOR', domain: 'localhost', path: '/' }
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Scanner Tiket — Navigasi & UI', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('halaman scanner bisa diakses dari sidebar', async ({ page }) => {
    await page.goto('/admin');
    const scannerLink = page.locator('a[href="/admin/scanner"]').first();
    await expect(scannerLink).toBeVisible();
    await scannerLink.click();
    await page.waitForURL('**/admin/scanner');
    await expect(page.locator('text=Scanner Tiket').first()).toBeVisible();
  });

  test('elemen utama UI scanner tampil dengan benar', async ({ page }) => {
    await page.goto('/admin/scanner');
    // Header
    await expect(page.locator('text=Scanner Tiket').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Kembali')).toBeVisible();
    // FPS badge
    await expect(page.locator('text=fps').first()).toBeVisible();
    // Tombol kamera
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible();
    // Manual input toggle link
    await expect(page.locator('button:has-text("Input kode tiket manual")')).toBeVisible();
  });

  test('tombol Kembali mengarah ke /admin', async ({ page }) => {
    await page.goto('/admin/scanner');
    await expect(page.locator('text=Kembali')).toBeVisible({ timeout: 10000 });
    await page.click('text=Kembali');
    await page.waitForURL('**/admin');
    await expect(page.locator('h1:has-text("Dashboard Overview")')).toBeVisible();
  });

  test('menu Scanner Tiket aktif di sidebar saat di halaman scanner', async ({ page }) => {
    await page.goto('/admin/scanner');
    await expect(page.locator('text=Scanner Tiket').first()).toBeVisible({ timeout: 10000 });
    const activeLink = page.locator('a[href="/admin/scanner"]').first();
    await expect(activeLink).toBeVisible();
    const className = await activeLink.getAttribute('class');
    expect(className).toContain('emerald');
  });

  test('sidebar menampilkan menu Scanner Tiket untuk Super Admin', async ({ page }) => {
    await page.goto('/admin');
    const scannerLinks = page.locator('a[href="/admin/scanner"]');
    const count = await scannerLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('mobile bottom nav menampilkan ikon Scanner', async ({ page }) => {
    // Set mobile viewport sebelum goto
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/scanner');
    // Cek URL (bukan text yang mungkin hidden di balik top bar mobile)
    expect(page.url()).toContain('/admin/scanner');
    // Tombol kamera harus visible
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible({ timeout: 10000 });
    // Link scanner di bottom nav atau sidebar harus ada di DOM
    const scannerLinks = page.locator('a[href="/admin/scanner"]');
    await expect(scannerLinks.first()).toBeAttached();
  });

});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Scanner Tiket — Mode Input Manual', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/scanner');
    // Tunggu hingga halaman benar-benar load
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible({ timeout: 10000 });
  });

  test('toggle manual input muncul dan sembunyi', async ({ page }) => {
    // Input tersembunyi by default
    await expect(page.locator('input[placeholder*="kode QR"]')).not.toBeVisible();

    // Klik toggle — harus pakai button selector karena itu <button>
    await page.click('button:has-text("Input kode tiket manual")');
    await expect(page.locator('input[placeholder*="kode QR"]')).toBeVisible();
    await expect(page.locator('button:has-text("Cek")')).toBeVisible();

    // Klik lagi untuk sembunyikan
    await page.click('button:has-text("Sembunyikan input manual")');
    await expect(page.locator('input[placeholder*="kode QR"]')).not.toBeVisible();
  });

  test('tombol Cek disabled saat input kosong', async ({ page }) => {
    await page.click('button:has-text("Input kode tiket manual")');
    const cekBtn = page.locator('button:has-text("Cek")');
    await expect(cekBtn).toBeDisabled();

    await page.fill('input[placeholder*="kode QR"]', 'TEST123');
    await expect(cekBtn).toBeEnabled();
  });

  test('submit kode tidak valid menampilkan error card TIDAK VALID', async ({ page }) => {
    await page.click('button:has-text("Input kode tiket manual")');
    await page.fill('input[placeholder*="kode QR"]', 'BARCODE-INVALID-XYZ-9999');
    await page.click('button:has-text("Cek")');

    // Loading dulu lalu result
    await expect(
      page.getByText('TIDAK VALID ✗', { exact: true })
    ).toBeVisible({ timeout: 10000 });
  });

  test('result card auto-reset setelah beberapa detik', async ({ page }) => {
    await page.click('button:has-text("Input kode tiket manual")');
    await page.fill('input[placeholder*="kode QR"]', 'AUTO-RESET-TEST-XYZ');
    await page.click('button:has-text("Cek")');

    await expect(page.getByText('TIDAK VALID ✗', { exact: true })).toBeVisible({ timeout: 10000 });

    // Auto-reset terjadi setelah 3 detik
    await expect(page.getByText('TIDAK VALID ✗', { exact: true })).not.toBeVisible({ timeout: 6000 });
  });

  test('submit dengan Enter juga berfungsi', async ({ page }) => {
    await page.click('button:has-text("Input kode tiket manual")');
    await page.fill('input[placeholder*="kode QR"]', 'ENTER-KEY-TEST-XYZ');
    await page.press('input[placeholder*="kode QR"]', 'Enter');

    await expect(
      page.locator('text=MEMVERIFIKASI').or(page.locator('text=TIDAK VALID')).first()
    ).toBeVisible({ timeout: 10000 });
  });

});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Scanner Tiket — API /api/scanner', () => {

  test('API menolak request tanpa autentikasi', async ({ request }) => {
    // Pakai `request` fixture tanpa cookies → harus 401
    const res = await request.post('/api/scanner', {
      data: { barcodeString: 'TEST-NO-AUTH' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('Unauthorized');
  });

  test('API mengembalikan 400 jika barcodeString kosong', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/scanner');
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible({ timeout: 10000 });

    const res = await page.request.post('/api/scanner', {
      data: { barcodeString: '' },
    });
    const body = await res.json();
    expect(res.status()).toBe(400);
    expect(body.success).toBe(false);
  });

  test('API mengembalikan NOT_FOUND untuk barcode yang tidak ada di DB', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/scanner');
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible({ timeout: 10000 });

    const res = await page.request.post('/api/scanner', {
      data: { barcodeString: 'BARCODE-PASTI-TIDAK-ADA-DI-DB-99999' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.status).toBe('NOT_FOUND');
    expect(typeof body.message).toBe('string');
  });

  test('API response selalu punya field success, status, message', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/scanner');
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible({ timeout: 10000 });

    const res = await page.request.post('/api/scanner', {
      data: { barcodeString: 'STRUCTURE-CHECK-XYZ' },
    });
    const body = await res.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('message');
    expect(typeof body.success).toBe('boolean');
    expect(typeof body.message).toBe('string');
  });

});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Scanner Tiket — Akses Role', () => {

  test('Validator bisa mengakses halaman scanner (tidak di-redirect)', async ({ page }) => {
    await loginAsValidator(page);
    await page.goto('/admin/scanner');

    // Pastikan tidak redirect ke /admin/transactions atau login
    await expect(page.locator('text=Scanner Tiket').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible();
    expect(page.url()).toContain('/admin/scanner');
  });

  test('Validator melihat menu Scanner di sidebar/nav', async ({ page }) => {
    await loginAsValidator(page);
    await page.goto('/admin/scanner');
    await expect(page.locator('text=Scanner Tiket').first()).toBeVisible({ timeout: 10000 });

    const scannerLink = page.locator('a[href="/admin/scanner"]');
    await expect(scannerLink.first()).toBeVisible();
  });

  test('Validator tidak bisa lihat menu Event dan Kelola User', async ({ page }) => {
    await loginAsValidator(page);
    await page.goto('/admin/scanner');
    await expect(page.locator('text=Scanner Tiket').first()).toBeVisible({ timeout: 10000 });

    await expect(page.locator('a:has-text("Event")')).not.toBeVisible();
    await expect(page.locator('a:has-text("Kelola User")')).not.toBeVisible();
    await expect(page.locator('a:has-text("Analisis Penjualan")')).not.toBeVisible();
  });

  test('Validator melihat menu Scanner di mobile bottom nav', async ({ page }) => {
    await loginAsValidator(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/scanner');
    // Cek URL dan tombol
    expect(page.url()).toContain('/admin/scanner');
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible({ timeout: 10000 });
    // Link scanner ada di DOM
    const mobileLink = page.locator('a[href="/admin/scanner"]');
    await expect(mobileLink.first()).toBeAttached();
  });

  test('Super Admin bisa mengakses halaman scanner', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/scanner');
    await expect(page.locator('text=Scanner Tiket').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Scanner Tiket — Riwayat Scan', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/scanner');
    await expect(page.locator('button:has-text("Aktifkan Kamera")')).toBeVisible({ timeout: 10000 });
  });

  test('riwayat scan muncul setelah submit manual', async ({ page }) => {
    // Submit satu kode invalid
    await page.click('button:has-text("Input kode tiket manual")');
    await page.fill('input[placeholder*="kode QR"]', 'HISTORY-TEST-XYZ-001');
    await page.click('button:has-text("Cek")');

    // Tunggu result
    await expect(page.getByText('TIDAK VALID ✗', { exact: true })).toBeVisible({ timeout: 10000 });

    // Tunggu auto-reset
    await expect(page.getByText('TIDAK VALID ✗', { exact: true })).not.toBeVisible({ timeout: 6000 });

    // History counter harus muncul (badge angka pada tombol history)
    // Tombol history muncul dengan angka 1
    await expect(page.locator('button').filter({ hasText: '1' })).toBeVisible({ timeout: 3000 });
  });

  test('modal riwayat bisa dibuka dan ditutup', async ({ page }) => {
    // Buat riwayat dulu
    await page.click('button:has-text("Input kode tiket manual")');
    await page.fill('input[placeholder*="kode QR"]', 'HISTORY-MODAL-TEST-XYZ');
    await page.click('button:has-text("Cek")');
    await expect(page.getByText('TIDAK VALID ✗', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('TIDAK VALID ✗', { exact: true })).not.toBeVisible({ timeout: 6000 });

    // Klik tombol history (badge angka)
    const historyBtn = page.locator('button').filter({ hasText: '1' });
    await expect(historyBtn).toBeVisible({ timeout: 3000 });
    await historyBtn.click();

    // Modal terbuka
    await expect(page.locator('text=Riwayat Scan')).toBeVisible({ timeout: 3000 });

    // Klik backdrop (di luar modal) untuk tutup
    await page.mouse.click(100, 400);
    await expect(page.locator('text=Riwayat Scan')).not.toBeVisible({ timeout: 3000 });
  });

});
