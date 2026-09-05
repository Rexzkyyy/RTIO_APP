"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Calendar as CalendarIcon, MapPin, Users, ChevronRight, ArrowLeft, Ticket, Crown, Star, Shield, HelpCircle, Flame, CheckCircle2, Rocket, Zap, Target, Award, Sparkles, Building2, Briefcase, Globe, MessageCircle, Loader2 } from "lucide-react";

const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
  </svg>
);

// Dynamic Themes for Artists
const artistThemes = [
  { icon: Star, colors: 'from-primary-400 to-secondary-500', border: 'border-primary-200', text: 'text-primary-700' },
  { icon: Crown, colors: 'from-amber-400 to-orange-500', border: 'border-amber-200', text: 'text-amber-700' },
  { icon: Sparkles, colors: 'from-purple-400 to-indigo-500', border: 'border-purple-200', text: 'text-purple-700' },
  { icon: Flame, colors: 'from-rose-400 to-red-500', border: 'border-rose-200', text: 'text-rose-700' },
  { icon: Users, colors: 'from-cyan-400 to-blue-500', border: 'border-cyan-200', text: 'text-cyan-700' },
];

// Dynamic Themes for Sponsors
const sponsorThemes = [
  { icon: Building2, text: 'text-blue-700', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', border: 'border-blue-200', glow: 'from-blue-100', shadow: 'shadow-blue-900/10' },
  { icon: Rocket, text: 'text-orange-700', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', border: 'border-orange-200', glow: 'from-orange-100', shadow: 'shadow-orange-900/10' },
  { icon: Target, text: 'text-primary-700', iconBg: 'bg-primary-100', iconColor: 'text-primary-600', border: 'border-primary-200', glow: 'from-primary-100', shadow: 'shadow-primary-900/10' },
  { icon: Award, text: 'text-purple-700', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', border: 'border-purple-200', glow: 'from-purple-100', shadow: 'shadow-purple-900/10' },
  { icon: Zap, text: 'text-amber-700', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', border: 'border-amber-200', glow: 'from-amber-100', shadow: 'shadow-amber-900/10' },
  { icon: Globe, text: 'text-cyan-700', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', border: 'border-cyan-200', glow: 'from-cyan-100', shadow: 'shadow-cyan-900/10' },
  { icon: Briefcase, text: 'text-rose-700', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', border: 'border-rose-200', glow: 'from-rose-100', shadow: 'shadow-rose-900/10' },
];

// Helper to determine ticket styling dynamically
function getTicketStyle(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('diamond')) {
    return {
      colors: 'from-blue-400 to-cyan-500',
      bgClass: 'bg-cyan-50',
      textClass: 'text-cyan-700',
      borderClass: 'border-cyan-200 hover:border-cyan-400',
      shadowClass: 'shadow-cyan-900/10 hover:shadow-cyan-900/20',
      icon: <Award className="w-6 h-6 text-cyan-600" />,
      checkColor: 'text-cyan-500'
    };
  }
  if (lower.includes('vvip') || lower.includes('vip')) {
    return {
      colors: 'from-purple-600 to-indigo-600',
      bgClass: 'bg-indigo-50',
      textClass: 'text-indigo-700',
      borderClass: 'border-indigo-200 hover:border-indigo-400',
      shadowClass: 'shadow-indigo-900/10 hover:shadow-indigo-900/20',
      icon: <Crown className="w-6 h-6 text-indigo-600" />,
      checkColor: 'text-indigo-500'
    };
  }
  if (lower.includes('gold') || lower.includes('emas')) {
    return {
      colors: 'from-amber-400 to-orange-500',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200 hover:border-amber-400',
      shadowClass: 'shadow-amber-900/10 hover:shadow-amber-900/20',
      icon: <Star className="w-6 h-6 text-amber-600" />,
      checkColor: 'text-amber-500'
    };
  }
  if (lower.includes('silver') || lower.includes('perak')) {
    return {
      colors: 'from-slate-700 to-slate-900',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-800',
      borderClass: 'border-slate-300 hover:border-slate-500',
      shadowClass: 'shadow-slate-900/20 hover:shadow-slate-900/30',
      icon: <Shield className="w-6 h-6 text-slate-800" />,
      checkColor: 'text-slate-500'
    };
  }
  // Default/Reguler
  return {
    colors: 'from-primary-400 to-secondary-500',
    bgClass: 'bg-primary-50',
    textClass: 'text-primary-700',
    borderClass: 'border-primary-200 hover:border-primary-400',
    shadowClass: 'shadow-primary-900/10 hover:shadow-primary-900/20',
    icon: <Ticket className="w-6 h-6 text-primary-600" />,
    checkColor: 'text-primary-500'
  };
}

// Simple CSS-based fade-in-up animation hook using IntersectionObserver
function useFadeInRef<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function EventDetailClient({ event, lowestPrice, navbar, isLoggedIn = false }: { event: any, lowestPrice: number, navbar: React.ReactNode, isLoggedIn?: boolean }) {
  const config = event.ticketConfig || {};
  const themeClass = config.themeName === 'pink' ? 'theme-pink' : 'theme-primary';

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [selectedTicketBenefits, setSelectedTicketBenefits] = useState<any>(null);

  // Refs for fade-in animations
  const descRef = useFadeInRef<HTMLDivElement>();
  const artistsRef = useFadeInRef<HTMLDivElement>();

  return (
    <div className={`min-h-screen relative pb-32 md:pb-12 overflow-x-hidden bg-slate-50 ${themeClass}`}>
      
      {/* Gray Grid Pattern Background outside cards */}
      <div className="fixed inset-0 z-0 opacity-50 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)',
             backgroundSize: '40px 40px' 
           }}>
      </div>

      {/* Aurora Glow Background Effect (Optimized for Mobile GPU) */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[150vw] md:w-[60vw] h-[60vh] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-400/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 w-[150vw] md:w-[60vw] h-[60vh] bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-secondary-400/20 via-transparent to-transparent" />
      </div>

      {/* Immersive Hero Section */}
      <div className="relative w-full min-h-[60vh] md:min-h-[75vh] flex flex-col overflow-hidden bg-slate-900 z-10">
        <div className="relative z-50 shrink-0">{navbar}</div>
        
        {/* Banner Image (static, no parallax for performance) */}
        {/* Background Image */}
        <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
          {event.imageUrl || event.bannerUrl ? (
            <Image 
              src={event.imageUrl || event.bannerUrl}
              alt={event.title}
              fill
              className="object-cover object-center"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-primary-900 to-slate-900 opacity-80"></div>
          )}
          {/* Background Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent z-10 pointer-events-none"></div>
        </div>

        {/* Hero Content (Title & Info) */}
        <div className="relative z-10 flex-1 flex flex-col justify-end pb-16 sm:pb-32 pt-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-6 w-full">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tighter animate-fade-in-up py-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 via-white to-secondary-100 drop-shadow-lg">
                {event.title}
              </span>
            </h1>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 text-base md:text-lg font-semibold text-white animate-fade-in-up animation-delay-100">
              <div className="flex items-center w-max bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <CalendarIcon className="w-5 h-5 mr-3 text-primary-400" />
                {new Date(event.eventDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="flex items-center w-max bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
                <MapPin className="w-5 h-5 mr-3 text-primary-400" />
                {event.location}
              </div>
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 animate-fade-in-up animation-delay-200">
               <button 
                  onClick={() => document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' })} 
                  className="px-10 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-lg font-black rounded-2xl shadow-[0_8px_32px_0_rgba(16,185,129,0.4)] hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.6)] active:scale-95 transition-all flex items-center justify-center w-max"
                >
                  <Ticket className="w-6 h-6 mr-3" />
                  Dapatkan Tiket
               </button>
               
               {/* Social Proof Marketing UI */}
               <div className="flex items-center bg-slate-900/40 backdrop-blur-sm p-3 rounded-2xl border border-slate-700/50">
                 <div className="flex -space-x-3 mr-4">
                   <div className="relative w-10 h-10 rounded-full border-2 border-slate-800 shadow-sm overflow-hidden">
                     <Image src="https://i.pravatar.cc/100?img=33" alt="User 1" fill sizes="40px" className="object-cover"/>
                   </div>
                   <div className="relative w-10 h-10 rounded-full border-2 border-slate-800 shadow-sm overflow-hidden">
                     <Image src="https://i.pravatar.cc/100?img=47" alt="User 2" fill sizes="40px" className="object-cover"/>
                   </div>
                   <div className="relative w-10 h-10 rounded-full border-2 border-slate-800 shadow-sm overflow-hidden">
                     <Image src="https://i.pravatar.cc/100?img=12" alt="User 3" fill sizes="40px" className="object-cover"/>
                   </div>
                   <div className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center shadow-sm">
                     +
                   </div>
                 </div>
                 <div className="text-white text-sm sm:text-base drop-shadow-md">
                   <p className="font-bold">Lebih dari <span className="text-yellow-400">500+ orang</span></p>
                   <p className="opacity-80 text-xs sm:text-sm mt-0.5">tertarik dengan event ini 🔥</p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (Single Column Centered) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-20 -mt-20 md:-mt-24 flex flex-col gap-10">
        
        {/* Top Card: Description & Event Info */}
        <div className="bg-white rounded-3xl p-6 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
          {/* Subtle Decorative Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 group-hover:bg-primary-50/50 transition-colors duration-700"></div>
          
          <div className="flex flex-col gap-8">
            {/* Removed duplicated title and badges */}

            {/* Description */}
            <div ref={descRef}>
              <h2 className="text-3xl font-black mb-6 flex items-center">
                <span className="w-8 h-1.5 bg-gradient-to-r from-primary-400 to-secondary-500 rounded-full mr-4 shadow-sm"></span>
                <span className="text-slate-800">Tentang Event</span>
              </h2>
              <div className="prose prose-slate md:prose-lg max-w-none text-slate-700 leading-relaxed font-medium">
                {event.description.split('\n').map((paragraph: string, i: number) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>

              {/* Kontak & Sosial Media */}
              {(event.socialMedias && Array.isArray(event.socialMedias) && event.socialMedias.length > 0) && (
                <div className="mt-8 flex flex-wrap gap-4">
                  {event.socialMedias.map((social: any, idx: number) => {
                    let href = social.link;
                    let display = social.platform;
                    let bgClass = "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
                    let icon = <Globe className="w-5 h-5 mr-2.5 group-hover:scale-110 transition-transform" />;
                    
                    if (social.platform === 'WhatsApp') {
                      href = `https://wa.me/${social.link.replace(/[^0-9]/g, '').replace(/^0/, '62')}`;
                      bgClass = "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm";
                      icon = <MessageCircle className="w-5 h-5 mr-2.5 text-[#25D366] group-hover:scale-110 transition-transform" />;
                      display = "Hubungi Admin (WA)";
                    } else if (social.platform === 'Instagram') {
                      href = social.link.startsWith('http') ? social.link : `https://instagram.com/${social.link.replace('@', '')}`;
                      bgClass = "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100";
                      icon = <InstagramIcon className="w-5 h-5 mr-2.5 group-hover:scale-110 transition-transform" />;
                      display = social.link.startsWith('http') ? 'Instagram' : (social.link.startsWith('@') ? social.link : `@${social.link}`);
                    } else if (social.platform === 'Twitter') {
                      href = social.link.startsWith('http') ? social.link : `https://twitter.com/${social.link.replace('@', '')}`;
                      bgClass = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
                      display = 'Twitter / X';
                    } else if (social.platform === 'Facebook') {
                      href = social.link.startsWith('http') ? social.link : `https://facebook.com/${social.link}`;
                      bgClass = "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100";
                      display = 'Facebook';
                    } else if (social.platform === 'TikTok') {
                      href = social.link.startsWith('http') ? social.link : `https://tiktok.com/@${social.link.replace('@', '')}`;
                      bgClass = "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200";
                      display = 'TikTok';
                    } else {
                      if (!href.startsWith('http')) href = `https://${href}`;
                    }

                    return (
                      <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className={`flex items-center px-5 py-2.5 rounded-xl border hover:shadow-sm transition-all group ${bgClass}`}>
                        {icon}
                        <span className="font-bold text-sm">{display}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Artists & Sponsors - Seamless List */}
            {(event.artists.length > 0 || event.sponsors.length > 0) && (
              <div ref={artistsRef} className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-slate-100">
                {event.artists.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Lineup & Penampil</h3>
                    <div className="flex flex-wrap gap-4">
                      {event.artists.map((artist: string, idx: number) => {
                        const theme = artistThemes[idx % artistThemes.length];
                        const Icon = theme.icon;
                        return (
                          <div key={idx} className={`pr-6 pl-2 py-2 bg-gradient-to-r from-white to-slate-50 rounded-full shadow-sm border ${theme.border} hover:shadow-md transition-all flex items-center cursor-default group`}>
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${theme.colors} text-white flex items-center justify-center mr-3 shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-transform`}>
                              <Icon className="w-4 h-4 fill-white/20" />
                            </div>
                            <span className={`text-sm font-black ${theme.text} transition-colors`}>
                              {artist}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {event.sponsors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Didukung Oleh</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {event.sponsors.map((sponsor: string, idx: number) => {
                        const theme = sponsorThemes[idx % sponsorThemes.length];
                        const Icon = theme.icon;
                        return (
                          <div key={idx} className={`p-4 bg-white rounded-2xl text-center border ${theme.border} shadow-sm hover:shadow-md ${theme.shadow} transition-all flex flex-col items-center justify-center min-h-[90px] group cursor-default relative overflow-hidden`}>
                            <div className={`absolute -right-6 -bottom-6 w-20 h-20 bg-gradient-to-tl ${theme.glow} to-transparent rounded-full opacity-60 group-hover:opacity-100 transition-all duration-500`}></div>
                            
                            <div className={`w-10 h-10 rounded-xl ${theme.iconBg} ${theme.iconColor} flex items-center justify-center mb-3 transition-transform border ${theme.border} z-10 group-hover:scale-110`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-black ${theme.text} relative z-10 leading-snug`}>
                              {sponsor}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Compact Tickets Row */}
        <div id="tickets-section" className="w-full pb-8 pt-8 -mt-8 scroll-mt-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-800 mb-3 drop-shadow-sm">Pilih Tiket Anda</h2>
            <div className="w-20 h-1.5 bg-gradient-to-r from-primary-400 to-secondary-400 mx-auto rounded-full shadow-sm"></div>
          </div>
          <div className="flex flex-nowrap md:flex-wrap overflow-x-auto md:overflow-x-visible justify-start md:justify-center gap-5 pb-8 snap-x snap-mandatory scroll-smooth hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

            
            {event.ticketCategories.map((ticket: any, index: number) => {
              const style = getTicketStyle(ticket.name);
              
              const isSoldOut = ticket.quota <= 0;
              const isLowStock = ticket.quota > 0 && ticket.quota <= 50;
              
              const now = new Date();
              const discountStart = ticket.discountStartDate ? new Date(ticket.discountStartDate) : null;
              const discountEnd = ticket.discountEndDate ? new Date(ticket.discountEndDate) : null;
              const isDiscountActive = ticket.hasDiscount && ticket.discountPrice != null && 
                (!discountStart || now >= discountStart) && 
                (!discountEnd || now <= discountEnd) &&
                (ticket.discountQuota === null || ticket.discountQuota > 0);

              const activePrice = isDiscountActive ? ticket.discountPrice : ticket.price;
              const displayOriginalPrice = isDiscountActive ? ticket.price : ticket.originalPrice;
              
              // Tentukan best seller (tiket paling murah = paling sering dibeli)
              const cheapestTicketId = [...event.ticketCategories]
                .filter((t: any) => t.quota > 0)
                .sort((a: any, b: any) => {
                  const aActivePrice = a.hasDiscount && a.discountPrice != null && (!a.discountStartDate || now >= new Date(a.discountStartDate)) && (!a.discountEndDate || now <= new Date(a.discountEndDate)) && (a.discountQuota === null || a.discountQuota > 0) ? a.discountPrice : a.price;
                  const bActivePrice = b.hasDiscount && b.discountPrice != null && (!b.discountStartDate || now >= new Date(b.discountStartDate)) && (!b.discountEndDate || now <= new Date(b.discountEndDate)) && (b.discountQuota === null || b.discountQuota > 0) ? b.discountPrice : b.price;
                  return aActivePrice - bActivePrice;
                })[0]?.id;
              const isBestSeller = ticket.id === cheapestTicketId && !isSoldOut;
              
              if (isSoldOut) {
                return (
                  <div key={ticket.id} className="block shrink-0 w-[310px] sm:w-[340px] snap-center opacity-60 grayscale cursor-not-allowed">
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 relative overflow-hidden flex flex-col h-full">
                      <div className="absolute top-0 right-0 bg-slate-700 text-white text-[10px] font-black px-3 py-1.5 rounded-bl-2xl z-10">HABIS TERJUAL</div>
                      <div className="flex justify-between items-center mb-4">
                        <div className="p-2.5 rounded-xl bg-slate-200">{style.icon}</div>
                        <span className="text-sm font-bold px-2.5 py-1 rounded-md border border-slate-300 bg-slate-200 text-slate-500">Habis</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-500 mb-1">{ticket.name}</h3>
                      <div className="text-2xl font-black text-slate-500 mb-4">
                        {activePrice === 0 ? "Gratis" : `Rp ${activePrice.toLocaleString('id-ID')}`}
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-200">
                        <div className="w-full py-3 bg-slate-300 text-slate-500 font-bold rounded-xl flex items-center justify-center text-base">
                          Tiket Habis
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
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
                  className="block shrink-0 w-[310px] sm:w-[340px] snap-center group/ticket"
                >
                  <div className={`bg-white rounded-2xl p-5 sm:p-6 shadow-lg ${style.shadowClass} border ${isLowStock ? 'border-orange-400' : style.borderClass} relative overflow-hidden flex flex-col h-full transition-all duration-300 hover:-translate-y-1`}>
                    {isBestSeller && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[11px] font-black px-3 py-1.5 rounded-bl-2xl z-10 flex items-center shadow-md">
                        <span className="animate-pulse mr-1">🔥</span>
                        PALING LARIS
                      </div>
                    )}
                    
                    {isLowStock && !isBestSeller && (
                      <div className="absolute top-0 right-0 bg-orange-500 text-white text-[11px] font-black px-3 py-1.5 rounded-bl-2xl z-10 flex items-center">
                        <span className="animate-pulse mr-1">⚡</span>
                        HAMPIR HABIS
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-4">
                      <div className={`p-3 rounded-xl ${style.bgClass} border ${style.borderClass} shadow-sm transform group-hover/ticket:scale-110 group-hover/ticket:rotate-3 transition-transform duration-300`}>
                        {style.icon}
                      </div>
                      {isDiscountActive && ticket.discountQuota !== null ? (
                        <span className="text-sm font-black px-3 py-1.5 rounded-md border border-rose-300 bg-rose-50 text-rose-600 animate-pulse shadow-sm">
                          🔥 Sisa Promo: {ticket.discountQuota}
                        </span>
                      ) : isLowStock ? (
                        <span className="text-sm font-black px-3 py-1.5 rounded-md border border-orange-300 bg-orange-50 text-orange-600 animate-pulse shadow-sm">
                          🔥 Sisa {ticket.quota} Kursi!
                        </span>
                      ) : (
                        <span className={`text-sm font-black px-3 py-1.5 rounded-md border ${style.borderClass} ${style.bgClass} ${style.textClass} shadow-sm`}>
                          Sisa {ticket.quota} Tiket
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-1 group-hover/ticket:text-primary-600 transition-colors">{ticket.name}</h3>
                    
                    {/* Benefits - Grid List */}
                    <div className="flex-1">
                      {ticket.hasBenefits && ticket.benefits && ticket.benefits.length > 0 && (
                        <div className="mb-4 mt-2 border-t border-slate-100 pt-4">
                          <div className="grid grid-cols-2 gap-3">
                            {ticket.benefits.map((benefit: string, idx: number) => (
                              <div key={idx} className="flex items-start">
                                <CheckCircle2 className={`w-5 h-5 ${style.checkColor} mr-2 shrink-0 mt-0.5`} />
                                <span className="text-sm font-bold text-slate-700 leading-snug break-words">{benefit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-2">
                      {isDiscountActive && ticket.discountPrice && ticket.discountPrice < ticket.price ? (
                        <div className="text-sm font-medium text-slate-400 line-through mb-0.5">
                          Rp {ticket.price.toLocaleString('id-ID')}
                        </div>
                      ) : null}
                      <div className="text-3xl font-black text-slate-800 tracking-tight">
                        {activePrice === 0 ? "Gratis" : `Rp ${activePrice.toLocaleString('id-ID')}`}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-3">
                      <div className={`w-full py-3 bg-gradient-to-r ${style.colors} text-white rounded-xl shadow-md group-hover/ticket:shadow-lg transition-all flex items-center justify-center text-sm sm:text-base font-bold whitespace-nowrap`}>
                        Amankan Kursi Sekarang <ChevronRight className="w-5 h-5 ml-1" />
                      </div>
                      <p className="text-center text-xs text-slate-500 mt-2 font-medium">Garansi informasi & support 24/7</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center">
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Harga mulai</p>
          <p className="text-lg font-black text-primary-600">
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
          className="px-6 py-3.5 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md flex items-center"
        >
          <Ticket className="w-4 h-4 mr-2" />
          Pilih Tiket
        </Link>
      </div>

      {/* Ticket Benefits Modal */}
      {selectedTicketBenefits && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${themeClass}`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedTicketBenefits(null)}></div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full relative z-10 shadow-2xl flex flex-col items-center">
            <button 
              onClick={() => setSelectedTicketBenefits(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              ✕
            </button>
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
              <Star className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-1 text-center">Benefit Tiket</h3>
            <p className="text-sm font-bold text-amber-600 mb-6 text-center uppercase tracking-widest">{selectedTicketBenefits.name}</p>
            
            <div className="w-full space-y-3 mb-6 max-h-[60vh] overflow-y-auto px-2">
              {selectedTicketBenefits.benefits.map((benefit: string, idx: number) => (
                <div key={idx} className="flex items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-primary-500 mr-3 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-slate-700 leading-snug">{benefit}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setSelectedTicketBenefits(null)}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              Tutup
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Login Recommendation Modal */}
      {showLoginModal && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${themeClass}`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full relative z-10 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-primary-100 text-primary-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner">
              🥺
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Yuk, Login Dulu!</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
              Untuk pengalaman terbaik dan agar tiketmu tersimpan otomatis, kami sangat merekomendasikan kamu untuk login. Tenang, datamu 100% aman bersama kami! 🔒✨
            </p>
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => { signIn("google", { callbackUrl: pendingUrl }) }} 
                className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center"
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

      {/* CSS Animations (replacing framer-motion) */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out both;
        }
        .animation-delay-100 { animation-delay: 100ms; }
        .animation-delay-200 { animation-delay: 200ms; }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

    </div>
  );
}
