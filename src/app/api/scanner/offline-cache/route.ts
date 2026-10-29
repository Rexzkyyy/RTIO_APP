import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const bypassCookie =
      process.env.NODE_ENV !== "production"
        ? req.cookies.get("dev-admin-bypass")?.value
        : null;

    if (!session?.user && !bypassCookie) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const sessionUser = session?.user as
      | { id?: string; adminRole?: string; adminId?: string }
      | undefined;
    const role =
      sessionUser?.adminRole ??
      (bypassCookie === "VALIDATOR" ? "VALIDATOR" : "SUPER_ADMIN");
    const adminId = sessionUser?.adminId ?? sessionUser?.id;

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;

    // Cek hak akses jika validator
    let allowedEventIds: string[] | null = null;
    if (role === "VALIDATOR" && adminId) {
      const accesses = await prisma.adminEventAccess.findMany({
        where: { adminId },
        select: { eventId: true },
      });
      allowedEventIds = accesses.map((a) => a.eventId);
      if (allowedEventIds.length === 0) {
        return NextResponse.json({ success: true, tickets: [] });
      }
    }

    const eventWhere: Record<string, unknown> = {};
    if (allowedEventIds) {
      if (eventId && allowedEventIds.includes(eventId)) {
        eventWhere.eventId = eventId;
      } else {
        eventWhere.eventId = { in: allowedEventIds };
      }
    } else if (eventId && eventId !== "ALL") {
      eventWhere.eventId = eventId;
    }

    // Ambil semua tiket yang transaksinya APPROVED untuk disimpan ke cache offline
    const rawTickets = await prisma.ticket.findMany({
      where: {
        transaction: {
          ...eventWhere,
          status: "APPROVED",
        },
      },
      select: {
        id: true,
        transactionId: true,
        barcodeString: true,
        holderName: true,
        holderPhone: true,
        holderGender: true,
        isValidated: true,
        checkedInAt: true,
        ticketCategory: {
          select: {
            name: true,
            price: true,
          },
        },
        transaction: {
          select: {
            id: true,
            eventId: true,
            buyerName: true,
            buyerPhone: true,
            status: true,
            totalTickets: true,
            tickets: {
              select: {
                id: true,
                isValidated: true,
              },
            },
            event: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    const tickets = rawTickets.map((t) => {
      const allTxTickets = t.transaction.tickets || [];
      const totalTickets = t.transaction.totalTickets || allTxTickets.length || 1;
      const checkedInCount = allTxTickets.filter((x) => x.isValidated).length;
      const remainingCount = Math.max(0, totalTickets - checkedInCount);

      return {
        id: t.id,
        transactionId: t.transactionId,
        barcodeString: t.barcodeString,
        holderName: t.holderName,
        holderPhone: t.holderPhone,
        holderGender: t.holderGender,
        isValidated: t.isValidated,
        checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
        categoryName: t.ticketCategory.name,
        categoryPrice: t.ticketCategory.price,
        eventTitle: t.transaction.event.title,
        eventId: t.transaction.eventId,
        buyerName: t.transaction.buyerName,
        buyerPhone: t.transaction.buyerPhone,
        txStatus: t.transaction.status,
        totalTickets,
        checkedInCount,
        remainingCount,
      };
    });

    return NextResponse.json({
      success: true,
      count: tickets.length,
      syncedAt: new Date().toISOString(),
      tickets,
    });
  } catch (error) {
    console.error("[OFFLINE CACHE API ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data offline cache." },
      { status: 500 }
    );
  }
}
