import { Pool } from 'pg';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });

async function cleanup() {
  const client = await pool.connect();
  try {
    // Find transaction
    const txResult = await client.query(
      `SELECT t.id, t."buyerName", t."buyerEmail"
       FROM "Transaction" t
       WHERE t."buyerEmail" = $1 OR t."buyerName" = $2`,
      ['playwright-e2e-test@test.com', 'Playwright Tester E2E']
    );

    if (txResult.rows.length === 0) {
      // Try by phone
      const tx2 = await client.query(
        `SELECT id, "buyerName", "buyerPhone", "eventId" FROM "Transaction" WHERE "buyerPhone" = $1`,
        ['08199999991']
      );
      console.log('By phone:', tx2.rows);
      
      // Last resort - search all recent transactions
      const recent = await client.query(
        `SELECT id, "buyerName", "buyerEmail", "buyerPhone", status, "createdAt" 
         FROM "Transaction" 
         ORDER BY "createdAt" DESC 
         LIMIT 5`
      );
      console.log('5 transaksi terbaru:', JSON.stringify(recent.rows, null, 2));
      return;
    }

    for (const tx of txResult.rows) {
      console.log(`Menghapus: ${tx.id} — ${tx.buyerName} (${tx.buyerEmail})`);
      
      // Get tickets to restore quota
      const tickets = await client.query(
        `SELECT id, "ticketCategoryId" FROM "Ticket" WHERE "transactionId" = $1`,
        [tx.id]
      );

      // Delete ticket answers
      for (const ticket of tickets.rows) {
        await client.query(`DELETE FROM "TicketAnswer" WHERE "ticketId" = $1`, [ticket.id]);
      }

      // Delete tickets
      await client.query(`DELETE FROM "Ticket" WHERE "transactionId" = $1`, [tx.id]);
      console.log(`  ✅ ${tickets.rowCount} tiket dihapus`);

      // Restore quota per category
      const catGroups: Record<string, number> = {};
      for (const ticket of tickets.rows) {
        catGroups[ticket.ticketCategoryId] = (catGroups[ticket.ticketCategoryId] || 0) + 1;
      }
      for (const [catId, count] of Object.entries(catGroups)) {
        await client.query(
          `UPDATE "TicketCategory" SET quota = quota + $1 WHERE id = $2`,
          [count, catId]
        );
        console.log(`  ✅ Kuota dikembalikan +${count} untuk kategori ${catId.slice(0,8)}...`);
      }

      // Delete transaction
      await client.query(`DELETE FROM "Transaction" WHERE id = $1`, [tx.id]);
      console.log(`  ✅ Transaksi dihapus`);
    }

    console.log('\n🎉 Selesai! Data test sudah bersih dari database produksi.');
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup().catch(e => { console.error(e); process.exit(1); });
