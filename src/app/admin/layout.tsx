import { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

export const metadata = {
  title: "Admin Dashboard - RTIO TIX",
  description: "Sistem Manajemen Event & Tiket Digital",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  
  // Also check dev bypass cookie for E2E testing
  const cookieStore = await cookies();
  const bypassRole = process.env.NODE_ENV !== 'production' ? cookieStore.get('dev-admin-bypass')?.value : null;

  // @ts-ignore
  const isValidator = session?.user?.adminRole === "VALIDATOR" || bypassRole === "VALIDATOR";

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden">
      <Sidebar isValidatorServer={isValidator} />
      {/* On mobile, we add pt-20 for top branding bar (h-20) and pb-16 for bottom navigation (h-16). */}
      <div className="flex-1 flex flex-col min-w-0 pt-20 pb-16 md:pt-0 md:pb-0 h-full">
        {/* Header/Top Navigation - Desktop only */}
        <header className="hidden md:flex shrink-0 h-16 bg-white border-b border-slate-200 items-center justify-between px-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800">Administrator</h2>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-400 tracking-[0.2em]">SUPPORTED BY</span>
            <img src="/images/logo_ruang_tenang.png" alt="Supported by Ruang Tenang" className="h-10 w-auto object-contain" />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 md:p-8 flex-1 overflow-y-auto scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
