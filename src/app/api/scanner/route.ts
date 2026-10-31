import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    // Auth check — real session ATAU dev bypass cookie
    const session = await getServerSession(authOptions);
    const bypassCookie =
      process.env.NODE_ENV !== "production"
        ? req.cookies.get("dev-admin-bypass")?.value
        : null;

    if (!session?.user && !bypassCookie) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { barcodeString, ticketId, transactionId, checkInAll } = body as {
      barcodeString?: string;
      ticketId?: string;
      transactionId?: string;
      checkInAll?: boolean;
    };

    if (
      (!barcodeString || typeof barcodeString !== "string" || barcodeString.trim() === "") &&
      !ticketId &&
      !transactionId
    ) {
      return NextResponse.json(
        { success: false, message: "Kode QR, ID tiket, atau ID transaksi tidak valid." },
        { status: 400 }
      );
    }

    console.log(
      "[SCANNER API] Menerima request barcode/id:",
      barcodeString || ticketId || transactionId,
      "checkInAll:",
      !!checkInAll
    );
    try {
      fs.appendFileSync(
        path.join(process.cwd(), "scanner_log.txt"),
        `[${new Date().toISOString()}] Scanned: "${barcodeString || ticketId || transactionId}" (checkInAll: ${!!checkInAll})\n`
      );
    } catch (e) {
      console.error(e);
    }

    // Cari tiket acuan
    let ticket: any = null;
    if (ticketId) {
      ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          transaction: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          ticketCategory: { select: { name: true, price: true } },
        },
      });
    } else if (barcodeString) {
      ticket = await prisma.ticket.findUnique({
        where: { barcodeString: barcodeString.trim() },
        include: {
          transaction: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          ticketCategory: { select: { name: true, price: true } },
        },
      });
    } else if (transactionId) {
      ticket = await prisma.ticket.findFirst({
        where: { transactionId },
        include: {
          transaction: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          ticketCategory: { select: { name: true, price: true } },
        },
      });
    }

    // Tiket tidak ditemukan
    if (!ticket) {
      return NextResponse.json({
        success: false,
        status: "NOT_FOUND",
        message: `Tiket tidak ditemukan (${
          barcodeString
            ? `Teks: "${barcodeString}"`
            : ticketId
            ? `ID: "${ticketId}"`
            : `TxID: "${transactionId}"`
        })`,
      });
    }

    // Cek apakah Admin/Validator punya akses ke Event tiket ini
    const sessionUser = session?.user as
      | { id?: string; adminRole?: string; adminId?: string }
      | undefined;
    const role =
      sessionUser?.adminRole ??
      (bypassCookie === "VALIDATOR" ? "VALIDATOR" : "SUPER_ADMIN");
    const adminId = sessionUser?.adminId ?? sessionUser?.id;

    if (role === "VALIDATOR" && adminId) {
      const hasAccess = await prisma.adminEventAccess.findUnique({
        where: {
          adminId_eventId: {
            adminId,
            eventId: ticket.transaction.eventId,
          },
        },
      });
      if (!hasAccess) {
        return NextResponse.json({
          success: false,
          status: "FORBIDDEN",
          message: "Kamu tidak memiliki akses untuk men-scan tiket event ini.",
        });
      }
    }

    // Transaksi belum diapprove / Expired
    if (ticket.transaction.status !== "APPROVED") {
      if (ticket.transaction.status === "EXPIRED") {
        return NextResponse.json({
          success: false,
          status: "EXPIRED",
          message: "Tiket kedaluwarsa (Expired). Transaksi tidak berlaku.",
        });
      }

      return NextResponse.json({
        success: false,
        status: "NOT_APPROVED",
        message: `Pembayaran belum diverifikasi (Status: ${ticket.transaction.status}).`,
        ticket: {
          holderName: ticket.holderName || ticket.transaction.buyerName,
          eventTitle: ticket.transaction.event.title,
          category: ticket.ticketCategory.name,
          txStatus: ticket.transaction.status,
        },
      });
    }

    // Ambil SEMUA tiket dalam transaksi ini
    const allTickets = await prisma.ticket.findMany({
      where: { transactionId: ticket.transactionId },
      orderBy: { id: "asc" },
    });

    const checkedInTickets = allTickets.filter((t) => t.isValidated);
    const checkedInCount = checkedInTickets.length;
    const totalTickets = allTickets.length;
    const uncheckedTickets = allTickets.filter((t) => !t.isValidated);
    const now = new Date();

    // ── FITUR: CHECK-IN SEMUA TIKET SEKALIGUS (checkInAll === true) ───────────
    if (checkInAll) {
      if (uncheckedTickets.length === 0) {
        const lastCheckIn = checkedInTickets[checkedInTickets.length - 1]?.checkedInAt;
        const formattedDate = lastCheckIn
          ? new Date(lastCheckIn).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "Sebelumnya";

        return NextResponse.json({
          success: false,
          status: "ALREADY_CHECKED_IN",
          message: `Semua tiket (${totalTickets}/${totalTickets}) dalam transaksi ini sudah pernah check-in (Terakhir ${formattedDate}).`,
          ticket: {
            holderName: ticket.holderName || ticket.transaction.buyerName,
            eventTitle: ticket.transaction.event.title,
            category: ticket.ticketCategory.name,
            checkedInAt: lastCheckIn,
            totalTickets,
            checkedInCount: totalTickets,
            remainingCount: 0,
            transactionId: ticket.transactionId,
          },
        });
      }

      // Validasi semua tiket yang belum check-in
      await prisma.ticket.updateMany({
        where: {
          transactionId: ticket.transactionId,
          isValidated: false,
        },
        data: {
          isValidated: true,
          checkedInAt: now,
        },
      });

      return NextResponse.json({
        success: true,
        status: "VALID",
        message: `Check-in berhasil untuk SEMUA rombongan (${totalTickets}/${totalTickets} tiket)!`,
        ticket: {
          id: ticket.id,
          barcodeString: ticket.barcodeString,
          holderName: ticket.holderName || ticket.transaction.buyerName,
          holderPhone: ticket.holderPhone || ticket.transaction.buyerPhone,
          eventTitle: ticket.transaction.event.title,
          category: ticket.ticketCategory.name,
          transactionId: ticket.transaction.id,
          checkedInAt: now,
          totalTickets,
          checkedInCount: totalTickets,
          remainingCount: 0,
        },
      });
    }

    // ── JIKA DI-CHECK-IN SPESIFIK BERDASARKAN TICKET ID (1 per 1) ──────────────
    if (ticketId) {
      if (ticket.isValidated) {
        // Cek apakah ini rombongan dan masih punya sisa tiket yang belum check-in
        const nextUnchecked = uncheckedTickets[0];
        if (nextUnchecked) {
          // Validasi tiket berikutnya yang belum check-in dalam rombongan ini
          await prisma.ticket.update({
            where: { id: nextUnchecked.id },
            data: {
              isValidated: true,
              checkedInAt: now,
            },
          });

          const newCheckedCount = checkedInCount + 1;
          const remaining = totalTickets - newCheckedCount;

          return NextResponse.json({
            success: true,
            status: "VALID",
            message: `Check-in berhasil untuk tiket berikutnya (${nextUnchecked.holderName || ticket.transaction.buyerName})! Kuota: ${newCheckedCount}/${totalTickets}`,
            ticket: {
              id: nextUnchecked.id,
              barcodeString: nextUnchecked.barcodeString,
              holderName: nextUnchecked.holderName || ticket.transaction.buyerName,
              holderPhone: nextUnchecked.holderPhone || ticket.transaction.buyerPhone,
              eventTitle: ticket.transaction.event.title,
              category: ticket.ticketCategory.name,
              transactionId: ticket.transaction.id,
              checkedInAt: now,
              totalTickets,
              checkedInCount: newCheckedCount,
              remainingCount: remaining,
            },
          });
        }

        const formattedDate = ticket.checkedInAt
          ? new Date(ticket.checkedInAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "Tidak diketahui";

        return NextResponse.json({
          success: false,
          status: "ALREADY_CHECKED_IN",
          message:
            totalTickets > 1
              ? `Semua tiket rombongan (${totalTickets}/${totalTickets}) sudah digunakan (Terakhir check-in pada ${formattedDate}).`
              : `Tiket ini sudah digunakan (Check-in pada ${formattedDate}).`,
          ticket: {
            holderName: ticket.holderName || ticket.transaction.buyerName,
            eventTitle: ticket.transaction.event.title,
            category: ticket.ticketCategory.name,
            checkedInAt: ticket.checkedInAt,
            totalTickets,
            checkedInCount,
            remainingCount: totalTickets - checkedInCount,
            transactionId: ticket.transactionId,
          },
        });
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          isValidated: true,
          checkedInAt: now,
        },
      });

      const newCheckedCount = checkedInCount + 1;
      const remaining = totalTickets - newCheckedCount;

      return NextResponse.json({
        success: true,
        status: "VALID",
        message:
          totalTickets > 1
            ? `Check-in berhasil untuk ${ticket.holderName || ticket.transaction.buyerName}! (Kuota rombongan: ${newCheckedCount}/${totalTickets})`
            : `Check-in berhasil untuk ${ticket.holderName || ticket.transaction.buyerName}!`,
        ticket: {
          id: ticket.id,
          barcodeString: ticket.barcodeString,
          holderName: ticket.holderName || ticket.transaction.buyerName,
          holderPhone: ticket.holderPhone || ticket.transaction.buyerPhone,
          eventTitle: ticket.transaction.event.title,
          category: ticket.ticketCategory.name,
          transactionId: ticket.transaction.id,
          checkedInAt: now,
          totalTickets,
          checkedInCount: newCheckedCount,
          remainingCount: remaining,
        },
      });
    }

    // ── JIKA DARI SCAN BARCODE / QR CODE (QUOTA-BASED CHECK-IN LOGIC) ─────────
    const uncheckedTicket = uncheckedTickets[0];

    // Jika semua tiket dalam transaksi ini sudah terpakai
    if (!uncheckedTicket) {
      const lastCheckIn = checkedInTickets[checkedInTickets.length - 1]?.checkedInAt;
      const formattedDate = lastCheckIn
        ? new Date(lastCheckIn).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "Tidak diketahui";

      return NextResponse.json({
        success: false,
        status: "ALREADY_CHECKED_IN",
        message: `Kuota habis! Semua tiket (${totalTickets}/${totalTickets}) sudah digunakan (Terakhir pada ${formattedDate}).`,
        ticket: {
          holderName: ticket.holderName || ticket.transaction.buyerName,
          eventTitle: ticket.transaction.event.title,
          category: ticket.ticketCategory.name,
          checkedInAt: lastCheckIn,
          totalTickets,
          checkedInCount: totalTickets,
          remainingCount: 0,
          transactionId: ticket.transactionId,
        },
      });
    }

    // Update 1 tiket berikutnya yang belum terpakai
    await prisma.ticket.update({
      where: { id: uncheckedTicket.id },
      data: {
        isValidated: true,
        checkedInAt: now,
      },
    });

    const newCheckedCount = checkedInCount + 1;
    const remaining = totalTickets - newCheckedCount;

    return NextResponse.json({
      success: true,
      status: "VALID",
      message: `Check-in berhasil! (Kuota terpakai: ${newCheckedCount}/${totalTickets})`,
      ticket: {
        id: uncheckedTicket.id,
        barcodeString: uncheckedTicket.barcodeString,
        holderName: uncheckedTicket.holderName || ticket.transaction.buyerName,
        holderPhone: uncheckedTicket.holderPhone || ticket.transaction.buyerPhone,
        eventTitle: ticket.transaction.event.title,
        category: ticket.ticketCategory.name,
        transactionId: ticket.transaction.id,
        checkedInAt: now,
        totalTickets,
        checkedInCount: newCheckedCount,
        remainingCount: remaining,
      },
    });
  } catch (error) {
    console.error("[SCANNER API ERROR]", error);
    return NextResponse.json(
      { success: false, status: "ERROR", message: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
