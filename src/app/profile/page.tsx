import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import InteractiveBackground from "@/components/InteractiveBackground";
import { LogOut } from "lucide-react";
import Link from "next/link";
import ClientProfileButtons from "./ClientProfileButtons";
import PublicNavbar from "@/components/PublicNavbar";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col relative z-0">
      <InteractiveBackground />
      <PublicNavbar />
      
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center">
          
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-800 tracking-widest uppercase mb-2">
              RTIO <span className="text-teal-500">TIX</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">Akun Pengguna</p>
          </div>

          {session ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center">
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="Profile" className="w-20 h-20 rounded-full mb-4 shadow-md ring-4 ring-slate-50" />
                ) : (
                  <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-md">
                    {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || "U"}
                  </div>
                )}
                <h2 className="text-xl font-bold text-slate-800">{session.user?.name}</h2>
                <p className="text-slate-500 text-sm mt-1">{session.user?.email}</p>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-3">
                <Link href="/my-tickets" className="block w-full px-4 py-3 bg-teal-50 text-teal-700 font-bold rounded-xl hover:bg-teal-100 transition-colors">
                  Lihat Tiket Saya
                </Link>
                <ClientProfileButtons action="logout" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                Login dengan Google sekarang untuk melihat riwayat tiket Anda dengan cepat dan aman tanpa perlu password.
              </p>
              
              <ClientProfileButtons action="login" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
