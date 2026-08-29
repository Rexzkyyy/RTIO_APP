"use client";

import { useEffect, useState } from "react";
import { Smartphone, Landmark, Banknote, Rocket, Coffee } from "lucide-react";

const FUNNY_MESSAGES = [
  "Sedang menghitung uang receh...",
  "Menitipkan uang ke satpam server...",
  "Mengirim data pakai burung merpati...",
  "Membangunkan server yang lagi tidur...",
  "Menyeduh kopi untuk admin...",
  "Sabar ya, orang sabar tiketnya VIP...",
  "Mengamankan kursi barisan depan...",
];

export default function CuteLoadingOverlay({ isVisible }: { isVisible: boolean }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    
    // Ganti pesan lucu setiap 2 detik
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % FUNNY_MESSAGES.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-[90%] border-4 border-emerald-100 relative overflow-hidden">
        
        {/* Dekorasi Latar Belakang */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50 via-white to-white opacity-50"></div>

        {/* Area Animasi Utama */}
        <div className="relative w-48 h-32 flex items-center justify-between mb-6 z-10">
          
          {/* HP / Pengirim (Kiri) - Goyang-goyang */}
          <div className="flex flex-col items-center animate-[bounce_2s_infinite]">
            <div className="bg-emerald-100 p-3 rounded-2xl">
              <Smartphone className="w-8 h-8 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 mt-2">HP Kamu</span>
          </div>

          {/* Uang Terbang (Tengah) - Bergerak dari kiri ke kanan dengan efek memudar */}
          <div className="absolute left-16 top-4 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]">
            <Banknote className="w-6 h-6 text-emerald-500 opacity-50" />
          </div>
          <div className="absolute left-12 animate-[slideRight_1.5s_ease-in-out_infinite] z-20">
            <div className="bg-white p-1 rounded-full shadow-md animate-spin">
              <Banknote className="w-8 h-8 text-emerald-500" />
            </div>
          </div>

          {/* Bank / Server (Kanan) - Goyang pelan */}
          <div className="flex flex-col items-center animate-[pulse_2s_infinite]">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <Landmark className="w-8 h-8 text-blue-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 mt-2">Server RTIO</span>
          </div>
        </div>

        {/* Teks Status Lucu */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center space-x-2 text-emerald-600 font-bold mb-2">
            <Rocket className="w-5 h-5 animate-bounce" />
            <span className="text-lg">Memproses...</span>
          </div>
          
          {/* Efek transisi teks yang mulus */}
          <div className="h-8 flex items-center justify-center text-center">
            <p 
              key={messageIndex}
              className="text-slate-500 text-sm font-medium animate-[fadeInUp_0.5s_ease-out]"
            >
              {FUNNY_MESSAGES[messageIndex]}
            </p>
          </div>
        </div>
      </div>

      {/* Tailwind Custom Keyframes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideRight {
          0% { transform: translateX(0) scale(0.8) rotate(-10deg); opacity: 0; }
          20% { opacity: 1; transform: translateX(10px) scale(1.1) rotate(5deg); }
          80% { opacity: 1; transform: translateX(60px) scale(1) rotate(-5deg); }
          100% { transform: translateX(80px) scale(0.5) rotate(10deg); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
