import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import AdminLoginButton from "./AdminLoginButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Column - Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 flex-col justify-center items-center p-12 overflow-hidden">
        {/* Abstract Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-900/40 via-slate-950 to-slate-950"></div>
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-emerald-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-teal-500/20 rounded-full blur-[100px]"></div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>

        <div className="relative z-10 flex flex-col items-center w-full max-w-lg">

          <div className="mb-16 text-center">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold tracking-wide mb-6">
              <ShieldCheck className="w-4 h-4 mr-2" /> Secure Admin Portal
            </div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
              Event Ticketing <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                Management System
              </span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Kelola seluruh aspek acara Anda, pantau penjualan tiket secara real-time, dan validasi kehadiran peserta dengan mudah.
            </p>
          </div>

          {/* Logo Section */}
          <div className="relative flex flex-row items-center justify-center w-full px-4 py-4 sm:py-6 -mt-8 sm:-mt-12">
            
            {/* Div RTIO TIX */}
            <div className="flex-1 flex items-center justify-end pr-6 sm:pr-10 transition-transform hover:scale-110 duration-500">
              <img 
                src="/logo.png" 
                alt="RTIO TIX" 
                className="h-28 sm:h-60 w-auto object-contain drop-shadow-xl brightness-0 invert opacity-90 hover:opacity-100 transition-opacity" 
              />
            </div>

            {/* Divider Line with Custom X (No Mask) */}
            <div className="relative shrink-0 flex flex-col items-center justify-center w-16 h-28 sm:h-40">
              {/* Top vertical line */}
              <div className="flex-1 w-[1px] bg-gradient-to-b from-transparent to-white/40 rounded-full"></div>
              
              {/* Custom X */}
              <div className="relative flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 my-3">
                {/* Garis X 1 */}
                <div className="absolute w-[2px] sm:w-[3px] h-12 sm:h-16 bg-gradient-to-b from-emerald-400 to-teal-300 rotate-45 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] rounded-full"></div>
                {/* Garis X 2 */}
                <div className="absolute w-[2px] sm:w-[3px] h-12 sm:h-16 bg-gradient-to-b from-emerald-400 to-teal-300 -rotate-45 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] rounded-full"></div>
              </div>

              {/* Bottom vertical line */}
              <div className="flex-1 w-[1px] bg-gradient-to-b from-white/40 to-transparent rounded-full"></div>
            </div>

            {/* Div Ruang Tenang */}
            <div className="flex-1 flex items-center justify-start pl-6 sm:pl-10 transition-transform hover:scale-110 duration-500">
              <img 
                src="/images/logo_ruang_tenang.png" 
                alt="Ruang Tenang" 
                className="h-20 sm:h-28 w-auto object-contain drop-shadow-xl brightness-0 invert opacity-90 hover:opacity-100 transition-opacity" 
              />
            </div>

          </div>

        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex flex-col justify-center relative bg-slate-900 overflow-hidden">
        
        {/* Abstract Background Gradients for Right Column */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-900 to-slate-900 pointer-events-none"></div>
        <div className="absolute top-[10%] right-[10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Back Button */}
        <Link 
          href="/" 
          className="absolute top-6 left-6 sm:top-8 sm:left-8 z-20 flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 backdrop-blur-md text-slate-300 rounded-full transition-all duration-300 hover:-translate-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-semibold text-sm">Kembali</span>
        </Link>

        <div className="mx-auto w-full max-w-md px-6 sm:px-8 lg:px-12 py-12 relative z-10">
          
          <div className="mb-6 text-center lg:text-left">
            {/* Desktop Text */}
            <div className="hidden lg:block">
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">
                Welcome Back
              </h2>
              <p className="text-sm text-slate-400">
                Silakan masukkan kredensial administrator Anda untuk melanjutkan ke dashboard.
              </p>
            </div>
            
            {/* Mobile Text */}
            <div className="lg:hidden mt-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-2">
                Event Ticketing <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                  Management System
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed px-2">
                Kelola seluruh aspek acara Anda, pantau penjualan tiket secara real-time, dan validasi kehadiran peserta dengan mudah.
              </p>
            </div>
          </div>

          {/* Mobile Logos (Hidden on Desktop) */}
          <div className="lg:hidden flex flex-row items-center justify-center w-full mb-8 mt-2">
            
            {/* Div RTIO TIX */}
            <div className="flex-1 flex items-center justify-end pr-3 sm:pr-6">
              <img 
                src="/logo.png" 
                alt="RTIO TIX" 
                className="h-36 sm:h-48 w-auto object-contain drop-shadow-xl brightness-0 invert opacity-90" 
              />
            </div>

            {/* Divider Line with Custom X (Dark Mode) */}
            <div className="relative shrink-0 flex flex-col items-center justify-center w-8 h-32 sm:h-40">
              <div className="flex-1 w-[1px] bg-gradient-to-b from-transparent to-white/40 rounded-full"></div>
              
              <div className="relative flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 my-2">
                <div className="absolute w-[2px] sm:w-[3px] h-12 sm:h-16 bg-gradient-to-b from-emerald-400 to-teal-300 rotate-45 shadow-[0_0_10px_rgba(52,211,153,0.6)] rounded-full"></div>
                <div className="absolute w-[2px] sm:w-[3px] h-12 sm:h-16 bg-gradient-to-b from-emerald-400 to-teal-300 -rotate-45 shadow-[0_0_10px_rgba(52,211,153,0.6)] rounded-full"></div>
              </div>

              <div className="flex-1 w-[1px] bg-gradient-to-b from-white/40 to-transparent rounded-full"></div>
            </div>

            {/* Div Ruang Tenang */}
            <div className="flex-1 flex items-center justify-start pl-3 sm:pl-6">
              <img 
                src="/images/logo_ruang_tenang.png" 
                alt="Ruang Tenang" 
                className="h-28 sm:h-36 w-auto object-contain drop-shadow-xl brightness-0 invert opacity-90" 
              />
            </div>

          </div>
          
          <AdminLoginButton />

        </div>
      </div>
    </div>
  );
}
