"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, Ticket, ChevronRight, X } from "lucide-react";
import Link from "next/link";

type Transaction = {
  id: string;
  status: string;
  paymentProofUrl: string | null;
  event: {
    title: string;
  };
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch transactions on-demand (only when bell is clicked)
  const fetchNotifications = useCallback(async () => {
    if (hasFetched) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [hasFetched]);

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) fetchNotifications();
  };

  const unreadCount = transactions.filter(t => t.status === "PENDING").length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleToggle}
        className="relative p-2 text-slate-500 hover:text-teal-600 transition-colors group focus:outline-none"
      >
        {unreadCount > 0 && (
          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white z-10 flex items-center justify-center">
            <span className="sr-only">Ada notifikasi baru</span>
          </div>
        )}
        <Bell className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${unreadCount > 0 && !isOpen ? 'animate-[swing_2s_ease-in-out_infinite] origin-top' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed left-4 right-4 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-96 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-800">Notifikasi Pesanan</h3>
              <p className="text-xs text-slate-500">
                {isLoading ? "Memuat..." : `Anda memiliki ${transactions.length} pesanan tiket.`}
              </p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-2"></div>
                Memuat notifikasi...
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm flex flex-col items-center">
                <Ticket className="w-8 h-8 text-slate-300 mb-2" />
                Belum ada pesanan tiket.
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {transactions.map(tx => {
                  const targetUrl = `/public/${tx.id}/${tx.status === "APPROVED" ? "ticket" : (tx.paymentProofUrl ? "verify" : "pay")}`;
                  
                  return (
                    <Link 
                      key={tx.id} 
                      href={targetUrl}
                      onClick={() => setIsOpen(false)}
                      className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                    >
                      <div className={`p-2 rounded-full flex-shrink-0 mt-1 ${tx.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : tx.status === 'PENDING' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                        <Ticket className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-teal-600 transition-colors">{tx.event.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {tx.status === "APPROVED" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">AKTIF</span>
                          ) : tx.status === "PENDING" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md">MENUNGGU</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-md">DITOLAK</span>
                          )}
                          <span className="text-xs text-slate-400 font-mono">#{tx.id.split('-')[0]}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 mt-2 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
          
          {transactions.length > 0 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <Link href="/my-tickets" className="text-xs font-bold text-teal-600 hover:text-teal-700">Lihat Semua Tiket</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
