"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Calendar, CreditCard, Ticket, LogOut, Users, Menu, ChevronLeft, BarChart, LayoutDashboard, MoreHorizontal } from "lucide-react";
import { signOut } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();
  // For desktop sidebar collapse
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`
        hidden md:flex flex-col fixed top-0 left-0 h-full bg-slate-900 text-slate-300 shadow-2xl border-r border-slate-800 z-50
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className="px-6 flex items-center justify-between border-b border-slate-200 bg-white h-16 relative z-10">
          <div className={`transition-all duration-300 flex items-center ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>
            <img 
              src="/logo.png" 
              alt="RTIO TIX Logo" 
              className="h-[120px] w-auto max-w-none object-contain mix-blend-multiply -ml-4" 
            />
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg shrink-0 relative z-20"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        
        <nav className="mt-6 flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden px-3">
          <Link 
            href="/admin" 
            className={`flex items-center p-3 transition-colors rounded-xl ${
              pathname === '/admin' 
                ? "bg-emerald-500/10 text-emerald-400 font-semibold" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Dashboard"
          >
            <LayoutDashboard className={`w-5 h-5 shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>

          <Link 
            href="/admin/events" 
            className={`flex items-center p-3 transition-colors rounded-xl ${
              pathname.includes('/admin/events') 
                ? "bg-emerald-500/10 text-emerald-400 font-semibold" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Event"
          >
            <Calendar className={`w-5 h-5 shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && <span>Event</span>}
          </Link>

          <Link 
            href="/admin/tickets" 
            className={`flex items-center p-3 transition-colors rounded-xl ${
              pathname.includes('/admin/tickets') 
                ? "bg-emerald-500/10 text-emerald-400 font-semibold" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Desain Tiket"
          >
            <Ticket className={`w-5 h-5 shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && <span>Desain Tiket</span>}
          </Link>

          <Link 
            href="/admin/transactions" 
            className={`flex items-center p-3 transition-colors rounded-xl ${
              pathname.includes('/admin/transactions') 
                ? "bg-emerald-500/10 text-emerald-400 font-semibold" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Validasi Pembayaran"
          >
            <CreditCard className={`w-5 h-5 shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && <span>Validasi Pembayaran</span>}
          </Link>

          <Link 
            href="/admin/users" 
            className={`flex items-center p-3 transition-colors rounded-xl ${
              pathname.includes('/admin/users') 
                ? "bg-emerald-500/10 text-emerald-400 font-semibold" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Kelola User"
          >
            <Users className={`w-5 h-5 shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && <span>Kelola User</span>}
          </Link>

          <Link 
            href="/admin/analytics" 
            className={`flex items-center p-3 transition-colors rounded-xl ${
              pathname.includes('/admin/analytics') 
                ? "bg-emerald-500/10 text-emerald-400 font-semibold" 
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            title="Analisis Penjualan"
          >
            <BarChart className={`w-5 h-5 shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
            {!isCollapsed && <span>Analisis Penjualan</span>}
          </Link>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Keluar"
            className={`flex items-center justify-center w-full p-3 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-xl transition-colors font-medium`}
          >
            <LogOut className={`w-5 h-5 shrink-0 ${isCollapsed ? '' : 'mr-2'}`} />
            {!isCollapsed && <span>Keluar</span>}
          </button>
        </div>
      </div>

      {/* Spacer for desktop layout so content doesn't go under sidebar */}
      <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'} shrink-0`} />

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 w-full h-20 bg-white z-40 flex items-center justify-between px-3 border-b border-slate-200 shadow-sm">
        <img 
          src="/logo.png" 
          alt="RTIO TIX Logo" 
          className="h-[120px] w-auto max-w-none object-contain mix-blend-multiply -ml-4" 
        />
        <div className="flex items-center space-x-1.5 text-slate-500 font-bold uppercase tracking-widest text-[9px]">
          <span>Supported By</span>
          <img 
            src="/images/logo_ruang_tenang.png" 
            alt="Ruang Tenang Logo" 
            className="h-[80px] w-auto object-contain mix-blend-multiply -mr-2"
          />
        </div>
      </div>

      {/* Mobile Bottom Navigation (4 Items) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-white border-t border-slate-200 z-50 flex items-center justify-around pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link 
          href="/admin" 
          className={`flex flex-col items-center justify-center w-1/4 h-full ${
            pathname === '/admin' ? 'text-emerald-600' : 'text-slate-400'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <LayoutDashboard className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Dasbor</span>
        </Link>
        <Link 
          href="/admin/events" 
          className={`flex flex-col items-center justify-center w-1/4 h-full ${
            pathname.includes('/admin/events') && !isMobileMenuOpen ? 'text-emerald-600' : 'text-slate-400'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Event</span>
        </Link>
        <Link 
          href="/admin/transactions" 
          className={`flex flex-col items-center justify-center w-1/4 h-full ${
            pathname.includes('/admin/transactions') && !isMobileMenuOpen ? 'text-emerald-600' : 'text-slate-400'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <CreditCard className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Validasi</span>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center w-1/4 h-full ${
            isMobileMenuOpen ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Lainnya</span>
        </button>
      </div>

      {/* Mobile "More" Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div 
            className="absolute bottom-16 left-0 w-full bg-white rounded-t-3xl shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] overflow-hidden transition-transform animate-in slide-in-from-bottom-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 p-6 pt-4 pb-8">
              <Link 
                href="/admin/tickets" 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pathname.includes('/admin/tickets') ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  <Ticket className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center">Desain<br/>Tiket</span>
              </Link>
              
              <Link 
                href="/admin/users" 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pathname.includes('/admin/users') ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center">Kelola<br/>User</span>
              </Link>

              <Link 
                href="/admin/analytics" 
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pathname.includes('/admin/analytics') ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  <BarChart className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center">Analisis<br/>Penjualan</span>
              </Link>
            </div>
            
            <div className="px-6 pb-6 border-t border-slate-100 pt-6">
              <button 
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 font-bold rounded-xl active:scale-95 transition-transform"
              >
                <LogOut className="w-5 h-5" />
                Keluar Aplikasi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
