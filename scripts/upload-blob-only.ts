import { put } from '@vercel/blob';
import { readFileSync } from 'fs';
import "dotenv/config";

const IMAGE_PATH = 'C:/Users/IKHSAN/.gemini/antigravity-ide/brain/766c9b3c-b335-47bf-a02b-b175a1cac40f/.user_uploaded/media_1788749619103.png';

async function main() {
  console.log('Mengunggah gambar ke Vercel Blob...');
  const file = readFileSync(IMAGE_PATH);
  const blob = await put(`payments/suciati-${Date.now()}.png`, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
  console.log(`✅ Berhasil diunggah! URL: ${blob.url}`);
}

main();
