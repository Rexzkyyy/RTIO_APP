import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ScannerClient } from "./ScannerClient";
import { Metadata } from "next";
import prisma from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Scanner Tiket — Admin RTIO TIX",
  description: "Scan QR code tiket peserta atau cari nama peserta untuk check-in event secara cepat.",
};

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const session = await getServerSession(authOptions);

  // Dev bypass — konsisten dengan pola di admin layout & middleware
  const cookieStore = await cookies();
  const bypassRole =
    process.env.NODE_ENV !== "production"
      ? cookieStore.get("dev-admin-bypass")?.value
      : null;

  // Redirect ke login hanya jika tidak ada session DAN tidak ada bypass cookie
  if (!session?.user && !bypassRole) {
    redirect("/login");
  }

  const user = session?.user as
    | { id?: string; adminRole?: string; adminId?: string }
    | undefined;
  const adminRole =
    user?.adminRole ?? (bypassRole === "VALIDATOR" ? "VALIDATOR" : "SUPER_ADMIN");
  const adminId = user?.adminId ?? user?.id;

  let events: { id: string; title: string }[] = [];
  try {
    if (adminRole === "VALIDATOR" && adminId) {
      const accesses = await prisma.adminEventAccess.findMany({
        where: { adminId },
        include: { event: { select: { id: true, title: true, isActive: true } } },
      });
      events = accesses.map((a) => a.event).filter((e) => e.isActive);
    } else {
      events = await prisma.event.findMany({
        where: { isActive: true },
        orderBy: { eventDate: "desc" },
        select: { id: true, title: true },
      });
    }
  } catch (error) {
    console.error("Error loading events for scanner page:", error);
  }

  return (
    <div className="-m-4 md:-m-8 min-h-[calc(100%+2rem)] md:min-h-[calc(100%+4rem)]">
      <ScannerClient adminRole={adminRole} initialEvents={events} />
    </div>
  );
}
