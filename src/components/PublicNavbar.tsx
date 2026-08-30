import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { Ticket, User } from "lucide-react";

export default function PublicNavbar() {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Tightly packed container for mobile to maximize logo space without overflowing */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        
        {/* Left Side (Logos) */}
        <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
          <Link href="/" className="flex items-center flex-shrink-0 w-[100px] sm:w-[130px] h-10 sm:h-14 relative group mr-2 sm:mr-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="RTIO TIX Logo" 
              className="absolute top-1/2 left-0 -translate-y-1/2 w-[120px] sm:w-[170px] max-w-none h-auto mix-blend-multiply transition-transform group-hover:scale-105" 
            />
          </Link>
          
          <div className="h-6 sm:h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Sponsored By</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/images/logo_ruang_tenang.png" 
              alt="Ruang Tenang" 
              className="w-[100px] sm:w-[150px] h-auto max-h-12 sm:max-h-14 object-contain mix-blend-multiply"
            />
          </div>
          
        </div>

        {/* Right Side (Actions) */}
        <div className="flex items-center gap-1.5 sm:gap-6 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/my-tickets" className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors">
              <Ticket className="w-4 h-4" />
              Tiket Saya
            </Link>
            <Link href="/profile" className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors">
              <User className="w-4 h-4" />
              Profil
            </Link>
            <div className="h-4 w-px bg-slate-300"></div>
          </div>
          
          <NotificationBell />
          
          <Link href="/admin/events" className="text-[10px] sm:text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors bg-slate-100 hover:bg-teal-50 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full whitespace-nowrap">
            Admin
          </Link>
        </div>
        
      </div>
    </header>
  );
}
