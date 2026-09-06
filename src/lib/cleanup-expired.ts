import prisma from "@/lib/prisma";

const PAYMENT_TIMEOUT_MINUTES = 30; // Batas waktu pembayaran: 30 menit

/**
 * Finds all PENDING transactions that have passed their expiry time,
 * marks them as EXPIRED, and returns the quota back to the ticket category.
 *
 * This function is safe to call concurrently due to the atomic UPDATE...WHERE
 * pattern — each transaction row can only be expired once.
 */
export async function cleanupExpiredTransactions() {
  const now = new Date();

  // Find all expired PENDING transactions yang BELUM upload bukti transfer
  // Jika sudah upload bukti transfer (paymentProofUrl !== null), jangan di-expire otomatis,
  // biarkan admin mereview-nya.
  const expiredTransactions = await prisma.transaction.findMany({
    where: {
      OR: [
        // 1. PENDING yang belum pernah upload bukti
        { status: "PENDING", paymentProofUrl: null, expiresAt: { lte: now } },
        // 2. REJECTED yang dikasih waktu tambahan tapi belum di-upload ulang (upload ulang merubahnya jadi PENDING lagi)
        { status: "REJECTED", expiresAt: { lte: now } }
      ]
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
      // Double-check status (race condition guard)
      const freshTx = await prismaTx.transaction.findUnique({
        where: { id: tx.id },
        select: { status: true },
      });

      if (freshTx?.status !== "PENDING" && freshTx?.status !== "REJECTED") return; // Already processed

      // Mark transaction as EXPIRED
      await prismaTx.transaction.update({
        where: { id: tx.id },
        data: { status: "EXPIRED" },
      });

      // Return quota for each ticket category
      for (const [categoryId, count] of quotaToReturn.entries()) {
        const category = await prismaTx.ticketCategory.findUnique({
          where: { id: categoryId },
        });

        if (category) {
          const activePrice = tx.totalTickets > 0 ? tx.totalPrice / tx.totalTickets : 0;
          const usedDiscount = category.hasDiscount && category.discountPrice !== null && activePrice === category.discountPrice;
          
          const updateData: any = {
            quota: { increment: count },
          };

          if (usedDiscount && category.discountQuota !== null) {
            updateData.discountQuota = { increment: count };
          }

          await prismaTx.ticketCategory.update({
            where: { id: categoryId },
            data: updateData,
          });
        }
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
  expiresAt.setMinutes(expiresAt.getMinutes() + PAYMENT_TIMEOUT_MINUTES);
  return expiresAt;
}

export { PAYMENT_TIMEOUT_MINUTES };
