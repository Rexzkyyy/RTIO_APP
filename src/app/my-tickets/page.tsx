import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Ticket, Calendar, ChevronRight, AlertCircle, Phone } from "lucide-react";
import InteractiveBackground from "@/components/InteractiveBackground";
import PublicNavbar from "@/components/PublicNavbar";

export default async function MyTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string, phone?: string }> }) {
  const session = await getServerSession(authOptions);
  const { status, phone } = await searchParams;
  
  if (!session || !session.user?.email) {
    if (!phone) {
      return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col relative z-0">
          <InteractiveBackground />
          <PublicNavbar />
          
          <div className="flex-1 max-w-lg mx-auto w-full px-4 py-12 relative z-10 flex flex-col justify-center">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-blue-500" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 mb-2">Login Disarankan</h1>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Kami sangat menyarankan Anda untuk login agar riwayat tiket Anda tersimpan dengan aman dan mudah diakses di kemudian hari tanpa perlu melacak secara manual.
              </p>
              
              <Link href="/profile" className="block w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl shadow-md hover:scale-[1.02] transition-transform mb-6">
                Login Sekarang
              </Link>
              
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-slate-200 w-full absolute left-0"></div>
                <span className="bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-wider relative z-10">Atau lacak tanpa login</span>
              </div>
              
              <form action="/my-tickets" method="GET" className="text-left space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                    <Phone className="w-4 h-4 mr-1.5" />
                    Nomor WhatsApp
                  </label>
                  <div className="flex relative">
                    <span className="inline-flex items-center px-4 py-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-slate-600 font-bold text-sm">
                      +62
                    </span>
                    <input 
                      type="tel" 
                      name="phone" 
                      placeholder="81234567890" 
                      required 
                      className="w-full px-4 py-3 rounded-r-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3.5 bg-slate-800 text-white font-bold rounded-xl shadow-md hover:bg-slate-900 transition-colors flex justify-center items-center">
                  <Ticket className="w-5 h-5 mr-2" />
                  Lacak Tiket Saya
                </button>
              </form>
            </div>
          </div>
        </div>
      );
    }
  }

  let normalizedPhone = phone;
  if (phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('62')) normalizedPhone = '+' + cleaned;
    else if (cleaned.startsWith('0')) normalizedPhone = '+62' + cleaned.substring(1);
    else normalizedPhone = '+62' + cleaned;
  }

  const whereClause: any = {};
  if (session?.user?.email) {
    whereClause.buyerEmail = session.user.email;
  } else if (normalizedPhone) {
    whereClause.buyerPhone = normalizedPhone;
  }

  if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    whereClause.status = status;
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      event: true,
      tickets: {
        include: { ticketCategory: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col relative z-0 pb-20">
      <InteractiveBackground />
      
      <PublicNavbar />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 relative z-10">
        
        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <Link href={`/my-tickets${phone ? `?phone=${phone}` : ''}`} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${!status || status === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Semua</Link>
          <Link href={`/my-tickets?status=PENDING${phone ? `&phone=${phone}` : ''}`} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Menunggu</Link>
          <Link href={`/my-tickets?status=APPROVED${phone ? `&phone=${phone}` : ''}`} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Aktif</Link>
          <Link href={`/my-tickets?status=REJECTED${phone ? `&phone=${phone}` : ''}`} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Ditolak</Link>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm mt-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Belum Ada Tiket</h2>
            <p className="text-sm text-slate-500 mb-6">Tidak ditemukan tiket{phone ? ` untuk nomor ${phone}` : ''}.</p>
            {phone && (
              <Link href="/my-tickets" className="inline-block px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl mb-4 hover:bg-slate-200 transition-colors text-sm mr-2">
                Ganti Nomor
              </Link>
            )}
            <Link href="/" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-800 to-teal-500 text-white font-bold rounded-xl shadow-md hover:scale-105 transition-transform">
              Cari Event Seru
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {phone && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4 flex justify-between items-center">
                <span className="text-sm text-emerald-800 font-medium">Menampilkan tiket untuk: <strong className="font-bold">{phone}</strong></span>
                <Link href="/my-tickets" className="text-xs bg-white text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors">Ganti</Link>
              </div>
            )}
            {transactions.map(tx => (
              <Link 
                href={`/public/${tx.id}/${tx.status === "APPROVED" ? "ticket" : (tx.paymentProofUrl ? "verify" : "pay")}`}
                key={tx.id} 
                className="block bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all group relative overflow-hidden"
              >
                {/* Status Indicator Line on the left */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${tx.status === 'APPROVED' ? 'bg-emerald-500' : tx.status === 'PENDING' ? 'bg-amber-400' : 'bg-red-500'}`}></div>
                
                <div className="flex gap-4 items-center">
                  {/* Thumbnail Image */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-slate-100">
                    {tx.event.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={tx.event.bannerUrl} alt={tx.event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-white/50" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base group-hover:text-teal-600 transition-colors line-clamp-1 pr-2">{tx.event.title}</h3>
                      {tx.status === "APPROVED" ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 shadow-sm">Aktif</span>
                      ) : tx.status === "PENDING" ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 shadow-sm">Menunggu</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md uppercase tracking-wider shrink-0 shadow-sm">Ditolak</span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-xs text-slate-500 mb-2">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      <span>{tx.event.eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {tx.totalTickets} Tiket
                      </div>
                      <div className="flex items-center text-teal-600 font-bold text-xs sm:text-sm">
                        Lihat <ChevronRight className="w-4 h-4 ml-0.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
