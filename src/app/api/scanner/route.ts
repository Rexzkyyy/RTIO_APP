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
    const bypassCookie = process.env.NODE_ENV !== "production"
      ? req.cookies.get("dev-admin-bypass")?.value
      : null;

    if (!session?.user && !bypassCookie) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { barcodeString } = body as { barcodeString: string };

    if (!barcodeString || typeof barcodeString !== "string" || barcodeString.trim() === "") {
      return NextResponse.json({ success: false, message: "Kode QR tidak valid." }, { status: 400 });
    }

    console.log("[SCANNER API] Menerima request barcode:", barcodeString);
    try {
      fs.appendFileSync(
        path.join(process.cwd(), "scanner_log.txt"),
        `[${new Date().toISOString()}] Scanned: "${barcodeString}"\n`
      );
    } catch (e) {
      console.error(e);
    }

    // Cari tiket berdasarkan barcodeString
    const ticket = await prisma.ticket.findUnique({
      where: { barcodeString: barcodeString.trim() },
      include: {
        transaction: {
          include: {
            event: {
              select: { id: true, title: true },
            },
          },
        },
        ticketCategory: {
          select: { name: true, price: true },
        },
      },
    });

    // Tiket tidak ditemukan
    if (!ticket) {
      return NextResponse.json({
        success: false,
        status: "NOT_FOUND",
        message: `Tiket tidak ditemukan (Teks dibaca: "${barcodeString}")`,
      });
    }

    // Cek apakah Admin/Validator punya akses ke Event tiket ini
    // @ts-ignore
    if (session.user.role === "VALIDATOR") {
      const hasAccess = await prisma.adminEventAccess.findUnique({
        where: {
          adminId_eventId: {
            // @ts-ignore
            adminId: session.user.id,
            eventId: ticket.transaction.eventId
          }
        }
      });
      if (!hasAccess) {
        return NextResponse.json({
          success: false,
          status: "FORBIDDEN",
          message: "Kamu tidak memiliki akses untuk men-scan tiket event ini.",
        });
      }
    }

    // --- QUOTA-BASED CHECK-IN LOGIC ---
    // Fetch all tickets in the same transaction
    const allTickets = await prisma.ticket.findMany({
      where: { transactionId: ticket.transactionId },
      orderBy: { id: 'asc' }
    });

    const checkedInTickets = allTickets.filter(t => t.isValidated);
    const checkedInCount = checkedInTickets.length;
    const totalTickets = allTickets.length;
    const uncheckedTicket = allTickets.find(t => !t.isValidated);

    // Jika semua tiket dalam transaksi ini sudah terpakai
    if (!uncheckedTicket) {
      // Format tanggal check-in terakhir
      const lastCheckIn = checkedInTickets[checkedInTickets.length - 1].checkedInAt;
      const formattedDate = lastCheckIn ? new Date(lastCheckIn).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }) : "Tidak diketahui";

      return NextResponse.json({
        success: false,
        status: "ALREADY_SCANNED",
        message: `Kuota habis! Semua tiket (${totalTickets}/${totalTickets}) sudah digunakan (Terakhir pada ${formattedDate}).`,
        ticket: {
          holderName: ticket.holderName || ticket.transaction.buyerName,
          eventTitle: ticket.transaction.event.title,
          category: ticket.ticketCategory.name,
          checkedInAt: lastCheckIn,
        }
      });
    }

    // Transaksi belum diapprove
    if (ticket.transaction.status !== "APPROVED") {
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

    // Update 1 tiket yang belum terpakai menjadi terpakai
    const now = new Date();
    await prisma.ticket.update({
      where: { id: uncheckedTicket.id },
      data: {
        isValidated: true,
        checkedInAt: now
      }
    });

    return NextResponse.json({
      success: true,
      status: "VALID",
      message: `Check-in berhasil! (Kuota terpakai: ${checkedInCount + 1}/${totalTickets})`,
      ticket: {
        id: uncheckedTicket.id,
        holderName: uncheckedTicket.holderName || ticket.transaction.buyerName,
        holderPhone: uncheckedTicket.holderPhone || ticket.transaction.buyerPhone,
        eventTitle: ticket.transaction.event.title,
        category: ticket.ticketCategory.name,
        transactionId: ticket.transaction.id,
        checkedInAt: now
      }
    });
  } catch (error) {
    console.error("[SCANNER API ERROR]", error);
    return NextResponse.json(
      { success: false, status: "ERROR", message: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
