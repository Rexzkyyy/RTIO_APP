"use client";

import { useEffect, useRef, useState } from "react";

export default function InteractiveBackground() {
  const glowRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    let animationFrameId: number;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        // Use requestAnimationFrame for smooth, non-blocking DOM updates
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(() => {
          if (glowRef.current) {
            glowRef.current.style.transform = `translate(${e.clientX - 400}px, ${e.clientY - 400}px)`;
          }
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-slate-50">
      {/* Interactive Glow following mouse */}
      {isClient && (
        <div 
          ref={glowRef}
          className="absolute w-[800px] h-[800px] rounded-full blur-[120px] opacity-40 ease-out will-change-transform"
          style={{
            background: 'radial-gradient(circle, rgba(60,159,167,0.15) 0%, rgba(11,43,133,0.05) 50%, transparent 100%)',
            transform: `translate(-400px, -400px)`,
            transition: 'opacity 0.5s'
          }}
        />
      )}
      
      {/* Animated Blobs (Pure CSS animation) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-800/10 blur-[100px] mix-blend-multiply animate-blob will-change-transform"></div>
      <div className="absolute top-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/10 blur-[100px] mix-blend-multiply animate-blob animation-delay-2000 will-change-transform"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-cyan-600/10 blur-[100px] mix-blend-multiply animate-blob animation-delay-4000 will-change-transform"></div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.05); }
          66% { transform: translate(-30px, 30px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 15s infinite alternate ease-in-out;
        }
        .animation-delay-2000 { animation-delay: 5s; }
        .animation-delay-4000 { animation-delay: 10s; }
      `}} />
    </div>
  );
}
