import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getToken, decode } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    let isAdmin = false;
    let isValidator = false;
    let userEmail: string | null = null;

    // 1. Dev bypass in non-production
    if (process.env.NODE_ENV !== "production") {
      const bypass = req.cookies.get("dev-admin-bypass")?.value;
      if (bypass) {
        if (bypass === "VALIDATOR") isValidator = true;
        isAdmin = true;
      }
    }

    // 2. NextAuth getServerSession
    if (!isAdmin) {
      try {
        const session = await getServerSession(authOptions);
        if (session?.user) {
          userEmail = session.user.email || null;
          // @ts-ignore
          if (session.user.adminRole === "VALIDATOR") isValidator = true;
          // @ts-ignore
          if (session.user.isAdmin || session.user.adminRole) isAdmin = true;
        }
      } catch (err) {
        console.warn("[API status] getServerSession warning:", err);
      }
    }

    // 3. Fallback JWT getToken
    if (!isAdmin) {
      try {
        const token = await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "",
        });
        if (token) {
          userEmail = (token.email as string) || null;
          if (token.adminRole === "VALIDATOR") isValidator = true;
          if (token.isAdmin || token.adminRole) isAdmin = true;
        }
      } catch (err) {
        console.warn("[API status] getToken warning:", err);
      }
    }

    // 4. Fallback decode raw session cookie directly
    if (!isAdmin) {
      const sessionToken =
        req.cookies.get("__Secure-next-auth.session-token")?.value ||
        req.cookies.get("next-auth.session-token")?.value;

      if (sessionToken) {
        try {
          const decoded = await decode({
            token: sessionToken,
            secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "",
          });
          if (decoded) {
            userEmail = (decoded.email as string) || null;
            if (decoded.adminRole === "VALIDATOR") isValidator = true;
            if (decoded.isAdmin || decoded.adminRole) isAdmin = true;
          }
        } catch (e) {
          console.error("[API status] Decode cookie error:", e);
        }
      }
    }

    // 5. Final fallback: lookup admin in DB by email
    if (!isAdmin && userEmail) {
      const admin = await prisma.admin.findFirst({
        where: { email: { equals: userEmail.trim().toLowerCase(), mode: "insensitive" } },
      });
      if (admin) {
        if (admin.role === "VALIDATOR") isValidator = true;
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Akses tidak sah: Sesi Anda telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    if (isValidator) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak: Verifikator hanya memiliki hak akses Lihat Data (View Only)." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, status } = body as { id?: string; status?: "APPROVED" | "REJECTED" };

    if (!id || !status || (status !== "APPROVED" && status !== "REJECTED")) {
      return NextResponse.json(
        { success: false, error: "Parameter id dan status ('APPROVED' | 'REJECTED') wajib disertakan." },
        { status: 400 }
      );
    }

    if (status === "REJECTED") {
      const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.transaction.update({
        where: { id },
        data: { status, expiresAt: newExpiresAt },
      });
    } else {
      await prisma.transaction.update({
        where: { id },
        data: { status, expiresAt: null },
      });
    }

    revalidatePath("/admin/transactions");

    return NextResponse.json({
      success: true,
      message: `Status transaksi berhasil diubah menjadi ${status}.`,
    });
  } catch (err: any) {
    console.error("[API status error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Gagal memperbarui status transaksi." },
      { status: 500 }
    );
  }
}

