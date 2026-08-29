import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

export default function PublicNavbar() {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      {/* Tightly packed container for mobile to maximize logo space without overflowing */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Left Side (Logos) */}
        <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
          
          <Link href="/" className="flex items-center flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo.png" 
              alt="RTIO TIX Logo" 
              className="w-[120px] sm:w-[150px] h-auto max-h-16 object-contain mix-blend-multiply transition-transform group-hover:scale-105" 
            />
          </Link>
          
          <div className="h-6 sm:h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">Sponsored By</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/images/logo_ruang_tenang.png" 
              alt="Ruang Tenang" 
              className="w-[80px] sm:w-[110px] h-auto max-h-12 object-contain"
            />
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
          
          <NotificationBell />
          
          <Link href="/admin/events" className="text-[10px] sm:text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors bg-slate-100 hover:bg-teal-50 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full whitespace-nowrap">
            Admin
          </Link>
        </div>
        
      </div>
    </header>
  );
}
