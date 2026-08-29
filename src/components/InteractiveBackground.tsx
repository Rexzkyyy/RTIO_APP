"use client";

export default function InteractiveBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-50" style={{ contentVisibility: 'auto' }}>
      {/* Static Blobs (Pure CSS, no JavaScript) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-800/8 blur-[80px] animate-blob will-change-transform"></div>
      <div className="absolute bottom-[-15%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-teal-500/8 blur-[80px] animate-blob animation-delay-4000 will-change-transform"></div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.03); }
          66% { transform: translate(-20px, 20px) scale(0.97); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 20s infinite alternate ease-in-out;
        }
        .animation-delay-4000 { animation-delay: 10s; }
      `}} />
    </div>
  );
}
