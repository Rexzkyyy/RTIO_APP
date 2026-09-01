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

    // Validasi akses validator — hanya boleh scan tiket dari event yang ditugaskan
    // @ts-ignore
    const adminId = session?.user?.adminId;
    // @ts-ignore
    const isValidator = session?.user?.adminRole === "VALIDATOR";

    if (isValidator && adminId) {
      const access = await prisma.adminEventAccess.findFirst({
        where: {
          adminId,
          eventId: ticket.transaction.event.id,
        },
      });
      if (!access) {
        return NextResponse.json({
          success: false,
          status: "ACCESS_DENIED",
          message: "Kamu tidak memiliki akses untuk event ini.",
        });
      }
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

    // Tiket sudah di-scan sebelumnya
    if (ticket.isValidated) {
      return NextResponse.json({
        success: false,
        status: "ALREADY_CHECKED_IN",
        message: "Tiket ini sudah digunakan untuk masuk!",
        ticket: {
          holderName: ticket.holderName || ticket.transaction.buyerName,
          eventTitle: ticket.transaction.event.title,
          category: ticket.ticketCategory.name,
          checkedInAt: ticket.checkedInAt,
        },
      });
    }

    // ✅ Tiket valid — lakukan check-in
    const now = new Date();
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        isValidated: true,
        checkedInAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      status: "VALID",
      message: "Check-in berhasil! Selamat datang 🎉",
      ticket: {
        id: ticket.id,
        holderName: ticket.holderName || ticket.transaction.buyerName,
        holderPhone: ticket.holderPhone || ticket.transaction.buyerPhone,
        eventTitle: ticket.transaction.event.title,
        category: ticket.ticketCategory.name,
        checkedInAt: now,
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
