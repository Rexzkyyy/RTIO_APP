import prisma from "@/lib/prisma";
import Link from "next/link";
import { BarChart, Calendar, ChevronRight, TrendingUp, Search, ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const pageStr = typeof params.page === 'string' ? params.page : '1';
  const page = parseInt(pageStr, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const whereEvent: any = {};
  if (q) {
    whereEvent.OR = [
      { title: { contains: q, mode: 'insensitive' as const } },
      { location: { contains: q, mode: 'insensitive' as const } },
    ];
  }
  
  const totalEvents = await prisma.event.count({ where: whereEvent });
  const totalPages = Math.ceil(totalEvents / limit);

  const events = await prisma.event.findMany({
    where: whereEvent,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: {
      transactions: {
        where: { status: "APPROVED" },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analisis Penjualan</h1>
          <p className="text-slate-500 mt-1">Pilih event untuk melihat grafik dan statistik penjualan secara detail.</p>
        </div>
        
        <form className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input 
            type="text" 
            name="q"
            defaultValue={q}
            placeholder="Cari event atau lokasi..." 
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input type="hidden" name="page" value="1" />
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => {
          const totalRevenue = event.transactions.reduce((sum, tx) => sum + tx.totalPrice, 0);
          const totalTickets = event.transactions.reduce((sum, tx) => sum + tx.totalTickets, 0);

          return (
            <Link 
              key={event.id} 
              href={`/admin/analytics/${event.id}`}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group block"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
                  <BarChart className="w-6 h-6" />
                </div>
                <div className="bg-slate-50 text-slate-500 text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-200 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(event.eventDate).toLocaleDateString("id-ID")}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">{event.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-1 mb-4">{event.location}</p>
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Pendapatan</p>
                  <p className="text-lg font-black text-slate-800">Rp {totalRevenue.toLocaleString("id-ID")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Tiket Terjual</p>
                  <p className="text-lg font-black text-slate-800 flex items-center justify-end">
                    {totalTickets}
                    <TrendingUp className="w-4 h-4 ml-1 text-emerald-500" />
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-3 flex justify-end">
                <span className="text-xs font-semibold text-emerald-600 flex items-center group-hover:underline">
                  Lihat Analisis Lengkap <ChevronRight className="w-4 h-4 ml-0.5" />
                </span>
              </div>
            </Link>
          );
        })}

        {events.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <BarChart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Belum ada event yang dibuat.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          {page > 1 ? (
            <Link href={`/admin/analytics?q=${encodeURIComponent(q)}&page=${page - 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          ) : (
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
              <ChevronLeft className="w-5 h-5" />
            </div>
          )}
          
          <span className="text-sm font-medium text-slate-600 mx-2">
            Hal {page} dari {totalPages}
          </span>

          {page < totalPages ? (
            <Link href={`/admin/analytics?q=${encodeURIComponent(q)}&page=${page + 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
              <ChevronRight className="w-5 h-5" />
            </Link>
          ) : (
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
              <ChevronRight className="w-5 h-5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
