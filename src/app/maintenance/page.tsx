"use client";

import React from 'react';
import { Settings, Wrench, RefreshCcw } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900 selection:bg-pink-500 selection:text-white">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900"></div>
        <div className="absolute bottom-0 right-0 w-[80vw] h-[80vw] sm:w-[600px] sm:h-[600px] bg-pink-600/20 rounded-full blur-[100px] mix-blend-screen opacity-50 animate-pulse"></div>
        <div className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] sm:w-[500px] sm:h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen opacity-50"></div>
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-2xl px-6 sm:px-12 flex flex-col items-center justify-center text-center">
        
        {/* Floating Icons */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 mb-10">
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 to-indigo-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
          
          <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/50">
            <Wrench className="w-12 h-12 sm:w-16 sm:h-16 text-pink-400 absolute animate-[spin_8s_linear_infinite]" />
            <Settings className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400 absolute ml-12 mt-12 animate-[spin_10s_linear_infinite_reverse]" />
          </div>
        </div>

        {/* Text Content */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-black/50 w-full transform transition-all duration-700 hover:scale-[1.02] hover:bg-white/10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs sm:text-sm font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            System Maintenance
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-pink-200 mb-6 drop-shadow-sm">
            Kami Segera Kembali
          </h1>
          
          <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed mb-8 max-w-xl mx-auto">
            Kami sedang melakukan peningkatan sistem dan perbaikan rutin untuk memberikan pengalaman yang lebih spektakuler bagi Anda. Terima kasih atas kesabaran Anda!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => window.location.href = '/'} className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-indigo-50 transition-all duration-300 shadow-xl shadow-white/10 hover:shadow-white/20 overflow-hidden">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <RefreshCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
              Coba Muat Ulang
            </button>
          </div>
        </div>
        
        {/* Footer Text */}
        <div className="mt-12 text-slate-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} RTIO TIX. All rights reserved.
        </div>
      </div>
    </div>
  );
}
