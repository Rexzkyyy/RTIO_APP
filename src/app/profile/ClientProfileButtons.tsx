"use client";

import { signIn, signOut } from "next-auth/react";
import { LogOut, Mail } from "lucide-react";

export default function ClientProfileButtons({ action }: { action: "login" | "logout" }) {
  if (action === "login") {
    return (
      <button 
        onClick={() => signIn("google", { callbackUrl: "/my-tickets" })}
        className="w-full flex items-center justify-center px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
      >
        <Mail className="w-5 h-5 mr-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
        Lanjutkan dengan Google
      </button>
    );
  }

  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/" })}
      className="w-full flex items-center justify-center px-4 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
    >
      <LogOut className="w-5 h-5 mr-2" />
      Keluar (Logout)
    </button>
  );
}
