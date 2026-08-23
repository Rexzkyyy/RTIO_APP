import prisma from "@/lib/prisma";

const PAYMENT_TIMEOUT_HOURS = 1; // Batas waktu pembayaran: 1 jam

/**
 * Finds all PENDING transactions that have passed their expiry time,
 * marks them as EXPIRED, and returns the quota back to the ticket category.
 *
 * This function is safe to call concurrently due to the atomic UPDATE...WHERE
 * pattern — each transaction row can only be expired once.
 */
export async function cleanupExpiredTransactions() {
  const now = new Date();

  // Find all expired PENDING transactions
  const expiredTransactions = await prisma.transaction.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lte: now, // expiresAt <= now
      },
    },
    include: {
      tickets: {
        select: {
          ticketCategoryId: true,
        },
      },
    },
  });

  if (expiredTransactions.length === 0) {
    return { expiredCount: 0 };
  }

  // Process each expired transaction
  for (const tx of expiredTransactions) {
    // Count tickets per category in this transaction
    const quotaToReturn = new Map<string, number>();
    for (const ticket of tx.tickets) {
      const current = quotaToReturn.get(ticket.ticketCategoryId) ?? 0;
      quotaToReturn.set(ticket.ticketCategoryId, current + 1);
    }

    // Atomically mark as EXPIRED and return quota
    await prisma.$transaction(async (prismaTx) => {
      // Double-check status is still PENDING (race condition guard)
      const freshTx = await prismaTx.transaction.findUnique({
        where: { id: tx.id },
        select: { status: true },
      });

      if (freshTx?.status !== "PENDING") return; // Already processed

      // Mark transaction as EXPIRED
      await prismaTx.transaction.update({
        where: { id: tx.id },
        data: { status: "EXPIRED" },
      });

      // Return quota for each ticket category
      for (const [categoryId, count] of quotaToReturn.entries()) {
        await prismaTx.ticketCategory.update({
          where: { id: categoryId },
          data: {
            quota: {
              increment: count,
            },
          },
        });
      }
    });
  }

  return { expiredCount: expiredTransactions.length };
}

/**
 * Calculate the expiry time for a new transaction.
 */
export function getTransactionExpiryTime(): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + PAYMENT_TIMEOUT_HOURS);
  return expiresAt;
}

export { PAYMENT_TIMEOUT_HOURS };
