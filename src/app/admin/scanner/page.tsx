import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ScannerClient } from "./ScannerClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scanner Tiket — Admin RTIO TIX",
  description: "Scan QR code tiket peserta untuk check-in event secara cepat.",
};

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const session = await getServerSession(authOptions);

  // Dev bypass — konsisten dengan pola di admin layout & middleware
  const cookieStore = await cookies();
  const bypassRole = process.env.NODE_ENV !== "production"
    ? cookieStore.get("dev-admin-bypass")?.value
    : null;

  // Redirect ke login hanya jika tidak ada session DAN tidak ada bypass cookie
  if (!session?.user && !bypassRole) {
    redirect("/login");
  }

  // @ts-ignore
  const adminRole = (session?.user?.adminRole ?? (bypassRole === "VALIDATOR" ? "VALIDATOR" : "SUPER_ADMIN")) as string;

  return (
    <div className="-m-4 md:-m-8 min-h-[calc(100%+2rem)] md:min-h-[calc(100%+4rem)]">
      <ScannerClient adminRole={adminRole} />
    </div>
  );
}
