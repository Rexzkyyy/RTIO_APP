import { test, expect } from '@playwright/test';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const PROD_URL = 'https://rtio-tix.vercel.app';
const TEST_BUYER = {
  name: 'Playwright Tester E2E',
  email: 'playwright-e2e-test@test.com',
  phone: '08199999991',
  address: 'Jl. Testing Otomatis No. 1',
  age: '22',
};

const timings: { label: string; ms: number }[] = [];

function mark(label: string, ms: number) {
  const slow = ms > 5000;
  console.log(`⏱️  [${slow ? 'SLOW' : 'OK  '}] ${label}: ${ms}ms`);
  timings.push({ label, ms });
}

test.afterAll(async () => {
  console.log('\n🧹 Membersihkan data test dari database...');
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();
  try {
    const txResult = await client.query(
      `SELECT id FROM "Transaction" WHERE "buyerEmail" = $1 OR "buyerName" = $2`,
      [TEST_BUYER.email, TEST_BUYER.name]
    );
    for (const tx of txResult.rows) {
      const tickets = await client.query(`SELECT id, "ticketCategoryId" FROM "Ticket" WHERE "transactionId" = $1`, [tx.id]);
      const catGroups: Record<string, number> = {};
      for (const t of tickets.rows) catGroups[t.ticketCategoryId] = (catGroups[t.ticketCategoryId] || 0) + 1;
      for (const ticket of tickets.rows) await client.query(`DELETE FROM "TicketAnswer" WHERE "ticketId" = $1`, [ticket.id]);
      await client.query(`DELETE FROM "Ticket" WHERE "transactionId" = $1`, [tx.id]);
      for (const [catId, count] of Object.entries(catGroups)) {
        await client.query(`UPDATE "TicketCategory" SET quota = quota + $1 WHERE id = $2`, [count, catId]);
      }
      await client.query(`DELETE FROM "Transaction" WHERE id = $1`, [tx.id]);
      console.log(`   ✅ Transaksi ${tx.id.slice(0, 8)}... dihapus`);
    }
    if (txResult.rows.length === 0) console.log('   ℹ️  Tidak ada transaksi test yang perlu dihapus.');
  } finally {
    client.release();
    await pool.end();
  }

  // Print summary
  console.log('\n--- RINGKASAN PERFORMA ---\n');
  for (const t of timings) {
    console.log(`  ${t.ms > 5000 ? '⚠️ ' : '✅'} ${t.label}: ${t.ms}ms`);
  }

  // Write report
  const fs = await import('fs');
  const rows = timings.map(t => `| ${t.label} | ${t.ms}ms | ${t.ms > 5000 ? '⚠️ Lambat' : '✅ OK'} |`).join('\n');
  const issues = timings.filter(t => t.ms > 5000).map(t => `- ⚠️ PERFORMA LAMBAT: "${t.label}" membutuhkan ${t.ms}ms`).join('\n');
  const report = `# Production Testing Report\n\nURL: ${PROD_URL}\nTanggal: ${new Date().toISOString()}\n\n---\n\n## Hasil Performa\n\n| Langkah | Waktu | Status |\n|---|---|---|\n${rows}\n\n---\n\n## Isu & Temuan\n${issues || '- ✅ Tidak ada isu performa yang terdeteksi!'}\n\n---\n\n## Alur yang Diuji\n1. Buka halaman katalog produksi (${PROD_URL})\n2. Klik event yang tersedia\n3. Menekan tombol "Dapatkan Tiket"\n4. Melewati modal login ("Nanti Saja 😅") → langsung ke halaman register\n5. Mengisi form Step 1: Pilih tiket & kuantitas\n6. Mengisi form Step 2: Data pembeli (nama, email, HP, gender, umur)\n7. Submit → Verifikasi redirect ke halaman pembayaran\n8. Verifikasi tampilan detail pesanan & nomor rekening\n9. Cleanup: Hapus data transaksi test dari database\n`;
  fs.writeFileSync('production_testing_report.md', report);
  console.log('\n📄 Laporan disimpan ke: production_testing_report.md');
});

test('Full User Flow — Katalog → Registrasi → Menunggu Pembayaran', async ({ page }) => {
  page.setDefaultTimeout(30000);

  // 1. Buka katalog
  let t = Date.now();
  await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[href*="/event/"]', { timeout: 20000 });
  mark('1. Buka Halaman Katalog', Date.now() - t);

  const eventLinks = await page.locator('[href*="/event/"]').all();
  console.log(`\n📋 Jumlah event ditemukan di katalog: ${eventLinks.length}`);
  expect(eventLinks.length).toBeGreaterThan(0);

  const firstHref = await eventLinks[0].getAttribute('href');
  const slug = firstHref?.split('/event/')[1]?.split('/')[0];
  console.log(`\n🎫 Event ditemukan: slug = "${slug}"`);

  // 2. Buka detail event
  t = Date.now();
  await page.goto(`${PROD_URL}/event/${slug}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('h1, h2', { timeout: 10000 });
  mark('2. Buka Halaman Detail Event', Date.now() - t);

  // 3. Klik tombol Dapatkan Tiket (trigger modal)
  t = Date.now();
  const buyBtn = page.locator('button:has-text("Dapatkan Tiket"), button:has-text("Beli Tiket"), button:has-text("Daftar")').first();
  await buyBtn.waitFor({ state: 'visible', timeout: 10000 });
  await buyBtn.click();
  mark('3. Klik Beli Tiket → Halaman Register', Date.now() - t);

  // 4. Klik "Nanti Saja" di modal login (adalah <a> tag bukan button)
  t = Date.now();
  await page.waitForTimeout(800);
  const nantiLink = page.getByText('Nanti Saja');
  if (await nantiLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('\n🔐 Modal login muncul, klik "Nanti Saja"...');
    await nantiLink.click();
    await page.waitForURL(`**/${slug}/register**`, { timeout: 15000 });
    mark('4. Tutup Modal → Halaman Register', Date.now() - t);
  } else {
    // Mungkin langsung navigasi ke register
    console.log('\n🔐 Modal tidak muncul, navigasi langsung ke register...');
    await page.goto(`${PROD_URL}/event/${slug}/register`, { waitUntil: 'domcontentloaded' });
    mark('4. Navigasi ke Halaman Register', Date.now() - t);
  }

  const regUrl = page.url();
  console.log(`\n📍 URL register: ${regUrl}`);
  expect(regUrl).toContain('/register');

  // Helper functions untuk isi field
  const fillIfVisible = async (selector: string, value: string) => {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) await el.fill(value);
  };
  const selectIfVisible = async (selector: string) => {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) await el.selectOption({ index: 1 });
  };
  const clickNextBtn = async () => {
    const btn = page.locator('button:has-text("Selanjutnya"), button:has-text("Lanjut"), button:has-text("Next")').first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(600);
      return true;
    }
    return false;
  };

  // 5. Step 1 — Pilih Tiket
  t = Date.now();
  await page.waitForTimeout(500);
  // Quantity sudah default 1, pastikan saja
  const qtyInput = page.locator('input[name="ticketQuantity"]').first();
  if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await qtyInput.fill('1');
  }
  await clickNextBtn();
  mark('5. Isi Form Step 1 (Pilih Tiket)', Date.now() - t);

  // 6. Step 2 — Data Diri
  t = Date.now();
  await page.waitForTimeout(400);
  await fillIfVisible('input[name="buyerName"]', TEST_BUYER.name);
  await fillIfVisible('textarea[name="buyerAddress"]', TEST_BUYER.address);
  await fillIfVisible('input[name="buyerEmail"], input[type="email"]', TEST_BUYER.email);
  await fillIfVisible('input[name="buyerPhone"]', TEST_BUYER.phone);
  await fillIfVisible('input[name="holderAge_0"], input[name*="Age"], input[name*="age"]', TEST_BUYER.age);
  await selectIfVisible('select[name="buyerGender"], select[name*="gender"]');
  mark('6. Isi Form Step 2 (Data Pembeli)', Date.now() - t);

  // Cek apakah ada step 3 (klik Next lagi), atau langsung submit
  const hasStep3 = await clickNextBtn();
  if (hasStep3) {
    console.log('\n📋 Step 3 (custom fields) ditemukan, melewati...');
    await page.waitForTimeout(300);
    // Isi custom fields text jika ada (skip file uploads)
    const textInputs = page.locator('#step-3 input[type="text"], #step-3 input[type="number"], #step-3 textarea').all();
    for (const inp of await textInputs) {
      if (await inp.isVisible({ timeout: 500 }).catch(() => false)) {
        await inp.fill('Test Data E2E');
      }
    }
  }

  // 7. Submit (tombol "Proses Pembayaran")
  t = Date.now();
  // Using a very broad selector that definitely matches the final submit button
  const submitBtn = page.locator('button[type="submit"]:has-text("Proses"), button[type="submit"]:has-text("Bayar"), button[type="submit"]').last();
  
  // Wait for it to be visible in the DOM
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
  
  // Extra wait to ensure the UI has finished transitioning
  await page.waitForTimeout(1000);
  
  await submitBtn.click();
  await page.waitForURL(/\/pay|\/payment|\/public/, { timeout: 30000 });
  const payUrl = page.url();
  console.log(`\n📍 URL pembayaran: ${payUrl}`);
  mark('7. Submit Form & Proses Pembayaran', Date.now() - t);

  // 8. Verifikasi halaman pembayaran
  t = Date.now();
  await expect(page.locator('body')).toContainText(/Detail Pesanan|Nomor Rekening|Transfer|Pembayaran/, { timeout: 10000 });
  console.log('✅ Detail pesanan terlihat di halaman pembayaran');
  mark('8. Verifikasi Halaman Pembayaran', Date.now() - t);

  console.log('\n\n🎉 Alur registrasi selesai!\n');
});
