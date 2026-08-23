import Link from "next/link";
import Image from "next/image";
import { Ticket } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import NotificationBell from "@/components/NotificationBell";

export default async function PublicNavbar() {
  const session = await getServerSession(authOptions);
  
  let userTransactions: any[] = [];
  if (session?.user?.email) {
    userTransactions = await prisma.transaction.findMany({
      where: { buyerEmail: session.user.email },
      select: {
        id: true,
        status: true,
        paymentProofUrl: true,
        event: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Tightly packed container for mobile to maximize logo space without overflowing */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 h-20 sm:h-24 flex items-center justify-between overflow-hidden">
        
        {/* Left Side (Logos) */}
        <div className="flex items-center gap-1.5 sm:gap-6 flex-shrink-0">
          
          <Link href="/" className="flex items-center group relative h-14 sm:h-[70px] w-32 sm:w-[160px]">
            <Image 
              src="/logo.png" 
              alt="RTIO TIX Logo" 
              fill
              className="object-contain mix-blend-multiply transition-transform group-hover:scale-105" 
              priority
            />
          </Link>
          
          <div className="h-6 sm:h-8 w-px bg-slate-200 mx-0.5 sm:mx-1 hidden sm:block"></div>
          
          <div className="flex items-center gap-1 sm:gap-3">
            <span className="text-[6px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Sponsored By</span>
            <div className="relative h-8 sm:h-12 w-20 sm:w-28">
              <Image 
                src="/images/logo_ruang_tenang.png" 
                alt="Ruang Tenang" 
                fill 
                className="object-contain"
                sizes="(max-width: 768px) 80px, 112px" 
              />
            </div>
          </div>
          
        </div>

        {/* Right Side (Actions) */}
        <div className="flex items-center gap-1.5 sm:gap-6 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/my-tickets" className="text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors">
              Tiket Saya
            </Link>
            <Link href="/profile" className="text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors">
              Profil
            </Link>
            <div className="h-4 w-px bg-slate-300"></div>
          </div>
          
          <NotificationBell transactions={userTransactions} />
          
          <Link href="/admin/events" className="text-[10px] sm:text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors bg-slate-100 hover:bg-teal-50 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full whitespace-nowrap">
            Admin
          </Link>
        </div>
        
      </div>
    </header>
  );
}
