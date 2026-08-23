"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { Calendar as CalendarIcon, MapPin, Users, ChevronRight, ArrowLeft, Ticket, Crown, Star, Shield, HelpCircle, Flame } from "lucide-react";
import PublicNavbar from "@/components/PublicNavbar";

// Helper to determine ticket styling dynamically
function getTicketStyle(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('vvip') || lower.includes('vip')) {
    return {
      colors: 'from-purple-600 to-indigo-600',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-700',
      borderClass: 'border-indigo-200 hover:border-indigo-400',
      shadowClass: 'shadow-indigo-900/10 hover:shadow-indigo-900/20',
      icon: <Crown className="w-6 h-6 text-indigo-600" />
    };
  }
  if (lower.includes('gold') || lower.includes('emas')) {
    return {
      colors: 'from-amber-400 to-orange-500',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200 hover:border-amber-400',
      shadowClass: 'shadow-amber-900/10 hover:shadow-amber-900/20',
      icon: <Star className="w-6 h-6 text-amber-600" />
    };
  }
  if (lower.includes('silver') || lower.includes('perak')) {
    return {
      colors: 'from-slate-400 to-slate-500',
      bgClass: 'bg-slate-50',
      textClass: 'text-slate-700',
      borderClass: 'border-slate-200 hover:border-slate-400',
      shadowClass: 'shadow-slate-900/10 hover:shadow-slate-900/20',
      icon: <Shield className="w-6 h-6 text-slate-600" />
    };
  }
  // Default/Reguler
  return {
    colors: 'from-emerald-400 to-teal-500',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200 hover:border-emerald-400',
    shadowClass: 'shadow-emerald-900/10 hover:shadow-emerald-900/20',
    icon: <Ticket className="w-6 h-6 text-emerald-600" />
  };
}

export default function EventDetailClient({ event, lowestPrice, navbar, isLoggedIn = false }: { event: any, lowestPrice: number, navbar: React.ReactNode, isLoggedIn?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  
  // Parallax effect for the hero banner
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen relative pb-32 md:pb-12 overflow-x-hidden bg-slate-50">
      
      {/* Gray Grid Pattern Background outside cards */}
      <div className="fixed inset-0 z-0 opacity-50 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
             backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* Aurora Glow Background Effect */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40rem] h-[40rem] rounded-full bg-emerald-400/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-teal-400/10 blur-[100px]" />
      </div>

      {/* Immersive Hero Section */}
      <div className="relative w-full h-[60vh] md:min-h-[75vh] overflow-hidden bg-slate-900 z-10">
        {navbar}
        
        {/* Banner Image with Parallax */}
        <motion.div style={{ y, opacity }} className="absolute inset-0 z-0 bg-slate-900">
          {event.bannerUrl ? (
            <>
              {/* Blurred Background to fill empty spaces */}
              <img src={event.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110" />
              {/* Actual Image without cropping */}
              <img src={event.bannerUrl} alt={event.title} className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-emerald-900 to-slate-900 opacity-80"></div>
          )}
          {/* Smooth Gradient Overlay fading to slate-50 (transparent) */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-900/80 to-transparent"></div>
        </motion.div>

        {/* Hero Content (Title & Info) */}
        <div className="absolute bottom-28 md:bottom-40 left-0 right-0 z-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-2xl"
            >
              {event.title}
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-3 text-sm md:text-base font-semibold text-white"
            >
              <div className="flex items-center bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <CalendarIcon className="w-4 h-4 mr-2 text-emerald-400" />
                {new Date(event.eventDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <MapPin className="w-4 h-4 mr-2 text-emerald-400" />
                {event.location}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6"
            >
               <button 
                  onClick={() => document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' })} 
                  className="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-[0_8px_32px_0_rgba(16,185,129,0.4)] hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.6)] active:scale-95 transition-all flex items-center justify-center w-max"
                >
                  <Ticket className="w-5 h-5 mr-2" />
                  Dapatkan Tiket
               </button>
               
               {/* Social Proof Marketing UI */}
               <div className="flex items-center">
                 <div className="flex -space-x-3 mr-3">
                   <img className="w-9 h-9 rounded-full border-2 border-slate-900 shadow-sm" src="https://i.pravatar.cc/100?img=33" alt="User 1"/>
                   <img className="w-9 h-9 rounded-full border-2 border-slate-900 shadow-sm" src="https://i.pravatar.cc/100?img=47" alt="User 2"/>
                   <img className="w-9 h-9 rounded-full border-2 border-slate-900 shadow-sm" src="https://i.pravatar.cc/100?img=12" alt="User 3"/>
                   <div className="w-9 h-9 rounded-full border-2 border-slate-900 bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center shadow-sm">
                     +
                   </div>
                 </div>
                 <div className="text-white text-xs sm:text-sm drop-shadow-md">
                   <p className="font-bold">Lebih dari <span className="text-yellow-400">500+ orang</span></p>
                   <p className="opacity-80">tertarik dengan event ini 🔥</p>
                 </div>
               </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content Area (Single Column Centered) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-20 -mt-20 md:-mt-24 flex flex-col gap-10">
        
        {/* Top Card: Description & Event Info */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
          {/* Subtle Decorative Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 group-hover:bg-emerald-50/50 transition-colors duration-700"></div>
          
          <div className="flex flex-col gap-8">
            {/* Event Title inside the card */}
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-6 leading-tight tracking-tight">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm md:text-base font-semibold text-slate-600">
                <div className="flex items-center bg-slate-100 px-5 py-2.5 rounded-full border border-slate-200">
                  <CalendarIcon className="w-4 h-4 mr-2 text-emerald-500" />
                  {new Date(event.eventDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center bg-slate-100 px-5 py-2.5 rounded-full border border-slate-200">
                  <MapPin className="w-4 h-4 mr-2 text-emerald-500" />
                  {event.location}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Description */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
                <span className="w-8 h-1 bg-emerald-500 rounded-full mr-4"></span>
                Tentang Event
              </h2>
              <div className="prose prose-slate md:prose-lg max-w-none text-slate-600 leading-relaxed font-medium">
                {event.description.split('\n').map((paragraph: string, i: number) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </motion.div>

            {/* Artists & Sponsors - Seamless List */}
            {(event.artists.length > 0 || event.sponsors.length > 0) && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-slate-100"
              >
                {event.artists.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Lineup & Penampil</h3>
                    <div className="flex flex-wrap gap-3">
                      {event.artists.map((artist: string, idx: number) => (
                        <div key={idx} className="px-5 py-2.5 bg-white text-slate-800 rounded-full text-sm font-bold shadow-sm border border-slate-200 hover:border-emerald-400 transition-colors">
                          {artist}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {event.sponsors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Didukung Oleh</h3>
                    <div className="flex flex-wrap gap-3">
                      {event.sponsors.map((sponsor: string, idx: number) => (
                        <div key={idx} className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-full text-sm font-bold border border-slate-200">
                          {sponsor}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Bottom Section: Compact Tickets Row */}
        <div id="tickets-section" className="w-full pb-8 pt-8 -mt-8 scroll-mt-24">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">Pilih Tiket Anda</h2>
          </div>
          <div className="flex flex-nowrap md:flex-wrap overflow-x-auto md:overflow-x-visible justify-start md:justify-center gap-5 pb-8 snap-x snap-mandatory scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style jsx>{`
              div::-webkit-scrollbar {
                display: none;
              }
            `}</style>
            
            {event.ticketCategories.map((ticket: any, index: number) => {
              const style = getTicketStyle(ticket.name);
              
              const isSoldOut = ticket.quota <= 0;
              const isLowStock = ticket.quota > 0 && ticket.quota <= 5;
              
              // Tentukan best seller (tiket paling murah = paling sering dibeli)
              const cheapestTicketId = [...event.ticketCategories]
                .filter((t: any) => t.quota > 0)
                .sort((a: any, b: any) => a.price - b.price)[0]?.id;
              const isBestSeller = ticket.id === cheapestTicketId && !isSoldOut;
              
              return (
                isSoldOut ? (
                  // Sold-out card — not a Link, disabled appearance
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="w-[80vw] sm:w-[320px] max-w-[320px] flex-none snap-center"
                  >
                    <div className="bg-slate-100 rounded-2xl p-5 border border-slate-200 relative overflow-hidden flex flex-col h-full opacity-70 grayscale cursor-not-allowed">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-300" />
                      <div className="absolute top-0 right-0 bg-slate-700 text-white text-[10px] font-black px-3 py-1.5 rounded-bl-2xl z-10">HABIS TERJUAL</div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="p-2.5 rounded-xl bg-slate-200">{style.icon}</div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md border border-slate-300 bg-slate-200 text-slate-500">0 sisa</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-500 mb-1">{ticket.name}</h3>
                      <div className="text-xl font-black text-slate-500 mb-4">
                        {ticket.price === 0 ? "Gratis" : `Rp ${ticket.price.toLocaleString('id-ID')}`}
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-200">
                        <div className="w-full py-2.5 bg-slate-300 text-slate-500 font-bold rounded-xl flex items-center justify-center text-sm">
                          Tiket Habis
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                <Link 
                  href={`/event/${event.slug}/register?ticketId=${ticket.id}`} 
                  key={ticket.id} 
                  onClick={(e) => {
                    if (!isLoggedIn) {
                      e.preventDefault();
                      setPendingUrl(`/event/${event.slug}/register?ticketId=${ticket.id}`);
                      setShowLoginModal(true);
                    }
                  }}
                  className="block group/ticket outline-none w-[80vw] sm:w-[320px] max-w-[320px] flex-none snap-center"
                >
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                    className={`bg-white rounded-2xl p-5 shadow-lg ${style.shadowClass} border ${isLowStock ? 'border-orange-400' : style.borderClass} relative overflow-hidden flex flex-col h-full transition-all duration-300`}
                  >
                    {isBestSeller && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-bl-2xl z-10 flex items-center shadow-md">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                          <Flame className="w-3 h-3 mr-1 text-yellow-200 fill-yellow-200" />
                        </motion.div>
                        PALING LARIS
                      </div>
                    )}
                    
                    {/* Low Stock Warning Badge */}
                    {isLowStock && !isBestSeller && (
                      <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-bl-2xl z-10 flex items-center">
                        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="mr-1">⚡</motion.span>
                        HAMPIR HABIS
                      </div>
                    )}

                    {/* Top Premium Glow Border */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.colors}`}></div>
                    
                    {/* Progress Bar (Urgency) */}
                    {ticket.initialQuota && ticket.initialQuota > 0 ? (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className={`p-2.5 rounded-xl ${style.bgClass}`}>
                            {style.icon}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isLowStock ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'
                          }`}>
                            Sisa {ticket.quota}
                          </span>
                        </div>
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Terjual</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {Math.round(((ticket.initialQuota - ticket.quota) / ticket.initialQuota) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.max(0, Math.min(100, ((ticket.initialQuota - ticket.quota) / ticket.initialQuota) * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mb-4">
                        <div className={`p-2.5 rounded-xl ${style.bgClass}`}>
                          {style.icon}
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                          isLowStock 
                            ? 'border-orange-300 bg-orange-50 text-orange-600'
                            : `${style.borderClass} ${style.bgClass} ${style.textClass}`
                        }`}>
                          {ticket.quota} sisa
                        </span>
                      </div>
                    )}
                    
                    <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover/ticket:text-emerald-600 transition-colors">{ticket.name}</h3>
                    
                    {/* Price with Anchoring (Harga Coret) */}
                    <div className="mb-4">
                      {ticket.originalPrice && ticket.originalPrice > ticket.price && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-slate-400 line-through decoration-slate-400">
                            Rp {ticket.originalPrice.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                            HEMAT {Math.round(((ticket.originalPrice - ticket.price) / ticket.originalPrice) * 100)}%
                          </span>
                        </div>
                      )}
                      <div className="text-xl font-black text-slate-800">
                        {ticket.price === 0 ? "Gratis" : `Rp ${ticket.price.toLocaleString('id-ID')}`}
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100">
                      <div className={`w-full py-2.5 bg-gradient-to-r ${style.colors} text-white font-bold rounded-xl shadow-md group-hover/ticket:shadow-lg transition-all flex items-center justify-center text-sm`}>
                        <Ticket className="w-4 h-4 mr-2" />
                        Beli Tiket
                      </div>
                    </div>
                  </motion.div>
                </Link>
                )
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center">
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Harga mulai</p>
          <p className="text-lg font-black text-emerald-600">
            {lowestPrice === 0 ? "Gratis" : `Rp ${lowestPrice.toLocaleString('id-ID')}`}
          </p>
        </div>
        <Link 
          href={`/event/${event.slug}/register`}
          onClick={(e) => {
            if (!isLoggedIn) {
              e.preventDefault();
              setPendingUrl(`/event/${event.slug}/register`);
              setShowLoginModal(true);
            }
          }}
          className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md flex items-center"
        >
          <Ticket className="w-4 h-4 mr-2" />
          Pilih Tiket
        </Link>
      </div>

      {/* Login Recommendation Modal */}
      {showLoginModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full relative z-10 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
              🥺
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Yuk, Login Dulu!</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
              Untuk pengalaman terbaik dan agar tiketmu tersimpan otomatis, kami sangat merekomendasikan kamu untuk login. Tenang, datamu 100% aman bersama kami! 🔒✨
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => { signIn("google", { callbackUrl: pendingUrl }) }} 
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center"
              >
                 Login Sekarang 🚀
              </button>
              <Link 
                href={pendingUrl} 
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all"
              >
                Nanti Saja 😅
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
