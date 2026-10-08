import sharp from 'sharp';
import path from 'path';

async function main() {
  const inputPath = 'C:\\Users\\IKHSAN\\Downloads\\WhatsApp Image 2026-10-07 at 20.43.38.jpeg';
  const outputPath = 'C:\\Users\\IKHSAN\\Downloads\\Poster_Mamah_Dedeh_Siap_Upload.jpg';

  console.log('Membaca gambar asli...');
  const metadata = await sharp(inputPath).metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Gagal membaca metadata gambar.');
  }

  // Buat ukuran canvas yang lebih besar (kotak 1:1) dengan patokan ukuran terbesar
  const size = Math.max(metadata.width, metadata.height);

  console.log(`Mengubah ukuran menjadi persegi (${size}x${size}) dengan ruang aman...`);

  await sharp(inputPath)
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      // Warna background biru gelap senada dengan tema tiket
      background: { r: 30, g: 58, b: 138, alpha: 1 } // #1e3a8a
    })
    .toFile(outputPath);

  console.log('✅ Selesai! Gambar berhasil disimpan di:', outputPath);
}

main().catch(err => {
  console.error('Terjadi kesalahan:', err);
});
