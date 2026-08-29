"use server";

import prisma from "@/lib/prisma";

import { put } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import { cleanupExpiredTransactions, getTransactionExpiryTime } from "@/lib/cleanup-expired";

export async function submitRegistration(formData: FormData) {
  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 0: Cleanup any expired pending transactions before taking new orders
  // ─────────────────────────────────────────────────────────────────────────
  try {
    await cleanupExpiredTransactions();
  } catch (error) {
    console.error("Failed to cleanup expired transactions:", error);
    // Non-fatal, we can still proceed with the current transaction
  }

  const eventId = formData.get("eventId") as string;
  const ticketCategoryId = formData.get("ticketCategoryId") as string;
  const ticketQuantity = parseInt(formData.get("ticketQuantity") as string) || 1;

  const buyerName = formData.get("buyerName") as string;
  const buyerEmail = formData.get("buyerEmail") as string;
  const buyerPhone = formData.get("buyerPhone") as string;

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: Handle file uploads BEFORE the transaction.
  // File I/O is slow and must NOT be inside a DB transaction to avoid timeout.
  // ─────────────────────────────────────────────────────────────────────────
  const customFieldIds = formData.getAll("customFieldId[]") as string[];
  
  // MENGGUNAKAN PROMISE.ALL UNTUK UPLOAD PARALEL (SANGAT CEPAT)
  const uploadPromises = customFieldIds.map(async (fieldId) => {
    let answerValue = "";
    const rawAnswer = formData.get(`customAnswer_${fieldId}`);

    if (rawAnswer && typeof rawAnswer === "object" && "arrayBuffer" in rawAnswer) {
      const file = rawAnswer as File;
      if (file.size > 0) {
        const filename = `answers/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
        const blob = await put(filename, file, { access: "public" });
        answerValue = blob.url;
      }
    } else {
      answerValue = (rawAnswer as string) || "";
    }

    if (answerValue) {
      return { fieldId, value: answerValue };
    }
    return null;
  });

  const processedAnswersResult = await Promise.all(uploadPromises);
  const processedAnswers = processedAnswersResult.filter(Boolean) as { fieldId: string; value: string }[];

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: Atomic database transaction with row-level locking.
  //
  // TECHNIQUE: "SELECT FOR UPDATE" (Pessimistic Locking)
  //
  // When we lock the TicketCategory row, ALL other concurrent transactions
  // that try to read the SAME row will be BLOCKED and forced to WAIT until
  // this transaction commits or rolls back.
  //
  // This completely eliminates the Race Condition / TOCTOU bug:
  //   - No two buyers can ever see the same "stale" quota simultaneously.
  //   - If quota runs out mid-sale, later transactions will see quota = 0
  //     AFTER the lock is released, and will correctly throw an error.
  //
  // IsolationLevel: RepeatableRead — ensures phantom reads are prevented.
  // ─────────────────────────────────────────────────────────────────────────
  let transactionResult: { id: string; isFree: boolean };

  try {
    transactionResult = await prisma.$transaction(
      async (tx) => {
        // ── Step 1: Lock the row. All concurrent requests WAIT here. ──────────
        // $queryRaw returns typed results based on our SELECT columns.
        const locked = await tx.$queryRaw<
          { id: string; name: string; price: number; quota: number; eventId: string }[]
        >`
          SELECT id, name, price, quota, "eventId"
          FROM "TicketCategory"
          WHERE id = ${ticketCategoryId}
          FOR UPDATE
        `;

        if (locked.length === 0) {
          throw new Error("Kategori tiket tidak ditemukan.");
        }

        const category = locked[0];

        // ── Step 2: Validate quota AFTER lock (guaranteed fresh data). ────────
        if (category.quota < ticketQuantity) {
          if (category.quota === 0) {
            throw new Error(`Maaf, tiket "${category.name}" sudah habis terjual.`);
          }
          throw new Error(
            `Maaf, sisa tiket "${category.name}" hanya ${category.quota} lembar. Kurangi jumlah pembelian Anda.`
          );
        }

        const totalPrice = category.price * ticketQuantity;

        // ── Step 3: Create Transaction record. ────────────────────────────────
        const newTransaction = await tx.transaction.create({
          data: {
            eventId,
            buyerName,
            buyerEmail,
            buyerPhone,
            totalTickets: ticketQuantity,
            totalPrice,
            status: "PENDING",
            expiresAt: getTransactionExpiryTime(),
          },
        });

        // ── Step 4: Decrement quota atomically (still inside lock). ───────────
        await tx.ticketCategory.update({
          where: { id: ticketCategoryId },
          data: {
            quota: {
              decrement: ticketQuantity,
            },
          },
        });

        // ── Step 5: Create individual Ticket records (MENGGUNAKAN CREATEMANY). ─────────────────────────
        const ticketsToCreate = Array.from({ length: ticketQuantity }, (_, i) => ({
          transactionId: newTransaction.id,
          ticketCategoryId: category.id,
          barcodeString: `${newTransaction.id}-${i}-${Date.now()}`,
        }));

        await tx.ticket.createMany({
          data: ticketsToCreate,
        });

        // Get the first ticket to attach answers to
        const primaryTicket = await tx.ticket.findFirst({
          where: { transactionId: newTransaction.id }
        });

        // ── Step 6: Save pre-processed answers (MENGGUNAKAN CREATEMANY). ───────────────────────────────
        if (processedAnswers.length > 0 && primaryTicket) {
          const answersData = processedAnswers.map(answer => ({
            ticketId: primaryTicket.id,
            fieldId: answer.fieldId,
            value: answer.value,
          }));
          
          await tx.ticketAnswer.createMany({
            data: answersData
          });
        }

        // Return the transaction data needed for direct navigation.
        return {
          id: newTransaction.id,
          isFree: totalPrice === 0
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        maxWait: 10000, // Wait up to 10s to acquire the lock
        timeout: 15000, // The whole transaction must finish within 15s
      }
    );
  } catch (error: any) {
    // Re-throw with a clean message. The error.message is already user-friendly.
    throw new Error(error.message || "Terjadi kesalahan saat memproses pembelian.");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3: Return DIRECT URL for client to navigate smoothly, skipping intermediate redirects.
  // ─────────────────────────────────────────────────────────────────────────
  const finalUrl = transactionResult.isFree 
    ? `/public/${transactionResult.id}/ticket` 
    : `/public/${transactionResult.id}/pay`;
    
  return { success: true, url: finalUrl };
}
