import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '../src/components/TicketCard.tsx');

const newCode = `"use client";

import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Download, Image as ImageIcon, Heart, Globe, MessageCircle } from "lucide-react";

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
      link.download = \`Tiket-\${data.event.title}-\${data.transaction.buyerName}.png\`;
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
      pdf.save(\`Tiket-\${data.event.title}-\${data.transaction.buyerName}.pdf\`);
    } catch (err) {
      console.error('PDF download failed', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getCategoryBadgeClass = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('diamond')) return 'bg-white text-pink-600 shadow-white/20';
    if (lowerName.includes('gold')) return 'bg-amber-400 text-amber-950 shadow-amber-400/20';
    if (lowerName.includes('silver')) return 'bg-slate-200 text-slate-800 shadow-slate-200/20';
    if (lowerName.includes('vip')) return 'bg-purple-600 text-white shadow-purple-600/20';
    return 'bg-amber-300 text-amber-950 shadow-amber-300/20'; // default vibrant yellow
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 font-sans">
      {/* Ticket Wrapper */}
      <div 
        ref={ticketRef} 
        className={\`w-full flex flex-col \${forceMobile ? '' : 'md:flex-row'} shadow-[0_20px_50px_rgba(236,72,153,0.3)] rounded-[2rem] overflow-hidden relative\`}
        style={{ 
          background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', // pink-500 to pink-700
          color: '#ffffff'
        }}
      >
        {/* Decorative background blobs (Seni Memahami Cinta aesthetic) */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-56 h-56 bg-rose-400/30 rounded-full blur-2xl translate-y-1/3 pointer-events-none"></div>
        <Heart className="absolute top-12 left-1/2 w-32 h-32 text-white/5 -rotate-12 pointer-events-none" />
        <Heart className="absolute bottom-12 right-[250px] w-24 h-24 text-white/5 rotate-12 pointer-events-none" />

        {/* Left Side: Poster */}
        <div className={\`w-full \${forceMobile ? 'min-h-[300px]' : 'md:w-[32%] md:min-h-[420px]'} relative flex-shrink-0 p-4\`}>
          <div className="absolute inset-4 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-pink-900/50 backdrop-blur-sm">
            {(data.event.ticketDesignUrl || data.event.bannerUrl) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={(data.event.ticketDesignUrl || data.event.bannerUrl) as string} 
                alt="Desain Tiket" 
                className="absolute inset-0 w-full h-full object-cover" 
                style={{ objectPosition: \`50% 50%\` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-50">
                <Globe className="w-16 h-16 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Physical Ticket Perforation Line & Notches (Desktop Only) */}
        {!forceMobile && (
          <div className="hidden md:flex flex-col justify-between w-0 relative border-l-[3px] border-dashed border-white/30 z-20">
            {/* Top Notch */}
            <div className="w-10 h-10 rounded-full absolute -top-5 -left-5 shadow-inner" style={{ backgroundColor: '#f8fafc', boxShadow: 'inset 0 -4px 6px -2px rgba(0,0,0,0.1)' }}></div>
            {/* Bottom Notch */}
            <div className="w-10 h-10 rounded-full absolute -bottom-5 -left-5 shadow-inner" style={{ backgroundColor: '#f8fafc', boxShadow: 'inset 0 4px 6px -2px rgba(0,0,0,0.1)' }}></div>
          </div>
        )}

        {/* Right Side: Details & Barcode (Authentic Boarding Pass Layout) */}
        <div className={\`w-full \${forceMobile ? '' : 'md:w-[68%]'} flex flex-col md:flex-row relative z-10 overflow-hidden\`}>
          
          {/* MAIN TICKET INFO */}
          <div className="flex-1 flex flex-col p-6 sm:p-8 relative z-10">
            
            {/* Top Bar */}
            <div className="flex items-start justify-between mb-6 pb-2">
              <h2 
                className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[1.1] drop-shadow-md pr-4"
                title={data.event.title}
              >
                {data.event.title}
              </h2>
              <div className={\`hidden sm:flex px-4 py-2 rounded-xl \${getCategoryBadgeClass(data.ticketCategoryName)} shadow-lg text-xs font-black tracking-widest uppercase flex-shrink-0 border border-white/20\`}>
                {data.ticketCategoryName}
              </div>
            </div>

            {/* Glassmorphism Grid */}
            <div className="rounded-2xl overflow-hidden flex flex-col mt-auto bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
              
              {/* Row 1: Name & Category */}
              <div className="grid grid-cols-3 border-b border-white/20">
                <div className="p-4 border-r border-white/20 col-span-2">
                  <span className="text-[10px] font-bold text-pink-200 uppercase tracking-widest block mb-1">Nama Peserta</span>
                  <span className="text-lg font-black uppercase truncate block drop-shadow-sm">{data.transaction.buyerName}</span>
                </div>
                <div className="p-4 bg-white/5">
                  <span className="text-[10px] font-bold text-pink-200 uppercase tracking-widest block mb-1">Jml Tiket</span>
                  <span className="text-lg font-bold uppercase">{data.transaction.totalTickets} Orang</span>
                </div>
              </div>
              
              {/* Row 2: Date, Time, Location */}
              <div className="grid grid-cols-4 border-b border-white/20">
                <div className="p-4 border-r border-white/20 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-pink-200 uppercase tracking-widest block mb-1">Tanggal</span>
                  <span className="text-sm font-bold">
                    {new Date(data.event.eventDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="p-4 border-r border-white/20 col-span-2 sm:col-span-1 bg-white/5">
                  <span className="text-[10px] font-bold text-pink-200 uppercase tracking-widest block mb-1">Waktu</span>
                  <span className="text-sm font-black text-amber-300 drop-shadow-sm">
                    {new Date(data.event.eventDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
                  </span>
                </div>
                <div className="p-4 col-span-4 sm:col-span-2 border-t sm:border-t-0 border-white/20">
                  <span className="text-[10px] font-bold text-pink-200 uppercase tracking-widest block mb-1">Lokasi</span>
                  <span className="text-sm font-bold truncate block">{data.event.location}</span>
                </div>
              </div>
              
              {/* Row 3: Artists / Sponsors */}
              <div className="p-4 text-xs bg-black/10 flex flex-col sm:flex-row gap-4">
                {data.event.artists.length > 0 && (
                  <div className="flex-1">
                    <span className="font-bold text-pink-300 uppercase tracking-wider mr-2">Penampil:</span>
                    <span className="font-medium opacity-90">{data.event.artists.join(', ')}</span>
                  </div>
                )}
                {data.event.sponsors.length > 0 && (
                  <div className="flex-1">
                    <span className="font-bold text-pink-300 uppercase tracking-wider mr-2">Didukung:</span>
                    <span className="font-medium opacity-90">{data.event.sponsors.join(' • ')}</span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT STUB (Tear-off Barcode Section) */}
          <div className="w-full md:w-[240px] border-t-[3px] md:border-t-0 md:border-l-[3px] border-dashed border-white/30 flex flex-col p-6 bg-white relative z-10 flex-shrink-0 text-slate-900 rounded-b-[2rem] md:rounded-bl-none md:rounded-r-[2rem]">
            
            {/* Stub Header */}
            <div className="w-full py-2.5 mb-6 rounded-xl bg-pink-600 text-white text-center shadow-md">
              <span className="text-[11px] font-black tracking-[0.25em] uppercase">Entry Pass</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center">
              <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mb-4 block text-center">
                Pindai Disini
              </span>
              <div className="overflow-hidden flex justify-center w-full bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                <QRCode 
                  value={data.barcodeString}
                  size={150}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  level="Q"
                />
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-200 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-wider mb-2">Kategori</span>
              <div className={\`inline-block px-4 py-1.5 rounded-lg \${getCategoryBadgeClass(data.ticketCategoryName)} shadow-sm text-xs font-black tracking-widest uppercase border border-slate-100\`}>
                {data.ticketCategoryName}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Download Buttons */}
      {!isPreview && (
        <div className="flex flex-col sm:flex-row gap-4 w-full mt-4 no-print">
          <button 
            onClick={() => {
              const text = \`Halo! Ini adalah E-Ticket saya untuk acara *\${data.event.title}*.\n\nKlik tautan ini untuk melihat tiket:\n\${window.location.href}\`;
              window.open(\`https://wa.me/?text=\${encodeURIComponent(text)}\`, '_blank');
            }}
            className="flex-1 flex items-center justify-center px-6 py-4 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#128C7E] focus:ring-4 focus:ring-[#25D366]/30 transition-all group shadow-lg shadow-[#25D366]/20"
          >
            <MessageCircle className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform fill-current" />
            <div className="flex flex-col items-start text-left">
              <span className="text-base">Kirim via WA</span>
              <span className="text-xs text-green-100 font-normal">Bagikan tautan tiket</span>
            </div>
          </button>
          
          <button 
            onClick={downloadAsImage} 
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center px-6 py-4 bg-pink-700 text-white font-bold rounded-xl hover:bg-pink-800 focus:ring-4 focus:ring-pink-700/30 transition-all disabled:opacity-70 group shadow-lg shadow-pink-900/20"
          >
            <ImageIcon className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-start text-left">
              <span className="text-base">Unduh Gambar</span>
              <span className="text-xs text-pink-200 font-normal">Simpan format PNG</span>
            </div>
          </button>
          
          <button 
            onClick={downloadAsPDF} 
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center px-6 py-4 bg-amber-500 text-amber-950 font-bold rounded-xl hover:bg-amber-600 focus:ring-4 focus:ring-amber-500/30 transition-all disabled:opacity-70 group shadow-lg shadow-amber-500/30"
          >
            <Download className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-start text-left">
              <span className="text-base">Unduh PDF</span>
              <span className="text-xs text-amber-900/70 font-medium">Simpan format PDF</span>
            </div>
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: \`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      \`}} />
    </div>
  );
}
`;

fs.writeFileSync(filePath, newCode);
console.log("TicketCard component successfully redesigned with the pink VIP theme!");
