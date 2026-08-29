"use client";

import React, { useState } from 'react';
import { updateTicketConfigAction } from '@/app/admin/tickets/[id]/actions';
import TicketCard from '@/components/TicketCard';
import { Save, RefreshCcw, Palette } from 'lucide-react';

type EventWithConfig = {
  id: string;
  title: string;
  eventDate: Date | string;
  location: string;
  bannerUrl: string | null;
  ticketDesignUrl: string | null;
  description: string;
  artists: string[];
  sponsors: string[];
  ticketConfig: any;
};

// Mock data untuk keperluan preview
const MOCK_TRANSACTION = {
  id: 'TX-PREVIEW-123',
  buyerName: 'John Doe',
  totalTickets: 2,
  status: 'APPROVED',
  totalPrice: 150000,
};

export default function TicketDesignEditor({ event }: { event: EventWithConfig }) {
  const defaultConfig = event.ticketConfig || {
    primaryColor: '#10b981', // emerald-500
    accentColor: '#34d399',  // emerald-400
    bgColor: '#ffffff',
    textColor: '#0f172a',    // slate-900
    pageBgColor: '#f8fafc',  // slate-50
    bgPattern: 'none',
    borderRadius: 'rounded-[2rem]',
    fontFamily: 'font-sans',
    imagePositionX: 50,
    imagePositionY: 50
  };

  const [config, setConfig] = useState(defaultConfig);
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Handle color change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setConfig({
      primaryColor: '#10b981',
      accentColor: '#34d399',
      bgColor: '#ffffff',
      textColor: '#0f172a',
      pageBgColor: '#f8fafc',
      bgPattern: 'none',
      borderRadius: 'rounded-[2rem]',
      fontFamily: 'font-sans',
      imagePositionX: 50,
      imagePositionY: 50
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTicketFile(file);
      setLocalPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    
    const formData = new FormData();
    formData.append('ticketConfig', JSON.stringify(config));
    if (ticketFile) {
      formData.append('ticketDesignFile', ticketFile);
    }

    const res = await updateTicketConfigAction(event.id, formData);
    if (res.success) {
      setMessage('Desain berhasil disimpan!');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Gagal menyimpan desain.');
    }
    
    setIsSaving(false);
  };

  // Data preview
  const previewData = {
    transaction: MOCK_TRANSACTION,
    event: {
      ...event,
      ticketDesignUrl: localPreviewUrl || event.ticketDesignUrl,
      ticketConfig: config
    },
    ticketCategoryName: 'VIP PREVIEW'
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left side: Controls */}
      <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:sticky lg:top-24">
        <div className="flex items-center mb-6">
          <Palette className="w-6 h-6 text-emerald-500 mr-2" />
          <h2 className="text-xl font-bold text-slate-800">Editor Desain</h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warna Latar Halaman (Page Bg)</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="pageBgColor" 
                value={config.pageBgColor || '#f8fafc'} 
                onChange={handleChange}
                className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{config.pageBgColor || '#f8fafc'}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Warna latar belakang untuk halaman publik E-Ticket.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warna Utama (Primary)</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="primaryColor" 
                value={config.primaryColor} 
                onChange={handleChange}
                className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{config.primaryColor}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Digunakan untuk border, ikon, dan aksen garis tiket.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warna Aksen (Accent)</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="accentColor" 
                value={config.accentColor} 
                onChange={handleChange}
                className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{config.accentColor}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Digunakan untuk gradasi warna tiket bersama warna utama.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warna Latar Tiket (Ticket Bg)</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="bgColor" 
                value={config.bgColor} 
                onChange={handleChange}
                className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{config.bgColor}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Warna dasar tiket (kanan).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Warna Teks (Text)</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="textColor" 
                value={config.textColor} 
                onChange={handleChange}
                className="h-10 w-20 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-sm text-slate-500 font-mono">{config.textColor}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Warna teks judul dan informasi tiket.</p>
          </div>

          <hr className="border-slate-100" />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pola Latar (Pattern)</label>
            <select 
              name="bgPattern" 
              value={config.bgPattern || 'none'} 
              onChange={(e: any) => handleChange(e)}
              className="w-full h-10 px-3 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="none">Tanpa Pola (Solid)</option>
              <option value="cubes">Cubes (Kotak-kotak 3D)</option>
              <option value="stardust">Stardust (Bintik Halus)</option>
              <option value="diagmonds">Diamonds (Ketupat)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bentuk Sudut Tiket</label>
            <select 
              name="borderRadius" 
              value={config.borderRadius || 'rounded-[2rem]'} 
              onChange={(e: any) => handleChange(e)}
              className="w-full h-10 px-3 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="rounded-none">Tajam (Kotak Kaku)</option>
              <option value="rounded-xl">Membulat Sedikit (Rounded XL)</option>
              <option value="rounded-[2rem]">Sangat Membulat (Modern)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gaya Font Teks</label>
            <select 
              name="fontFamily" 
              value={config.fontFamily || 'font-sans'} 
              onChange={(e: any) => handleChange(e)}
              className="w-full h-10 px-3 rounded border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="font-sans">Sans-Serif (Modern & Bersih)</option>
              <option value="font-serif">Serif (Klasik & Elegan)</option>
              <option value="font-mono">Monospace (Retro & Unik)</option>
            </select>
          </div>

          <hr className="border-slate-100" />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ganti Poster / Desain Tiket</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-emerald-50 file:text-emerald-700
                hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-1"
            />
            <p className="text-xs text-slate-500 mt-1">Biarkan kosong jika tidak ingin mengubah.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Posisi Gambar (Horizontal / Kiri-Kanan)</label>
            <input 
              type="range" 
              name="imagePositionX"
              min="0"
              max="100"
              value={config.imagePositionX ?? 50} 
              onChange={handleChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Posisi Gambar (Vertikal / Atas-Bawah)</label>
            <input 
              type="range" 
              name="imagePositionY"
              min="0"
              max="100"
              value={config.imagePositionY ?? 50} 
              onChange={handleChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex justify-center items-center py-2.5 px-4 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? 'Menyimpan...' : 'Simpan Desain'}
          </button>
          <button 
            onClick={handleReset}
            type="button"
            className="w-full flex justify-center items-center py-2 px-4 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Kembalikan Default
          </button>
          
          {message && (
            <div className={`mt-2 p-3 text-sm rounded-lg text-center ${message.includes('Gagal') ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Live Preview */}
      <div className="w-full lg:w-2/3 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 ml-2 gap-4">
          <h3 className="text-lg font-medium text-slate-700">Live Preview</h3>
          
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={() => setPreviewMode('desktop')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${previewMode === 'desktop' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lanskap (Desktop)
            </button>
            <button 
              onClick={() => setPreviewMode('mobile')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${previewMode === 'mobile' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Potret (Mobile)
            </button>
          </div>
        </div>

        <div 
          className="rounded-2xl border border-slate-200 overflow-x-auto transition-colors duration-300 shadow-inner flex justify-center"
          style={{ backgroundColor: config.pageBgColor || '#f8fafc' }}
        >
          <div 
            style={{ zoom: 0.85 }} 
            className={`flex flex-col items-center py-12 px-8 transition-all duration-500 ${previewMode === 'mobile' ? 'w-[420px]' : 'min-w-[1000px] w-full'}`}
          >
            
            {/* Mockup Status Header */}
            <div className="text-center w-full max-w-2xl mb-8 opacity-90">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-500 mb-4 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900">Pendaftaran Berhasil!</h1>
              <p className="text-slate-500 mt-2">
                ID Transaksi: <span className="font-mono text-slate-700 bg-white/50 px-2 py-1 rounded border border-slate-200/50">{previewData.transaction.id}</span>
              </p>
            </div>

            {/* Mockup Logo */}
            <div className="flex justify-center mb-6">
              <img 
                src="/logo.png" 
                alt="RTIO TIX Logo" 
                className="h-[100px] w-auto max-w-none object-contain mix-blend-multiply opacity-80" 
              />
            </div>

            <TicketCard 
              data={previewData} 
              isPreview={true} 
              forceMobile={previewMode === 'mobile'} 
            />
            
          </div>
        </div>
      </div>
    </div>
  );
}
