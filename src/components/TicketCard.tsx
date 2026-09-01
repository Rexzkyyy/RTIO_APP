"use client";

import React, { useRef, useState } from 'react';
import Barcode from 'react-barcode';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, Image as ImageIcon, MapPin, Calendar, Clock, User, Tag, Users, CheckCircle2, Info } from 'lucide-react';

type TicketData = {
  barcodeString: string;
  ticketIndex?: { current: number; total: number };
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
        className={`w-full max-w-6xl flex flex-col ${forceMobile ? '' : 'md:flex-row'} shadow-2xl shadow-slate-900/5 ${borderRadius} overflow-hidden relative border border-slate-200`}
        style={{ backgroundColor: bgColor }}
      >
        {/* Accent Strip at Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 z-10" style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor}, ${primaryColor})` }}></div>

        {/* Left Side: Poster */}
        <div className={`w-full ${forceMobile ? 'min-h-[300px]' : 'md:w-2/5 md:min-h-full'} relative min-h-[300px] flex-shrink-0 bg-slate-900 overflow-hidden`}>
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

        {/* Right Side: Details & Barcode */}
        <div className={`w-full ${forceMobile ? '' : 'md:w-3/5 md:flex-row'} flex flex-col relative`} style={{ backgroundColor: bgColor, backgroundImage: getPatternStyle(config.bgPattern) }}>
          
          {/* Main Info Section */}
          <div className={`flex-1 p-6 sm:p-8 flex flex-col border-b ${forceMobile ? '' : 'md:border-b-0 md:border-r'} border-slate-200 border-dashed relative z-10 bg-white/40`}>
            {/* Cutouts for dashed border effect */}
            {borderRadius !== 'rounded-none' && (
              <>
                <div className={`${forceMobile ? 'hidden' : 'hidden md:block'} absolute -top-4 -right-4 w-8 h-8 rounded-full border border-slate-200 z-10 shadow-inner`} style={{ backgroundColor: bgColor }}></div>
                <div className={`${forceMobile ? 'hidden' : 'hidden md:block'} absolute -bottom-4 -right-4 w-8 h-8 rounded-full border border-slate-200 z-10 shadow-inner`} style={{ backgroundColor: bgColor }}></div>
              </>
            )}
            
            <div className="mb-6 mt-4">
              <h2 
                className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-none mb-4 pb-1 drop-shadow-sm"
                style={{ color: textColor }}
              >
                {data.event.title}
              </h2>
              {data.event.description && (
                <div className="text-[13px] font-medium line-clamp-3 leading-relaxed border-l-2 pl-3 italic opacity-80" style={{ color: textColor, borderColor: primaryColor }} dangerouslySetInnerHTML={{ __html: data.event.description }}></div>
              )}
            </div>

            <div className="space-y-4 mt-auto">
              <div className="flex flex-col mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] flex items-center mb-1" style={{ color: primaryColor }}><User className="w-3.5 h-3.5 mr-1.5" /> Nama Peserta</span>
                <span className="text-xl font-black tracking-wide" style={{ color: textColor }}>{data.transaction.buyerName.toUpperCase()}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] flex items-center mb-2" style={{ color: primaryColor }}><Tag className="w-3.5 h-3.5 mr-1.5" /> Kategori</span>
                  <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-black tracking-wider w-fit border" style={{ color: primaryColor, backgroundColor: 'transparent', borderColor: primaryColor }}>
                    {data.ticketCategoryName.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] flex items-center mb-1" style={{ color: primaryColor }}><Users className="w-3.5 h-3.5 mr-1.5" /> Tiket Ke</span>
                  <span className="text-lg font-extrabold" style={{ color: textColor }}>
                    {data.ticketIndex ? `${data.ticketIndex.current} / ${data.ticketIndex.total}` : data.transaction.totalTickets} 
                    <span className="text-sm font-medium opacity-60 ml-1">Tiket</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col pt-4 mt-2 border-t-2 border-dashed border-slate-200/60">
                <div className="grid grid-cols-2 gap-4 mb-2 p-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] flex items-center mb-1.5" style={{ color: primaryColor }}><Calendar className="w-3.5 h-3.5 mr-1.5" /> Tanggal & Waktu</span>
                    <span className="text-[14px] font-bold leading-tight" style={{ color: textColor }}>
                      {new Date(data.event.eventDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} <br/>
                      <span className="font-black tracking-wide" style={{ color: primaryColor }}>{new Date(data.event.eventDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA</span>
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-extrabold tracking-[0.2em] flex items-center mb-1.5" style={{ color: primaryColor }}><MapPin className="w-3.5 h-3.5 mr-1.5" /> Lokasi</span>
                    <span className="text-[14px] font-bold truncate opacity-90" style={{ color: textColor }} title={data.event.location}>{data.event.location}</span>
                  </div>
                </div>

                {/* Additional Event Info */}
                {(data.event.artists.length > 0 || data.event.sponsors.length > 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                    {data.event.artists && data.event.artists.length > 0 && (
                      <div>
                        <span className="text-[9px] text-emerald-600/60 uppercase font-black tracking-[0.25em] mb-1 block">Penampil / Artis</span>
                        <span className="text-[14px] font-extrabold text-slate-800 leading-snug block">{data.event.artists.join(', ')}</span>
                      </div>
                    )}
                    {data.event.sponsors && data.event.sponsors.length > 0 && (
                      <div>
                        <span className="text-[9px] text-emerald-600/60 uppercase font-black tracking-[0.25em] mb-1 block">Disponsori Oleh</span>
                        <span className="text-[12px] font-bold text-slate-500 block">{data.event.sponsors.join(' • ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barcode Stub Section */}
          <div className={`w-full ${forceMobile ? '' : 'md:w-56'} p-6 sm:p-8 flex flex-col items-center justify-center opacity-95 relative bg-white/40`} style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <div className="mb-6 w-full">
              {isApproved ? (
                <div className="flex items-center justify-center px-3 py-2 border rounded-lg w-full shadow-sm" style={{ borderColor: primaryColor, color: primaryColor, backgroundColor: 'rgba(255,255,255,0.5)' }}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold leading-tight tracking-wide">TIKET VALID</span>
                    <span className="text-[10px] leading-tight opacity-80">Lunas</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center px-3 py-2 border rounded-lg text-amber-700 w-full shadow-sm" style={{ borderColor: '#f59e0b', backgroundColor: 'rgba(255,255,255,0.5)' }}>
                  <Info className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold leading-tight tracking-wide">MENUNGGU</span>
                    <span className="text-[10px] leading-tight opacity-80">Verifikasi</span>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center w-full flex flex-col items-center">
              <span className="text-[10px] font-bold opacity-50 tracking-widest uppercase mb-2 block" style={{ color: textColor }}>
                ✦ SCAN UNTUK MASUK ✦
              </span>
              <div className="p-2 rounded-xl border border-slate-200 inline-block mb-3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" style={{ backgroundColor: bgColor }}>
                <Barcode 
                  value={data.barcodeString}
                  width={1.5}
                  height={50}
                  displayValue={false}
                  background="transparent"
                  lineColor={textColor}
                  margin={0}
                />
              </div>
              <span className="font-mono text-[10px] font-black tracking-widest px-2 py-1 rounded border border-slate-200 inline-block w-full max-w-[150px] truncate shadow-inner" style={{ color: textColor, backgroundColor: 'rgba(0,0,0,0.02)' }} title={data.barcodeString}>
                {data.barcodeString}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Download Buttons */}
      {!isPreview && (
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-6xl no-print">
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
