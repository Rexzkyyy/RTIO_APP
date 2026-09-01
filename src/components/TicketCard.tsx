"use client";

import React, { useRef, useState } from 'react';
import Barcode from 'react-barcode';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, Image as ImageIcon, CheckCircle2, Info, User, Tag, Ticket as TicketIcon, Calendar, MapPin, Mic, HeartHandshake } from "lucide-react";

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

        {/* Right Side: Details & Barcode (Wider & Landscape) */}
        <div className={`w-full ${forceMobile ? '' : 'md:w-[72%]'} flex flex-col relative p-6 sm:p-8 z-10 overflow-hidden`} style={{ backgroundColor: bgColor, backgroundImage: getPatternStyle(config.bgPattern) }}>
          
          {/* Depth Overlays (Noise & Gradient) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-black/[0.03] pointer-events-none mix-blend-overlay"></div>
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-multiply" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
          
          <div className="flex-1 flex flex-col justify-between h-full relative z-10">
            
            {/* Title & Desc */}
            <div className="mb-5 border-b border-slate-300/60 pb-5 relative">
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter leading-[1.05]"
                style={{ color: textColor }}
                title={data.event.title}
              >
                {data.event.title}
              </h2>
              {data.event.description && (
                <div className="text-[13px] font-medium mt-3 leading-relaxed opacity-80" style={{ color: textColor }} dangerouslySetInnerHTML={{ __html: data.event.description }}></div>
              )}
            </div>

            {/* Info Grid (Authentic Minimalist Boarding Pass Layout) */}
            <div className="border border-slate-300/80 rounded-xl overflow-hidden mb-5 bg-white/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-sm">
              {/* Top Row */}
              <div className="grid grid-cols-2 md:grid-cols-3 border-b border-slate-300/80">
                {/* Participant Name */}
                <div className="flex flex-col p-3 md:p-4 col-span-2 md:col-span-1 border-r border-slate-300/80 bg-white/30">
                  <span className="text-[9px] uppercase font-black tracking-[0.15em] opacity-60 mb-1" style={{ color: primaryColor }}>
                    Nama Penumpang
                  </span>
                  <span className="text-[15px] font-black uppercase truncate" style={{ color: textColor }} title={data.transaction.buyerName}>
                    {data.transaction.buyerName}
                  </span>
                </div>
                
                {/* Category */}
                <div className="flex flex-col p-3 md:p-4 border-r border-slate-300/80 bg-white/30">
                  <span className="text-[9px] uppercase font-black tracking-[0.15em] opacity-60 mb-1" style={{ color: primaryColor }}>
                    Kategori Tiket
                  </span>
                  <span className="text-[15px] font-bold uppercase truncate" style={{ color: textColor }}>
                    {data.ticketCategoryName}
                  </span>
                </div>
                
                {/* Quantity */}
                <div className="flex flex-col p-3 md:p-4 bg-slate-50/50">
                  <span className="text-[9px] uppercase font-black tracking-[0.15em] opacity-60 mb-1" style={{ color: primaryColor }}>
                    Jumlah Masuk
                  </span>
                  <span className="text-[15px] font-bold" style={{ color: textColor }}>
                    {data.transaction.totalTickets} ORANG
                  </span>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-2 md:grid-cols-3">
                {/* Date & Time */}
                <div className="flex flex-col p-3 md:p-4 border-r border-slate-300/80 bg-slate-50/50">
                  <span className="text-[9px] uppercase font-black tracking-[0.15em] opacity-60 mb-1" style={{ color: primaryColor }}>
                    Jadwal Acara
                  </span>
                  <span className="text-[13px] font-bold leading-tight" style={{ color: textColor }}>
                    {new Date(data.event.eventDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}<br/>
                    <span style={{ color: primaryColor }}>{new Date(data.event.eventDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA</span>
                  </span>
                </div>

                {/* Location */}
                <div className="flex flex-col p-3 md:p-4 col-span-2 md:col-span-2 bg-white/30">
                  <span className="text-[9px] uppercase font-black tracking-[0.15em] opacity-60 mb-1" style={{ color: primaryColor }}>
                    Lokasi Acara
                  </span>
                  <span className="text-[13px] font-bold leading-tight line-clamp-2 opacity-90" style={{ color: textColor }}>
                    {data.event.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Sponsors/Artists & Barcode */}
            <div className="mt-auto pt-4 border-t border-slate-300/60 flex flex-col md:flex-row items-end justify-between gap-6">
              
              <div className="flex-1 w-full space-y-4 pr-6">
                {data.event.artists.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-[0.2em] opacity-50 mb-1 block" style={{ color: textColor }}>
                      Penampil Khusus
                    </span>
                    <span className="text-[13px] font-bold opacity-90 leading-relaxed" style={{ color: textColor }}>
                      {data.event.artists.join(', ')}
                    </span>
                  </div>
                )}
                {data.event.sponsors.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase font-black tracking-[0.2em] opacity-50 mb-1 block" style={{ color: textColor }}>
                      Didukung Oleh
                    </span>
                    <span className="text-[12px] font-medium opacity-70 leading-relaxed" style={{ color: textColor }}>
                      {data.event.sponsors.join(' • ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full md:w-auto flex flex-col items-center p-4 rounded-xl border border-slate-300/80 bg-white shadow-sm flex-shrink-0">
                <span className="text-[8px] font-black opacity-50 tracking-[0.25em] uppercase mb-3 block text-center border-b border-slate-200/60 w-full pb-2" style={{ color: textColor }}>
                  SCAN UNTUK MASUK
                </span>
                <div className="overflow-hidden mix-blend-multiply flex justify-center w-full max-w-[160px] bg-white">
                  <Barcode 
                    value={data.barcodeString}
                    width={1.4}
                    height={45}
                    displayValue={false}
                    background="transparent"
                    lineColor={textColor}
                    margin={0}
                  />
                </div>
                <span className="font-mono text-xs font-black tracking-[0.3em] mt-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 w-full text-center" title={data.barcodeString}>
                  {data.barcodeString}
                </span>
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
