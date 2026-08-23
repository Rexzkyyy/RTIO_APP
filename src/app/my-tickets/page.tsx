import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Ticket, Calendar, MapPin, ChevronRight, AlertCircle, ArrowLeft } from "lucide-react";
import InteractiveBackground from "@/components/InteractiveBackground";
import PublicNavbar from "@/components/PublicNavbar";

export default async function MyTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.email) {
    redirect("/profile");
  }

  const { status } = await searchParams;

  const whereClause: any = {
    buyerEmail: session.user.email
  };

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
          <Link href="/my-tickets" className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${!status || status === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Semua</Link>
          <Link href="/my-tickets?status=PENDING" className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'PENDING' ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Menunggu</Link>
          <Link href="/my-tickets?status=APPROVED" className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Aktif</Link>
          <Link href="/my-tickets?status=REJECTED" className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Ditolak</Link>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm mt-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-slate-300" />
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Belum Ada Tiket</h2>
            <p className="text-sm text-slate-500 mb-6">Anda belum memiliki tiket untuk kategori ini.</p>
            <Link href="/" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-800 to-teal-500 text-white font-bold rounded-xl shadow-md hover:scale-105 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              Cari Event Seru
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
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
