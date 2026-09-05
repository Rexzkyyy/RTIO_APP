"use client";

import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Download, Image as ImageIcon, CheckCircle2, Info, User, Tag, Ticket as TicketIcon, Calendar, MapPin, Mic, HeartHandshake, Globe } from "lucide-react";

type TicketData = {
  barcodeString: string;
  transaction: {
    id: string;
    buyerName: string;
    totalTickets: number;
    status: string;
    totalPrice: number;
  };
  event: {
    title: string;
    eventDate: Date | string;
    location: string;
    bannerUrl: string | null;
    ticketDesignUrl: string | null;
    description: string;
    artists: string[];
    sponsors: string[];
    ticketConfig?: any;
  };
  ticketCategoryName: string;
};

export default function TicketCard({ data, isPreview = false, forceMobile = false }: { data: TicketData, isPreview?: boolean, forceMobile?: boolean }) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadAsImage = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `Tiket-${data.event.title}-${data.transaction.buyerName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAsPDF = async () => {
    if (!ticketRef.current) return;
    setIsDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const width  = ticketRef.current.offsetWidth  * 2;
      const height = ticketRef.current.offsetHeight * 2;
      const orientation = width > height ? 'landscape' : 'portrait';

      const pdf = new jsPDF({ orientation, unit: 'px', format: [width, height] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save(`Tiket-${data.event.title}-${data.transaction.buyerName}.pdf`);
    } catch (err) {
      console.error('PDF download failed', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const isApproved = data.transaction.status === "APPROVED" || data.transaction.totalPrice === 0;

  const config = data.event.ticketConfig || {};
  const primaryColor = config.primaryColor || '#10b981'; // emerald-500
  const accentColor = config.accentColor || '#34d399'; // emerald-400
  const bgColor = config.bgColor || '#ffffff';
  const textColor = config.textColor || '#0f172a'; // slate-900
  
  const borderRadius = config.borderRadius || 'rounded-[2rem]';
  const fontFamily = config.fontFamily || 'font-sans';

  const getPatternStyle = (pattern: string) => {
    switch(pattern) {
      case 'cubes': return `url('https://www.transparenttextures.com/patterns/cubes.png')`;
      case 'stardust': return `url('https://www.transparenttextures.com/patterns/stardust.png')`;
      case 'diagmonds': return `url('https://www.transparenttextures.com/patterns/diagmonds-light.png')`;
      default: return 'none';
    }
  };

  const getCategoryBadgeClass = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('diamond')) return 'bg-indigo-600 text-white shadow-indigo-600/20';
    if (lowerName.includes('gold')) return 'bg-amber-400 text-amber-950 shadow-amber-400/20';
    if (lowerName.includes('silver')) return 'bg-slate-300 text-slate-800 shadow-slate-300/20';
    if (lowerName.includes('vip')) return 'bg-rose-600 text-white shadow-rose-600/20';
    if (lowerName.includes('presale') || lowerName.includes('pre-sale') || lowerName.includes('early')) return 'bg-teal-500 text-white shadow-teal-500/20';
    if (lowerName.includes('normal') || lowerName.includes('regular')) return 'bg-blue-500 text-white shadow-blue-500/20';
    return 'bg-slate-800 text-white shadow-slate-800/20'; // default
  };

  return (
    <div className={`w-full flex flex-col items-center gap-6 ${fontFamily}`}>
      {/* Ticket Wrapper */}
      <div 
        ref={ticketRef} 
        className={`w-full flex flex-col ${forceMobile ? '' : 'md:flex-row'} shadow-2xl shadow-slate-900/5 ${borderRadius} overflow-hidden relative border border-slate-200`}
        style={{ backgroundColor: bgColor }}
      >
        {/* Accent Strip at Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 z-10" style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor}, ${primaryColor})` }}></div>

        {/* Left Side: Poster (Narrower) */}
        <div className={`w-full ${forceMobile ? 'min-h-[280px]' : 'md:w-[28%] md:min-h-full'} relative min-h-[280px] flex-shrink-0 bg-slate-900 overflow-hidden`}>
          {(data.event.ticketDesignUrl || data.event.bannerUrl) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={(data.event.ticketDesignUrl || data.event.bannerUrl) as string} 
              alt="Desain Tiket" 
              className="absolute inset-0 w-full h-full object-cover" 
              style={{ objectPosition: `${config.imagePositionX ?? 50}% ${config.imagePositionY ?? 50}%` }}
            />
          ) : (
            <div className="absolute inset-0 opacity-80" style={{ background: `linear-gradient(to top right, ${primaryColor}, ${accentColor})` }}></div>
          )}
        </div>

        {/* Physical Ticket Perforation Line & Notches (Desktop Only) */}
        {!forceMobile && (
          <div className="hidden md:flex flex-col justify-between w-0 relative border-l-[3px] border-dashed border-slate-300/50 z-20">
            {/* Top Notch */}
            <div className="w-10 h-10 rounded-full absolute -top-5 -left-5 shadow-inner" style={{ backgroundColor: '#f8fafc', boxShadow: 'inset 0 -4px 6px -2px rgba(0,0,0,0.05)' }}></div>
            {/* Bottom Notch */}
            <div className="w-10 h-10 rounded-full absolute -bottom-5 -left-5 shadow-inner" style={{ backgroundColor: '#f8fafc', boxShadow: 'inset 0 4px 6px -2px rgba(0,0,0,0.05)' }}></div>
          </div>
        )}

        {/* Right Side: Details & Barcode (Authentic Boarding Pass Layout) */}
        <div className={`w-full ${forceMobile ? '' : 'md:w-[72%]'} flex flex-col md:flex-row relative z-10 overflow-hidden`} style={{ backgroundColor: bgColor, backgroundImage: getPatternStyle(config.bgPattern) }}>
          
          {/* Watermark (Globe / Map) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0">
            <Globe className="w-[120%] h-[120%]" style={{ color: textColor }} strokeWidth={0.5} />
          </div>

          {/* MAIN TICKET INFO */}
          <div className="flex-1 flex flex-col p-5 sm:p-6 lg:p-8 relative z-10">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-slate-900/10">
              <h2 
                className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-[1.05] line-clamp-2 pr-4"
                style={{ color: textColor }}
                title={data.event.title}
              >
                {data.event.title}
              </h2>
              <div className={`hidden sm:flex px-3 py-1.5 rounded ${getCategoryBadgeClass(data.ticketCategoryName)} shadow-sm text-[10px] font-black tracking-widest uppercase flex-shrink-0`}>
                {data.ticketCategoryName}
              </div>
            </div>

            {data.event.description && (
              <div className="text-[11px] font-medium mb-5 leading-relaxed opacity-70 line-clamp-2" style={{ color: textColor }} dangerouslySetInnerHTML={{ __html: data.event.description }}></div>
            )}

            {/* Gray Bordered Grid ("kotak kotak garis abu abu") */}
            <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col mt-auto bg-white/50 backdrop-blur-sm shadow-sm">
              
              {/* Row 1: Name & Category */}
              <div className="grid grid-cols-3 border-b border-slate-300">
                <div className="p-3 border-r border-slate-300 col-span-2">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nama Peserta</span>
                  <span className="text-sm font-black uppercase truncate block" style={{ color: textColor }}>{data.transaction.buyerName}</span>
                </div>
                <div className="p-3 bg-slate-50/50">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Jml Tiket</span>
                  <span className="text-sm font-bold uppercase" style={{ color: textColor }}>{data.transaction.totalTickets} Orang</span>
                </div>
              </div>
              
              {/* Row 2: Date, Time, Location */}
              <div className="grid grid-cols-4 border-b border-slate-300">
                <div className="p-3 border-r border-slate-300 col-span-2 sm:col-span-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Tanggal</span>
                  <span className="text-xs font-bold" style={{ color: textColor }}>
                    {new Date(data.event.eventDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="p-3 border-r border-slate-300 col-span-2 sm:col-span-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Waktu</span>
                  <span className="text-xs font-bold" style={{ color: primaryColor }}>
                    {new Date(data.event.eventDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
                  </span>
                </div>
                <div className="p-3 col-span-4 sm:col-span-2 bg-slate-50/50 border-t sm:border-t-0 border-slate-300">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Lokasi</span>
                  <span className="text-xs font-bold truncate block" style={{ color: textColor }}>{data.event.location}</span>
                </div>
              </div>
              
              {/* Row 3: Artists / Sponsors */}
              <div className="p-3 text-[10px] bg-white/30 flex flex-col sm:flex-row gap-4">
                {data.event.artists.length > 0 && (
                  <div className="flex-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider mr-2">Penampil:</span>
                    <span className="font-medium opacity-90" style={{ color: textColor }}>{data.event.artists.join(', ')}</span>
                  </div>
                )}
                {data.event.sponsors.length > 0 && (
                  <div className="flex-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider mr-2">Didukung:</span>
                    <span className="font-medium opacity-90" style={{ color: textColor }}>{data.event.sponsors.join(' • ')}</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT STUB (Tear-off Barcode Section) */}
          <div className="w-full md:w-[220px] border-t-2 md:border-t-0 md:border-l-[3px] border-dashed border-slate-300/80 flex flex-col p-5 sm:p-6 bg-slate-50/80 relative z-10 flex-shrink-0">
            
            {/* Stub Header */}
            <div className="w-full py-2 mb-4 rounded bg-slate-900 text-white text-center">
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Entry Pass</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="text-[9px] font-bold opacity-50 tracking-widest uppercase mb-3 block text-center" style={{ color: textColor }}>
                Pindai Disini
              </span>
              <div className="overflow-hidden mix-blend-multiply flex justify-center w-full bg-transparent">
                <QRCode 
                  value={data.barcodeString}
                  size={140}
                  bgColor="transparent"
                  fgColor={textColor}
                  level="Q"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-300/60 text-center">
              <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider mb-1.5">Kategori</span>
              <div className={`inline-block px-3 py-1 rounded ${getCategoryBadgeClass(data.ticketCategoryName)} shadow-sm text-[10px] font-black tracking-widest uppercase`}>
                {data.ticketCategoryName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Download Buttons */}
      {!isPreview && (
        <div className="flex flex-col sm:flex-row gap-4 w-full mt-2 no-print">
          <button 
            onClick={() => {
              const text = `Halo! Ini adalah E-Ticket saya untuk acara *${data.event.title}*.\n\nKlik tautan ini untuk melihat tiket:\n${window.location.href}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }}
            className="flex-1 flex items-center justify-center px-6 py-4 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#128C7E] focus:ring-4 focus:ring-[#25D366]/30 transition-all group shadow-lg shadow-[#25D366]/20"
          >
            {/* Simple WA Icon using SVG */}
            <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
            </svg>
            <div className="flex flex-col items-start text-left">
              <span>Kirim via WA</span>
              <span className="text-[10px] text-green-100 font-normal">Bagikan tautan tiket</span>
            </div>
          </button>
          <button 
            onClick={downloadAsImage} 
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center px-6 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 focus:ring-4 focus:ring-slate-900/30 transition-all disabled:opacity-70 group border border-slate-700 shadow-lg"
          >
            <ImageIcon className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-start text-left">
              <span>Unduh Gambar</span>
              <span className="text-[10px] text-slate-300 font-normal">Simpan tiket format PNG</span>
            </div>
          </button>
          <button 
            onClick={downloadAsPDF} 
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center px-6 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-600/30 transition-all disabled:opacity-70 group shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-start text-left">
              <span>Unduh PDF</span>
              <span className="text-[10px] text-emerald-100 font-normal">Simpan tiket format PDF</span>
            </div>
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />
    </div>
  );
}
