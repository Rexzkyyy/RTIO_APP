import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { items } = body as {
      items: Array<{
        ticketId: string;
        barcodeString?: string;
        checkedInAt: string;
      }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: true,
        syncedIds: [],
        message: "Tidak ada antrean sinkronisasi.",
      });
    }

    // Role check jika validator
    let allowedEventIds: string[] | null = null;
    if (role === "VALIDATOR" && adminId) {
      const accesses = await prisma.adminEventAccess.findMany({
        where: { adminId },
        select: { eventId: true },
      });
      allowedEventIds = accesses.map((a) => a.eventId);
    }

    const syncedIds: string[] = [];
    const alreadyValidatedIds: string[] = [];
    const failedIds: string[] = [];

    for (const item of items) {
      try {
        const ticket = await prisma.ticket.findUnique({
          where: { id: item.ticketId },
          include: { transaction: { select: { eventId: true, status: true } } },
        });

        if (!ticket) {
          failedIds.push(item.ticketId);
          continue;
        }

        if (
          allowedEventIds &&
          !allowedEventIds.includes(ticket.transaction.eventId)
        ) {
          failedIds.push(item.ticketId);
          continue;
        }

        // Jika di server sudah tervalidasi
        if (ticket.isValidated) {
          alreadyValidatedIds.push(item.ticketId);
          syncedIds.push(item.ticketId); // Tetap anggap synced agar antrean offline dibersihkan
          continue;
        }

        // Update waktu check in
        const checkInTime = item.checkedInAt
          ? new Date(item.checkedInAt)
          : new Date();

        await prisma.ticket.update({
          where: { id: item.ticketId },
          data: {
            isValidated: true,
            checkedInAt: checkInTime,
          },
        });

        syncedIds.push(item.ticketId);
      } catch (err) {
        console.error(`Failed to sync ticket ${item.ticketId}:`, err);
        failedIds.push(item.ticketId);
      }
    }

    return NextResponse.json({
      success: true,
      syncedIds,
      alreadyValidatedIds,
      failedIds,
      message: `Berhasil menyinkronkan ${syncedIds.length} tiket ke server.`,
    });
  } catch (error) {
    console.error("[OFFLINE SYNC API ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server saat sinkronisasi." },
      { status: 500 }
    );
  }
}

