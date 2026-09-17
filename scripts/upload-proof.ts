import { put } from '@vercel/blob';
import { readFileSync } from 'fs';
import { Pool } from 'pg';
import "dotenv/config";

const IMAGE_PATH = 'C:/Users/IKHSAN/.gemini/antigravity-ide/brain/766c9b3c-b335-47bf-a02b-b175a1cac40f/.user_uploaded/media_1788749619103.png';
const BUYER_NAME = 'SUCIATI EKA CHANDRA';

async function main() {
  console.log(`Mencari transaksi atas nama: ${BUYER_NAME}...`);
  
  const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    const res = await client.query(
      `SELECT id, "buyerName", status FROM "Transaction" WHERE "buyerName" ILIKE $1 ORDER BY "createdAt" DESC LIMIT 1`,
      [`%${BUYER_NAME}%`]
    );

    if (res.rows.length === 0) {
      console.log('❌ Transaksi tidak ditemukan!');
      return;
    }

    const tx = res.rows[0];
    console.log(`✅ Transaksi ditemukan: ID ${tx.id} - Status: ${tx.status}`);

    console.log('Mengunggah gambar ke Vercel Blob...');
    const file = readFileSync(IMAGE_PATH);
    const blob = await put(`payments/${tx.id}-${Date.now()}.png`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    console.log(`✅ Berhasil diunggah! URL: ${blob.url}`);

    console.log('Mengupdate database...');
    await client.query(
      `UPDATE "Transaction" SET "paymentProof" = $1, status = 'PENDING' WHERE id = $2`,
      [blob.url, tx.id]
    );

    console.log('🎉 Selesai! Bukti bayar berhasil diupdate. Silakan cek di Admin Panel.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
