"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Ticket, User } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  // Do not show on admin pages
  if (pathname.startsWith("/admin")) return null;

  const navItems = [
    {
      label: "Beranda",
      icon: Home,
      href: "/",
    },
    {
      label: "Tiket Saya",
      icon: Ticket,
      href: "/my-tickets",
    },
    {
      label: "Profil",
      icon: User,
      href: "/profile",
    },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the floating navbar */}
      <div className="h-24 sm:hidden w-full"></div>
      
      {/* Full Width Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200/80 z-50 px-2 py-2 shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.1)] pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center p-2 relative transition-all duration-300 w-24 group`}
              >
                {/* Active Indicator Pill */}
                <div className={`absolute top-1.5 w-16 h-8 rounded-full transition-all duration-300 -z-10 ${
                  isActive ? "bg-teal-100 scale-100 opacity-100" : "bg-transparent scale-50 opacity-0"
                }`}></div>
                
                <Icon 
                  className={`w-6 h-6 mb-1.5 transition-all duration-300 ${
                    isActive ? "text-teal-800 stroke-[2.5px] mt-0.5" : "text-slate-400 stroke-[2px] mt-0.5 group-hover:text-slate-600"
                  }`} 
                />
                <span className={`text-[11px] font-bold tracking-wide transition-all duration-300 ${
                  isActive ? "text-teal-800" : "text-slate-500"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
