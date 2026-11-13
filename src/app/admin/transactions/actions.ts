"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Resilient Admin access verification.
 * Supports:
 * 1. Dev bypass cookie in non-production
 * 2. NextAuth getServerSession
 * 3. Fallback JWT session cookie decoding (handles Next.js 16 + NextAuth v4 async cookies)
 */
export async function assertAdminAccess() {
  const cookieStore = await cookies();

  // 1. Dev bypass in non-production
  if (process.env.NODE_ENV !== "production") {
    const bypass = cookieStore.get("dev-admin-bypass")?.value;
    if (bypass) {
      if (bypass === "VALIDATOR") {
        throw new Error("Akses ditolak: Verifikator hanya memiliki hak akses Lihat Data (View Only).");
      }
      return { isAdmin: true, role: bypass, adminId: null, email: null };
    }
  }

  // 2. Try getServerSession
  let session: any = null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.warn("[assertAdminAccess] getServerSession warning:", err);
  }

  if (session?.user) {
    const role = session.user.adminRole;
    if (role === "VALIDATOR") {
      throw new Error("Akses ditolak: Verifikator hanya memiliki hak akses Lihat Data (View Only).");
    }
    return {
      isAdmin: !!session.user.isAdmin,
      role,
      adminId: session.user.adminId || session.user.id,
      email: session.user.email,
    };
  }

  // 3. Fallback: Read and decode JWT session token directly from cookies
  let sessionToken =
    cookieStore.get("__Secure-next-auth.session-token")?.value ||
    cookieStore.get("next-auth.session-token")?.value;

  // Fallback support for chunked cookies (.0, .1, etc.)
  if (!sessionToken) {
    const securePrefix = "__Secure-next-auth.session-token.";
    const plainPrefix = "next-auth.session-token.";
    const chunks: string[] = [];
    let i = 0;
    while (cookieStore.get(`${securePrefix}${i}`)) {
      chunks.push(cookieStore.get(`${securePrefix}${i}`)!.value);
      i++;
    }
    if (chunks.length === 0) {
      i = 0;
      while (cookieStore.get(`${plainPrefix}${i}`)) {
        chunks.push(cookieStore.get(`${plainPrefix}${i}`)!.value);
        i++;
      }
    }
    if (chunks.length > 0) {
      sessionToken = chunks.join("");
    }
  }

  if (sessionToken) {
    try {
      const decoded = await decode({
        token: sessionToken,
        secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "",
      });

      if (decoded && (decoded.email || decoded.sub)) {
        const role = (decoded.adminRole as string) || null;
        const isAdmin = decoded.isAdmin === true;
        const adminId = (decoded.adminId as string) || (decoded.sub as string) || null;

        if (role === "VALIDATOR") {
          throw new Error("Akses ditolak: Verifikator hanya memiliki hak akses Lihat Data (View Only).");
        }

        if (isAdmin || role) {
          return { isAdmin: true, role, adminId, email: (decoded.email as string) || null };
        }

        // Check prisma directly if admin flag was not stored in token
        if (decoded.email) {
          const admin = await prisma.admin.findFirst({
            where: { email: { equals: (decoded.email as string).trim().toLowerCase(), mode: "insensitive" } },
          });
          if (admin) {
            if (admin.role === "VALIDATOR") {
              throw new Error("Akses ditolak: Verifikator hanya memiliki hak akses Lihat Data (View Only).");
            }
            return { isAdmin: true, role: admin.role, adminId: admin.id, email: admin.email };
          }
        }
      }
    } catch (decodeErr: any) {
      if (decodeErr.message?.includes("Akses ditolak")) throw decodeErr;
      console.error("[assertAdminAccess] Token decode error:", decodeErr);
    }
  }

  throw new Error("Akses tidak sah: Sesi login Anda telah berakhir atau belum login. Silakan refresh halaman dan login ulang.");
}

/**
 * Update transaction status (APPROVED / REJECTED)
 */
export async function updateTransactionStatus(formData: FormData): Promise<void> {
  try {
    await assertAdminAccess();

    const id = formData.get("id") as string;
    const status = formData.get("status") as "APPROVED" | "REJECTED";

    if (!id || !status) return;

    if (status === "REJECTED") {
      const tx = await prisma.transaction.findUnique({ where: { id } });
      if (tx) {
        const newExpiresAt = new Date();
        newExpiresAt.setMinutes(newExpiresAt.getMinutes() + 60);
        await prisma.transaction.update({
          where: { id },
          data: { status, expiresAt: newExpiresAt },
        });
      }
    } else {
      await prisma.transaction.update({
        where: { id },
        data: { status },
      });
    }

    revalidatePath("/admin/transactions");
  } catch (error: any) {
    console.error("[updateTransactionStatus error]:", error);
    throw error;
  }
}

/**
 * Delete transaction and restore category quota
 */
export async function deleteTransaction(formData: FormData): Promise<void> {
  try {
    await assertAdminAccess();

    const id = formData.get("id") as string;
    if (!id) return;

    await prisma.$transaction(async (prismaTx) => {
      const tx = await prismaTx.transaction.findUnique({
        where: { id },
        include: { tickets: true },
      });
      if (!tx) return;

      await prismaTx.transaction.delete({ where: { id } });

      if (tx.status !== "EXPIRED" && tx.paymentProofUrl !== "OFFLINE") {
        const quotaToReturn = new Map<string, number>();
        for (const ticket of tx.tickets) {
          const current = quotaToReturn.get(ticket.ticketCategoryId) ?? 0;
          quotaToReturn.set(ticket.ticketCategoryId, current + 1);
        }
        for (const [categoryId, count] of quotaToReturn.entries()) {
          const category = await prismaTx.ticketCategory.findUnique({ where: { id: categoryId } });

          if (category) {
            const activePrice = tx.totalTickets > 0 ? tx.totalPrice / tx.totalTickets : 0;
            const usedDiscount = category.hasDiscount && category.discountPrice !== null && activePrice === category.discountPrice;

            const updateData: any = { quota: { increment: count } };

            if (usedDiscount && category.discountQuota !== null) {
              updateData.discountQuota = { increment: count };
            }

            await prismaTx.ticketCategory.update({
              where: { id: categoryId },
              data: updateData,
            });
          }
        }
      }
    });

    revalidatePath("/admin/transactions");
  } catch (error: any) {
    console.error("[deleteTransaction error]:", error);
    throw error;
  }
}

/**
 * Reactivate EXPIRED transaction back to PENDING
 */
export async function reactivateTransaction(formData: FormData): Promise<void> {
  try {
    await assertAdminAccess();

    const id = formData.get("id") as string;
    if (!id) return;

    await prisma.$transaction(async (prismaTx) => {
      const tx = await prismaTx.transaction.findUnique({
        where: { id },
        include: { tickets: true },
      });
      if (!tx || tx.status !== "EXPIRED") return;

      // Kurangi kuota kembali
      const quotaMap = new Map<string, number>();
      for (const ticket of tx.tickets) {
        const current = quotaMap.get(ticket.ticketCategoryId) ?? 0;
        quotaMap.set(ticket.ticketCategoryId, current + 1);
      }
      for (const [categoryId, count] of quotaMap.entries()) {
        await prismaTx.ticketCategory.update({
          where: { id: categoryId },
          data: { quota: { decrement: count } },
        });
      }

      // Set status PENDING, reset bukti TF agar peserta upload ulang
      await prismaTx.transaction.update({
        where: { id },
        data: {
          status: "PENDING",
          expiresAt: null,
          paymentProofUrl: null,
          senderAccountName: null,
        },
      });
    });

    revalidatePath("/admin/transactions");
  } catch (error: any) {
    console.error("[reactivateTransaction error]:", error);
    throw error;
  }
}

/**
 * Approve EXPIRED transaction directly with payment proof
 */
export async function approveExpiredTransaction(formData: FormData): Promise<void> {
  try {
    await assertAdminAccess();

    const id = formData.get("id") as string;
    const paymentProofUrl = formData.get("paymentProofUrl") as string;
    const senderAccountName = formData.get("senderAccountName") as string;

    if (!id || !paymentProofUrl || !senderAccountName) return;

    await prisma.$transaction(async (prismaTx) => {
      const tx = await prismaTx.transaction.findUnique({
        where: { id },
        include: { tickets: true },
      });
      if (!tx || tx.status !== "EXPIRED") return;

      // Kurangi kembali kuota
      const quotaMap = new Map<string, number>();
      for (const ticket of tx.tickets) {
        const current = quotaMap.get(ticket.ticketCategoryId) ?? 0;
        quotaMap.set(ticket.ticketCategoryId, current + 1);
      }
      for (const [categoryId, count] of quotaMap.entries()) {
        await prismaTx.ticketCategory.update({
          where: { id: categoryId },
          data: { quota: { decrement: count } },
        });
      }

      // Set data pembayaran + langsung APPROVED
      await prismaTx.transaction.update({
        where: { id },
        data: {
          status: "APPROVED",
          paymentProofUrl,
          senderAccountName,
          expiresAt: null,
        },
      });
    });

    revalidatePath("/admin/transactions");
  } catch (error: any) {
    console.error("[approveExpiredTransaction error]:", error);
    throw error;
  }
}

/**
 * Upgrade Ticket Category
 */
export async function upgradeTicketCategory(formData: FormData): Promise<void> {
  try {
    await assertAdminAccess();

    const transactionId = formData.get("transactionId") as string;
    const newCategoryId = formData.get("newCategoryId") as string;
    const paymentProofUrl2 = formData.get("paymentProofUrl2") as string;
    const priceDiff = parseInt(formData.get("priceDiff") as string, 10) || 0;
    const oldCategoryId = formData.get("oldCategoryId") as string;

    if (!transactionId || !newCategoryId || !paymentProofUrl2) return;

    await prisma.$transaction(async (prismaTx) => {
      const tx = await prismaTx.transaction.findUnique({
        where: { id: transactionId },
        include: { tickets: true },
      });
      if (!tx || tx.status !== "APPROVED") return;

      const newCat = await prismaTx.ticketCategory.findUnique({ where: { id: newCategoryId } });
      if (!newCat) return;

      // Kurangi kuota kategori baru
      await prismaTx.ticketCategory.update({
        where: { id: newCategoryId },
        data: { quota: { decrement: tx.tickets.length } },
      });

      // Kembalikan kuota kategori lama
      await prismaTx.ticketCategory.update({
        where: { id: oldCategoryId },
        data: { quota: { increment: tx.tickets.length } },
      });

      // Update semua tiket ke kategori baru
      await prismaTx.ticket.updateMany({
        where: { transactionId },
        data: { ticketCategoryId: newCategoryId },
      });

      // Update transaksi: harga, bukti TF kedua, track kategori lama
      await prismaTx.transaction.update({
        where: { id: transactionId },
        data: {
          totalPrice: tx.totalPrice + priceDiff,
          paymentProofUrl2,
          upgradedFromCatId: oldCategoryId,
        },
      });
    });

    revalidatePath("/admin/transactions");
  } catch (error: any) {
    console.error("[upgradeTicketCategory error]:", error);
    throw error;
  }
}

/**
 * Update Payment Proof Image
 */
export async function updatePaymentProof(formData: FormData): Promise<void> {
  try {
    await assertAdminAccess();

    const id = formData.get("id") as string;
    const paymentProofUrl = formData.get("paymentProofUrl") as string;

    if (id && paymentProofUrl) {
      await prisma.transaction.update({
        where: { id },
        data: { paymentProofUrl },
      });
      revalidatePath("/admin/transactions");
    }
  } catch (error: any) {
    console.error("[updatePaymentProof error]:", error);
    throw error;
  }
}
