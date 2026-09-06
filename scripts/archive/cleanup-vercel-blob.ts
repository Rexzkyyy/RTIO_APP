import { PrismaClient } from "@prisma/client";
import { list, del } from "@vercel/blob";
import * as dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("========================================");
  console.log("  Vercel Blob Storage Cleanup Utility");
  console.log("========================================\n");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ ERROR: BLOB_READ_WRITE_TOKEN tidak ditemukan di file .env");
    process.exit(1);
  }

  try {
    console.log("⏳ 1. Mengambil semua URL gambar yang aktif di Database...");
    
    // Ambil dari Event
    const events = await prisma.event.findMany({
      select: { bannerUrl: true, ticketDesignUrl: true }
    });
    const eventUrls = events.flatMap(e => [e.bannerUrl, e.ticketDesignUrl]).filter(Boolean) as string[];

    // Ambil dari Transaction
    const transactions = await prisma.transaction.findMany({
      select: { paymentProofUrl: true }
    });
    const transactionUrls = transactions.map(t => t.paymentProofUrl).filter(Boolean) as string[];

    // Ambil dari TicketAnswer (khusus yang tipenya FILE)
    const answers = await prisma.ticketAnswer.findMany({
      where: {
        field: { type: "FILE" }
      },
      select: { value: true }
    });
    // Kadang ada answer yang isinya bukan URL valid jika error, jadi kita filter yang format URL vercel saja
    const answerUrls = answers.map(a => a.value).filter(val => val.includes("vercel-storage.com"));

    // Gabungkan semua URL valid yang ada di DB
    const allDbUrls = new Set([...eventUrls, ...transactionUrls, ...answerUrls]);
    console.log(`✅ Ditemukan ${allDbUrls.size} file yang sedang dipakai di Database.\n`);

    console.log("⏳ 2. Mengambil semua file yang ada di Vercel Blob...");
    let allBlobs: any[] = [];
    let cursor;
    
    // Vercel blob list melakukan paginasi, jadi pakai loop
    do {
      const listResult = await list({
        cursor,
        limit: 1000,
      });
      allBlobs = allBlobs.concat(listResult.blobs);
      cursor = listResult.cursor;
    } while (cursor);

    console.log(`✅ Ditemukan ${allBlobs.length} file di Vercel Blob (Cloud).\n`);

    console.log("⏳ 3. Mencocokkan file...");
    const orphanedBlobs = allBlobs.filter(blob => !allDbUrls.has(blob.url));

    if (orphanedBlobs.length === 0) {
      console.log("🎉 Keren! Tidak ada file sampah. Semua file di Vercel Blob masih dipakai di Database.");
      return;
    }

    console.log(`⚠️ Ditemukan ${orphanedBlobs.length} file sampah (tidak ada di DB):`);
    orphanedBlobs.forEach((blob, idx) => {
      console.log(`   ${idx + 1}. ${blob.pathname} (${(blob.size / 1024).toFixed(2)} KB)`);
    });

    // PENTING: Untuk keamanan, kita beri opsi eksekusi.
    // Jika script dijalankan dengan argumen --delete, barulah file dihapus.
    const isDeleteMode = process.argv.includes("--delete");

    if (!isDeleteMode) {
      console.log("\n💡 INI HANYA SIMULASI (DRY-RUN). File Anda BELUM dihapus.");
      console.log("👉 Untuk benar-benar menghapus file di atas, jalankan perintah ini:");
      console.log("   npx tsx scripts/cleanup-vercel-blob.ts --delete\n");
    } else {
      console.log("\n🗑️ MENGHAPUS FILE...");
      let deletedCount = 0;
      for (const blob of orphanedBlobs) {
        try {
          await del(blob.url);
          console.log(`   ✅ Dihapus: ${blob.pathname}`);
          deletedCount++;
        } catch (err: any) {
          console.log(`   ❌ Gagal menghapus: ${blob.pathname} - ${err.message}`);
        }
      }
      console.log(`\n🎉 Selesai! Berhasil menghapus ${deletedCount} file sampah dari Vercel Blob.`);
    }

  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
