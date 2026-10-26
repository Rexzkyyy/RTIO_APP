import prisma from "@/lib/prisma";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import {
  Calendar,
  ChevronRight,
  TrendingUp,
  Search,
  ChevronLeft,
  MapPin,
  Ticket,
  BarChart3,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const pageStr = typeof params.page === "string" ? params.page : "1";
  const page = parseInt(pageStr, 10) || 1;
  const limit = 9;
  const skip = (page - 1) * limit;

  const whereEvent: Prisma.EventWhereInput = {};
  if (q) {
    whereEvent.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ];
  }

  const totalEvents = await prisma.event.count({ where: whereEvent });
  const totalPages = Math.ceil(totalEvents / limit);

  const events = await prisma.event.findMany({
    where: whereEvent,
    orderBy: { eventDate: "desc" },
    skip,
    take: limit,
    include: {
      transactions: {
        where: { status: "APPROVED" },
      },
      ticketCategories: {
        select: {
          quota: true,
          initialQuota: true,
          _count: {
            select: {
              tickets: {
                where: { transaction: { status: "APPROVED" } },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Top Header & Search ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Analisis Penjualan
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {totalEvents} Event
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm">
            Pantau performa omset, kuota tiket, dan laporan audit kasir loket secara real-time.
          </p>
        </div>

        <form className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari nama event atau lokasi..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs transition-all"
          />
          <input type="hidden" name="page" value="1" />
        </form>
      </div>

      {/* ── Event Cards Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => {
          const totalRevenue = event.transactions.reduce((sum, tx) => sum + tx.totalPrice, 0);
          const totalTickets = event.transactions.reduce((sum, tx) => sum + tx.totalTickets, 0);
          const offlineTickets = event.transactions
            .filter((tx) => tx.paymentProofUrl === "OFFLINE")
            .reduce((sum, tx) => sum + tx.totalTickets, 0);
          const onlineTickets = totalTickets - offlineTickets;
          const offlineRevenue = event.transactions
            .filter((tx) => tx.paymentProofUrl === "OFFLINE")
            .reduce((sum, tx) => sum + tx.totalPrice, 0);

          const totalCapacity = event.ticketCategories.reduce((sum, c) => {
            const sold = c._count.tickets;
            const initial = c.initialQuota != null ? c.initialQuota : c.quota + sold;
            return sum + initial;
          }, 0);
          const effectiveCapacity = Math.max(totalCapacity, totalTickets);
          const soldPercentage =
            effectiveCapacity > 0
              ? Math.min(100, Math.round((totalTickets / effectiveCapacity) * 100))
              : 0;

          const nowCheck = new Date();
          const eventDateForCheck = new Date(event.eventDate);
          const isFinished = nowCheck > new Date(eventDateForCheck.setHours(23, 59, 59, 999));

          return (
            <Link
              key={event.id}
              href={`/admin/analytics/${event.id}`}
              className={`group flex flex-col rounded-3xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                isFinished
                  ? "bg-slate-50/80 border-slate-200/70 opacity-80"
                  : "bg-white border-slate-200/90 hover:border-emerald-300"
              }`}
            >
              {/* Event Card Header / Banner */}
              <div className="relative h-36 w-full bg-slate-900 overflow-hidden flex items-end p-4">
                {event.bannerUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.bannerUrl}
                      alt={event.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-emerald-950" />
                )}

                {/* Status Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm ${
                      isFinished
                        ? "bg-slate-800/80 text-slate-300 border border-slate-700"
                        : "bg-emerald-500/90 text-white border border-emerald-400/40"
                    }`}
                  >
                    {isFinished ? "🏁 Selesai" : "🟢 Berjalan"}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-black/40 backdrop-blur-md border border-white/10">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    {new Date(event.eventDate).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <div className="relative z-10 w-full">
                  <h3 className="text-white font-extrabold text-base line-clamp-1 group-hover:text-emerald-300 transition-colors">
                    {event.title}
                  </h3>
                  {event.location && (
                    <p className="text-slate-300 text-xs flex items-center gap-1 mt-0.5 line-clamp-1">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      {event.location}
                    </p>
                  )}
                </div>
              </div>

              {/* Event Financial Metrics */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {/* Revenue & Tickets Row */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Total Omset
                    </span>
                    <p className="text-lg font-black text-slate-900 tracking-tight">
                      Rp {totalRevenue.toLocaleString("id-ID")}
                    </p>
                    {offlineRevenue > 0 && (
                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                        Loket: Rp {offlineRevenue.toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Tiket Terjual
                    </span>
                    <p className="text-lg font-black text-slate-900 flex items-center justify-end gap-1">
                      {totalTickets}
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </p>
                    <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold mt-1">
                      <span className="text-blue-600">{onlineTickets} Web</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-emerald-600">{offlineTickets} Loket</span>
                    </div>
                  </div>
                </div>

                {/* Quota Progress Bar */}
                {effectiveCapacity > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-600 flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5 text-slate-400" />
                        Terjual {soldPercentage}%
                      </span>
                      <span className="text-slate-400 font-normal text-[11px]">
                        {totalTickets} / {effectiveCapacity} Kuota
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          soldPercentage >= 95
                            ? "bg-red-500"
                            : soldPercentage >= 80
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${soldPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Lihat Analisis Detail
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}

        {events.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">Event Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ada event yang cocok dengan kriteria pencarian Anda. Coba kata kunci lain.
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-6">
          {page > 1 ? (
            <Link
              href={`/admin/analytics?q=${encodeURIComponent(q)}&page=${page - 1}`}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-xs transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          ) : (
            <div className="p-2.5 bg-slate-100 border border-slate-200/50 rounded-xl text-slate-300 cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </div>
          )}

          <span className="text-xs font-bold text-slate-600 px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-xs">
            Halaman {page} dari {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/admin/analytics?q=${encodeURIComponent(q)}&page=${page + 1}`}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 shadow-xs transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="p-2.5 bg-slate-100 border border-slate-200/50 rounded-xl text-slate-300 cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
