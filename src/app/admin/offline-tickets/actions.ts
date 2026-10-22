"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type CreateOfflineTicketResult = {
  success: boolean;
  message?: string;
  transactionId?: string;
  ticketNumber?: string;
  buyerName?: string;
  buyerPhone?: string;
  eventTitle?: string;
  categoryName?: string;
};

export async function createOfflineTicket(
  prevState: any,
  formData: FormData
): Promise<CreateOfflineTicketResult> {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const bypassRole = process.env.NODE_ENV !== "production"
    ? cookieStore.get("dev-admin-bypass")?.value
    : null;

  if (!session?.user && !bypassRole) {
    return { success: false, message: "Akses tidak sah. Silakan login terlebih dahulu." };
  }

  // @ts-ignore
  const isValidator = session?.user?.adminRole === "VALIDATOR" || bypassRole === "VALIDATOR";
  // @ts-ignore
  const adminId = session?.user?.adminId;

  const eventId = (formData.get("eventId") as string)?.trim();
  const ticketCategoryId = (formData.get("ticketCategoryId") as string)?.trim();
  const rawTicketNumber = (formData.get("ticketNumber") as string)?.trim();
  const dateStr = (formData.get("date") as string)?.trim();
  const pjName = (formData.get("pjName") as string)?.trim() || (session?.user?.name || "Panitia");
  const buyerName = (formData.get("buyerName") as string)?.trim();
  const buyerPhone = (formData.get("buyerPhone") as string)?.trim() || "-";
  let buyerEmail = (formData.get("buyerEmail") as string)?.trim();
  const buyerGender = (formData.get("buyerGender") as string)?.trim() || null;

  if (!eventId) {
    return { success: false, message: "Event wajib dipilih." };
  }
  if (!ticketCategoryId) {
    return { success: false, message: "Kategori tiket wajib dipilih." };
  }
  if (!rawTicketNumber) {
    return { success: false, message: "Nomor tiket wajib diisi." };
  }
  if (!buyerName) {
    return { success: false, message: "Nama peserta wajib diisi." };
  }

  // Check validator access if role is validator
  if (isValidator && adminId) {
    const hasAccess = await prisma.adminEventAccess.findUnique({
      where: {
        adminId_eventId: {
          adminId,
          eventId
        }
      }
    });
    if (!hasAccess) {
      return { success: false, message: "Anda tidak memiliki akses ke event ini." };
    }
  }

  const ticketNumber = rawTicketNumber;

  // 1. Cek apakah nomor tiket sudah pernah digunakan (barcodeString unik)
  const existingTicket = await prisma.ticket.findUnique({
    where: { barcodeString: ticketNumber }
  });
  if (existingTicket) {
    return {
      success: false,
      message: `Nomor tiket "${ticketNumber}" sudah pernah digunakan! Silakan gunakan nomor tiket fisik yang lain.`
    };
  }

  // If email is empty, generate safe placeholder
  if (!buyerEmail) {
    const safeNum = ticketNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || Date.now().toString();
    buyerEmail = `${safeNum}@offline.rtiotix`;
  }

  // Parse custom date or default to now
  let transactionDate = new Date();
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      transactionDate = parsed;
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Fetch ticket category with row lock
      const categories = await tx.$queryRaw<
        {
          id: string;
          name: string;
          price: number;
          quota: number;
          eventId: string;
          hasDiscount: boolean;
          discountPrice: number | null;
          discountStartDate: Date | null;
          discountEndDate: Date | null;
          discountQuota: number | null;
        }[]
      >`
        SELECT id, name, price, quota, "eventId", "hasDiscount", "discountPrice", "discountStartDate", "discountEndDate", "discountQuota"
        FROM "TicketCategory"
        WHERE id = ${ticketCategoryId}
        FOR UPDATE
      `;

      if (categories.length === 0) {
        throw new Error("Kategori tiket tidak ditemukan.");
      }

      const category = categories[0];

      if (category.quota < 1) {
        throw new Error(`Kategori tiket "${category.name}" sudah habis (kuota 0).`);
      }

      const now = new Date();
      const isDiscountActive = category.hasDiscount && category.discountPrice != null &&
        (!category.discountStartDate || now >= category.discountStartDate) &&
        (!category.discountEndDate || now <= category.discountEndDate) &&
        (category.discountQuota === null || category.discountQuota > 0);

      const activePrice = isDiscountActive ? category.discountPrice! : category.price;

      // Decrement quota
      const updateCatData: any = {
        quota: { decrement: 1 }
      };
      if (isDiscountActive && category.discountQuota !== null) {
        updateCatData.discountQuota = { decrement: 1 };
      }

      await tx.ticketCategory.update({
        where: { id: ticketCategoryId },
        data: updateCatData
      });

      // Fetch event title
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { title: true }
      });

      // Create transaction
      const newTx = await tx.transaction.create({
        data: {
          eventId,
          buyerName,
          buyerEmail,
          buyerPhone,
          buyerGender,
          buyerAddress: `Tiket Offline (PJ: ${pjName})`,
          totalTickets: 1,
          totalPrice: activePrice,
          paymentProofUrl: "OFFLINE",
          senderAccountName: `OFFLINE: ${pjName}`,
          status: "APPROVED",
          createdAt: transactionDate
        }
      });

      // Create ticket
      const newTicket = await tx.ticket.create({
        data: {
          transactionId: newTx.id,
          ticketCategoryId,
          barcodeString: ticketNumber,
          holderName: buyerName,
          holderPhone: buyerPhone,
          holderGender: buyerGender,
        }
      });

      // Custom fields (if any)
      const customFieldIds = formData.getAll("customFieldId[]") as string[];
      if (customFieldIds && customFieldIds.length > 0) {
        const answersToCreate: { ticketId: string; fieldId: string; value: string }[] = [];
        for (const fId of customFieldIds) {
          const val = (formData.get(`customAnswer_${fId}`) as string)?.trim();
          if (val) {
            answersToCreate.push({
              ticketId: newTicket.id,
              fieldId: fId,
              value: val
            });
          }
        }
        if (answersToCreate.length > 0) {
          await tx.ticketAnswer.createMany({
            data: answersToCreate
          });
        }
      }

      return {
        transactionId: newTx.id,
        ticketNumber,
        buyerName,
        buyerPhone,
        eventTitle: event?.title || "Event",
        categoryName: category.name
      };
    });

    revalidatePath("/admin/transactions");
    revalidatePath("/admin/offline-tickets");
    revalidatePath("/admin/attendance");

    return {
      success: true,
      message: `Tiket offline nomor "${result.ticketNumber}" berhasil diterbitkan untuk ${result.buyerName}!`,
      transactionId: result.transactionId,
      ticketNumber: result.ticketNumber,
      buyerName: result.buyerName,
      buyerPhone: result.buyerPhone,
      eventTitle: result.eventTitle,
      categoryName: result.categoryName
    };
  } catch (error: any) {
    console.error("Error creating offline ticket:", error);
    return {
      success: false,
      message: error.message || "Terjadi kesalahan saat menyimpan tiket offline."
    };
  }
}
