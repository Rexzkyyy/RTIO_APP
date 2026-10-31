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
    const q = (searchParams.get("q") || "").trim();
    const eventId = searchParams.get("eventId") || undefined;
    const statusFilter = searchParams.get("status") || "ALL"; // ALL, UNCHECKED, CHECKED

    // Jangan tampilkan data jika belum mengetik apa-apa
    if (!q) {
      return NextResponse.json({ success: true, tickets: [] });
    }

    // Role-based event access check
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

    // Build event where clause
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

    // Build status where clause
    const statusWhere: Record<string, unknown> = {};
    if (statusFilter === "UNCHECKED") {
      statusWhere.isValidated = false;
    } else if (statusFilter === "CHECKED") {
      statusWhere.isValidated = true;
    }

    // Build conditions (Jangan pernah munculkan tiket dari transaksi EXPIRED)
    const andConditions: any[] = [];
    andConditions.push({
      transaction: {
        ...eventWhere,
        status: { not: "EXPIRED" },
      },
    });

    if (Object.keys(statusWhere).length > 0) {
      andConditions.push(statusWhere);
    }

    andConditions.push({
      OR: [
        { barcodeString: { contains: q, mode: "insensitive" } },
        { holderName: { contains: q, mode: "insensitive" } },
        { holderPhone: { contains: q, mode: "insensitive" } },
        { transaction: { buyerName: { contains: q, mode: "insensitive" } } },
        { transaction: { buyerPhone: { contains: q, mode: "insensitive" } } },
      ],
    });

    const tickets = await prisma.ticket.findMany({
      where: { AND: andConditions },
      take: 25,
      orderBy: [
        { isValidated: "asc" },
        { checkedInAt: "desc" },
        { id: "desc" },
      ],
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
            id: true,
            name: true,
            price: true,
          },
        },
        transaction: {
          select: {
            id: true,
            buyerName: true,
            buyerPhone: true,
            buyerEmail: true,
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
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const mappedTickets = tickets.map((t) => {
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
        checkedInAt: t.checkedInAt,
        totalTickets,
        checkedInCount,
        remainingCount,
        ticketCategory: t.ticketCategory,
        transaction: {
          id: t.transaction.id,
          buyerName: t.transaction.buyerName,
          buyerPhone: t.transaction.buyerPhone,
          buyerEmail: t.transaction.buyerEmail,
          status: t.transaction.status,
          totalTickets,
          checkedInCount,
          remainingCount,
          event: t.transaction.event,
        },
      };
    });

    return NextResponse.json({ success: true, tickets: mappedTickets });
  } catch (error) {
    console.error("[SCANNER SEARCH API ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server saat mencari tiket." },
      { status: 500 }
    );
  }
}
