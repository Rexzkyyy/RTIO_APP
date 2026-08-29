"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Calendar, MapPin } from "lucide-react";

type EventBanner = {
  id: string;
  title: string;
  slug: string;
  bannerUrl: string | null;
  eventDate: Date | string;
  location: string;
};

export default function HeroSlider({ events, showIntroSlide = false }: { events: EventBanner[], showIntroSlide?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const totalSlides = showIntroSlide ? events.length + 1 : events.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === totalSlides - 1 ? 0 : prevIndex + 1));
  }, [totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1) return;
    const interval = setInterval(nextSlide, 5000); // Auto slide every 5s
    return () => clearInterval(interval);
  }, [nextSlide, totalSlides]);

  if (totalSlides === 0) {
    // Fallback if no events with banners
    return (
      <div className="bg-slate-900 text-white py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 to-slate-900/90 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 tracking-tight leading-tight px-2">
            Temukan Event <span className="text-emerald-400">Terbaik</span> di Sekitarmu
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto mb-6 sm:mb-10 px-4">
            Platform ticketing termudah untuk komunitas, konser, workshop, dan berbagai event seru lainnya.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full bg-slate-900 overflow-hidden h-[300px] sm:h-[350px] lg:h-[400px]`}>
      {/* Slides Container */}
      <div 
        className="flex transition-transform duration-700 ease-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {showIntroSlide && (
          <div className="min-w-full h-full relative flex-shrink-0">
            {/* The static hero content here */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 to-slate-900 z-0"></div>
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
              <div className="absolute -top-40 -right-40 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl"></div>
              <div className="absolute top-40 -left-40 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl"></div>
            </div>
            
            <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center px-4 sm:px-6 w-full pt-8 sm:pt-4 pb-14 sm:pb-12">
              <div className="max-w-4xl mx-auto w-full flex flex-col items-center">

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-2 sm:mb-4 leading-snug sm:leading-tight">
                  Temukan & Buat <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                    Event Impianmu
                  </span>
                </h1>
                <p className="text-xs sm:text-base text-slate-300 max-w-xl mx-auto mb-5 sm:mb-6 px-2 sm:px-4 leading-relaxed">
                  RTIO TIX adalah solusi lengkap untuk mengelola dan menemukan event. Dari konser, workshop, hingga seminar.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 px-4 w-full sm:w-auto mb-4 sm:mb-0">
                  <Link 
                    href="#katalog-event" 
                    className="px-6 py-2.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.5)] hover:-translate-y-1"
                  >
                    Jelajahi Event
                  </Link>
                  <Link 
                    href="/admin/events" 
                    className="px-6 py-2.5 text-sm bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold rounded-xl transition-all duration-300 border border-white/10 hover:-translate-y-1"
                  >
                    Buat Event Sendiri
                  </Link>
                </div>

              </div>
            </div>
          </div>
        )}

        {events.map((event, idx) => (
          <div key={event.id} className="min-w-full h-full relative flex-shrink-0">
            {/* Background Image */}
            {event.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={event.bannerUrl} 
                alt={event.title} 
                loading={idx === 0 && !showIntroSlide ? "eager" : "lazy"}
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-800"></div>
            )}
            
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
            <div className="absolute inset-0 bg-slate-900/40"></div> {/* Additional darkening */}

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-center max-w-7xl mx-auto px-4 sm:px-6 text-white pb-8 w-full">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] sm:text-xs font-semibold mb-3 backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Event Unggulan
                </div>
                
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold mb-3 leading-tight tracking-tight drop-shadow-lg line-clamp-2">
                  {event.title}
                </h2>
                
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-200 mb-6 font-medium">
                  <div className="flex items-center drop-shadow-md">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-emerald-400" />
                    {new Date(event.eventDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <div className="flex items-center drop-shadow-md">
                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 text-emerald-400" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                </div>

                <Link 
                  href={`/event/${event.slug}`}
                  className="inline-flex items-center px-5 py-2.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgb(16,185,129,0.5)] hover:-translate-y-1 group"
                >
                  Lihat Detail Event
                  <ChevronRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      {totalSlides > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex 
                  ? "w-6 h-2 bg-emerald-500 shadow-[0_0_8px_rgb(16,185,129,0.7)]" 
                  : "w-2 h-2 bg-white/40 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
