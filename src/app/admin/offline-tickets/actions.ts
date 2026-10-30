"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type TicketItemInput = {
  ticketNumber: string;
  holderName?: string;
  holderPhone?: string;
  holderGender?: string;
};

export type TicketItemResult = {
  ticketNumber: string;
  holderName: string;
};

export type CreateOfflineTicketResult = {
  success: boolean;
  message?: string;
  transactionId?: string;
  ticketNumber?: string;
  ticketNumbers?: string[];
  totalTickets?: number;
  buyerName?: string;
  buyerPhone?: string;
  eventTitle?: string;
  categoryName?: string;
  priceCharged?: number;
  pricePerTicket?: number;
  tickets?: TicketItemResult[];
};

export async function createOfflineTicket(
  _prevState: unknown,
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

  const sessionUser = session?.user as { adminRole?: string; adminId?: string; name?: string | null } | undefined;
  const isValidator = sessionUser?.adminRole === "VALIDATOR" || bypassRole === "VALIDATOR";

  if (isValidator) {
    return { success: false, message: "Akses ditolak: Verifikator tidak diizinkan membuat tiket offline." };
  }

  const adminId = sessionUser?.adminId;

  const eventId = (formData.get("eventId") as string)?.trim();
  const ticketCategoryId = (formData.get("ticketCategoryId") as string)?.trim();
  const dateStr = (formData.get("date") as string)?.trim();
  const pjName = (formData.get("pjName") as string)?.trim() || (session?.user?.name || "Panitia");
  const buyerName = (formData.get("buyerName") as string)?.trim();
  const buyerPhone = (formData.get("buyerPhone") as string)?.trim() || "-";
  let buyerEmail = (formData.get("buyerEmail") as string)?.trim();
  const buyerGender = (formData.get("buyerGender") as string)?.trim() || null;
  const rawCustomPrice = (formData.get("customPrice") as string)?.trim();
  
  let customPrice: number | null = null;
  if (rawCustomPrice !== undefined && rawCustomPrice !== "") {
    const parsed = parseInt(rawCustomPrice.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      customPrice = parsed;
    }
  }

  if (!eventId) {
    return { success: false, message: "Event wajib dipilih." };
  }
  if (!ticketCategoryId) {
    return { success: false, message: "Kategori tiket wajib dipilih." };
  }
  if (!buyerName) {
    return { success: false, message: "Nama pembeli / pemesan perwakilan wajib diisi." };
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

  // Parse ticket items (support both single ticket and batch tickets)
  const ticketItemsRaw = formData.get("ticketItems") as string;
  let itemsToCreate: TicketItemInput[] = [];

  if (ticketItemsRaw) {
    try {
      const parsed = JSON.parse(ticketItemsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        itemsToCreate = parsed.map((item) => ({
          ticketNumber: String(item.ticketNumber || "").trim(),
          holderName: item.holderName ? String(item.holderName).trim() : buyerName,
          holderPhone: item.holderPhone ? String(item.holderPhone).trim() : buyerPhone,
          holderGender: item.holderGender ? String(item.holderGender).trim() : buyerGender || undefined,
        }));
      }
    } catch (e) {
      console.error("Gagal parse ticketItems JSON:", e);
    }
  }

  // Fallback to single ticketNumber if ticketItems not supplied
  if (itemsToCreate.length === 0) {
    const rawSingleTicketNumber = (formData.get("ticketNumber") as string)?.trim();
    if (rawSingleTicketNumber) {
      itemsToCreate = [{
        ticketNumber: rawSingleTicketNumber,
        holderName: buyerName,
        holderPhone: buyerPhone,
        holderGender: buyerGender || undefined,
      }];
    }
  }

  if (itemsToCreate.length === 0) {
    return { success: false, message: "Nomor tiket wajib diisi minimal 1 tiket." };
  }

  // Filter out completely blank ticket numbers
  itemsToCreate = itemsToCreate.filter((it) => it.ticketNumber.length > 0);
  if (itemsToCreate.length === 0) {
    return { success: false, message: "Nomor tiket tidak boleh kosong." };
  }

  // 1. Cek duplikasi nomor tiket di dalam batch formulir yang sama
  const seenBatch = new Set<string>();
  const duplicateInBatch: string[] = [];
  for (const item of itemsToCreate) {
    const key = item.ticketNumber.toLowerCase();
    if (seenBatch.has(key)) {
      duplicateInBatch.push(item.ticketNumber);
    }
    seenBatch.add(key);
  }
  if (duplicateInBatch.length > 0) {
    return {
      success: false,
      message: `Terdapat nomor tiket ganda dalam formulir ini: "${[...new Set(duplicateInBatch)].join(", ")}". Harap gunakan nomor fisik yang berbeda.`
    };
  }

  // 2. Cek apakah ada nomor tiket yang sudah pernah digunakan di database
  const allTicketNumbers = itemsToCreate.map((it) => it.ticketNumber);
  const existingTickets = await prisma.ticket.findMany({
    where: {
      barcodeString: {
        in: allTicketNumbers
      }
    },
    select: {
      barcodeString: true
    }
  });

  if (existingTickets.length > 0) {
    const usedList = existingTickets.map((t) => `"${t.barcodeString}"`).join(", ");
    return {
      success: false,
      message: `Nomor tiket berikut sudah pernah digunakan di sistem: ${usedList}! Silakan gunakan nomor tiket fisik yang lain.`
    };
  }

  // If email is empty, generate safe placeholder
  if (!buyerEmail) {
    const primarySafeNum = allTicketNumbers[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || Date.now().toString();
    buyerEmail = `${primarySafeNum}@offline.rtiotix`;
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
      // Fetch ticket category
      const category = await tx.ticketCategory.findUnique({
        where: { id: ticketCategoryId }
      });

      if (!category) {
        throw new Error("Kategori tiket tidak ditemukan.");
      }

      const now = new Date();
      const isDiscountActive = category.hasDiscount && category.discountPrice != null &&
        (!category.discountStartDate || now >= category.discountStartDate) &&
        (!category.discountEndDate || now <= category.discountEndDate) &&
        (category.discountQuota === null || category.discountQuota > 0);

      const activePrice = isDiscountActive ? category.discountPrice! : category.price;

      // Fetch event title
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { title: true }
      });

      const finalPricePerTicket = customPrice !== null ? customPrice : activePrice;
      const totalTickets = itemsToCreate.length;
      const finalTotalPrice = finalPricePerTicket * totalTickets;

      const addressNote = finalPricePerTicket !== activePrice
        ? `Tiket Offline (${totalTickets} tiket | PJ: ${pjName} | Harga Khusus: Rp ${finalPricePerTicket.toLocaleString('id-ID')}/tiket [Normal: Rp ${activePrice.toLocaleString('id-ID')}])`
        : `Tiket Offline (${totalTickets} tiket | PJ: ${pjName})`;

      // Create transaction
      const newTx = await tx.transaction.create({
        data: {
          eventId,
          buyerName,
          buyerEmail,
          buyerPhone,
          buyerGender,
          buyerAddress: addressNote,
          totalTickets,
          totalPrice: finalTotalPrice,
          paymentProofUrl: "OFFLINE",
          senderAccountName: `OFFLINE: ${pjName}`,
          status: "APPROVED",
          createdAt: transactionDate
        }
      });

      // Create individual tickets
      const createdTicketsResult: TicketItemResult[] = [];
      const createdTicketIds: string[] = [];

      for (const item of itemsToCreate) {
        const ticket = await tx.ticket.create({
          data: {
            transactionId: newTx.id,
            ticketCategoryId,
            barcodeString: item.ticketNumber,
            holderName: item.holderName || buyerName,
            holderPhone: item.holderPhone || buyerPhone,
            holderGender: item.holderGender || buyerGender,
          }
        });

        createdTicketIds.push(ticket.id);
        createdTicketsResult.push({
          ticketNumber: item.ticketNumber,
          holderName: item.holderName || buyerName,
        });
      }

      // Custom fields (if any)
      const customFieldIds = formData.getAll("customFieldId[]") as string[];
      if (customFieldIds && customFieldIds.length > 0) {
        const answersToCreate: { ticketId: string; fieldId: string; value: string }[] = [];
        for (const fId of customFieldIds) {
          const val = (formData.get(`customAnswer_${fId}`) as string)?.trim();
          if (val) {
            for (const ticketId of createdTicketIds) {
              answersToCreate.push({
                ticketId,
                fieldId: fId,
                value: val
              });
            }
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
        ticketNumbers: allTicketNumbers,
        ticketNumber: allTicketNumbers[0],
        totalTickets,
        buyerName,
        buyerPhone,
        eventTitle: event?.title || "Event",
        categoryName: category.name,
        pricePerTicket: finalPricePerTicket,
        priceCharged: finalTotalPrice,
        tickets: createdTicketsResult,
      };
    });

    revalidatePath("/admin/transactions");
    revalidatePath("/admin/offline-tickets");
    revalidatePath("/admin/attendance");
    revalidatePath("/admin/analytics");

    const countText = result.totalTickets > 1 ? `${result.totalTickets} tiket offline` : `Tiket offline nomor "${result.ticketNumber}"`;

    return {
      success: true,
      message: `${countText} berhasil diterbitkan untuk ${result.buyerName}! Total: Rp ${result.priceCharged?.toLocaleString("id-ID")}`,
      transactionId: result.transactionId,
      ticketNumber: result.ticketNumber,
      ticketNumbers: result.ticketNumbers,
      totalTickets: result.totalTickets,
      buyerName: result.buyerName,
      buyerPhone: result.buyerPhone,
      eventTitle: result.eventTitle,
      categoryName: result.categoryName,
      pricePerTicket: result.pricePerTicket,
      priceCharged: result.priceCharged,
      tickets: result.tickets,
    };
  } catch (error: unknown) {
    console.error("Error creating offline ticket:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan tiket offline."
    };
  }
}
