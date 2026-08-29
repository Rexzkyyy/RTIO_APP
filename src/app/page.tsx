import prisma from "@/lib/prisma";
import Link from "next/link";
import { Calendar, MapPin, Users, Ticket, Search, Filter, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import HeroSlider from "@/components/HeroSlider";
import InteractiveBackground from "@/components/InteractiveBackground";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import NotificationBell from "@/components/NotificationBell";
import PublicNavbar from "@/components/PublicNavbar";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Home({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const sort = typeof params.sort === 'string' ? params.sort : 'newest';
  const pageStr = typeof params.page === 'string' ? params.page : '1';
  const page = parseInt(pageStr, 10) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    isActive: true,
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {})
  };

  const totalEvents = await prisma.event.count({ where });
  const totalPages = Math.ceil(totalEvents / limit);

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
    skip,
    take: limit,
    include: {
      ticketCategories: true,
    }
  });

  const featuredEvents = await prisma.event.findMany({
    where: { isActive: true, bannerUrl: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  let userTransactions: any[] = [];
  if (session?.user?.email) {
    userTransactions = await prisma.transaction.findMany({
      where: { buyerEmail: session.user.email },
      select: {
        id: true,
        status: true,
        paymentProofUrl: true,
        event: { select: { title: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col relative z-0">
      <InteractiveBackground />
      {/* Header - Fixed overlapping issue with higher z-index and explicit bg */}
      <PublicNavbar />

      {/* Hero Section */}
      <div className="w-full relative z-10 max-w-7xl mx-auto px-2 sm:px-6 pt-4 sm:pt-10">
        <div className="rounded-xl sm:rounded-3xl overflow-hidden shadow-2xl bg-slate-900">
          <HeroSlider 
            events={featuredEvents.map(event => ({
              ...event,
              eventDate: event.eventDate.toISOString(),
            }))} 
            showIntroSlide={true} 
          />
        </div>
      </div>

      {/* Event Catalog */}
      <main id="katalog-event" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Katalog Event</h2>
            <p className="text-sm text-slate-500 mt-1">Eksplorasi {totalEvents} event seru.</p>
          </div>

          {/* Search & Filter Form */}
          <form action="/" method="GET" className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="text" 
                name="q"
                defaultValue={q}
                placeholder="Cari event..." 
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="relative sm:w-40 flex-shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
              </div>
              <select 
                name="sort"
                defaultValue={sort}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>
            <button type="submit" className="px-5 py-2 bg-gradient-to-r from-blue-800 to-teal-500 text-white font-medium rounded-xl text-sm hover:from-blue-900 hover:to-teal-600 transition-all shadow-sm whitespace-nowrap">Terapkan</button>
          </form>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 sm:py-20 bg-white rounded-2xl border border-slate-200 border-dashed m-2">
            <Ticket className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-bold text-slate-700">Event Tidak Ditemukan</h3>
            <p className="text-sm text-slate-500 mt-2">Coba ubah kata kunci pencarian atau filter Anda.</p>
            {(q || sort !== 'newest') && (
              <Link href="/" className="mt-4 inline-block text-sm text-emerald-600 font-medium hover:underline">
                Reset Pencarian
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
              {events.map((event) => {
                const lowestPrice = event.ticketCategories.length > 0 
                  ? Math.min(...event.ticketCategories.map(t => t.price))
                  : 0;

                return (
                  <Link key={event.id} href={`/event/${event.slug}`} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 overflow-hidden transition-all duration-300 transform sm:hover:-translate-y-1 flex flex-col h-full active:scale-[0.98] sm:active:scale-100">
                    {/* Card Image */}
                    <div className="h-28 sm:h-48 bg-slate-200 relative overflow-hidden">
                      {event.bannerUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.bannerUrl} alt={event.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-blue-800 to-teal-400 group-hover:scale-105 transition-transform duration-500"></div>
                      )}
                      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-2 py-1 sm:px-3 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-bold text-slate-800 shadow-sm">
                        {event.eventDate.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 sm:p-6 flex flex-col flex-1">
                      <h3 className="text-sm sm:text-lg font-bold text-slate-800 line-clamp-2 mb-1.5 sm:mb-3 group-hover:text-emerald-600 transition-colors">
                        {event.title}
                      </h3>
                      
                      <div className="space-y-1.5 sm:space-y-2 mt-auto">
                        <div className="flex items-center text-[10px] sm:text-sm text-slate-500">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        
                        <div className="pt-2 sm:pt-4 mt-2 sm:mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-0">
                          <div className="text-[9px] sm:text-sm font-medium text-slate-500">Mulai dari</div>
                          <div className="text-sm sm:text-lg font-black text-teal-600">
                            {lowestPrice === 0 ? "Gratis" : `Rp ${lowestPrice.toLocaleString('id-ID')}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex justify-center items-center gap-2">
                {page > 1 ? (
                  <Link href={`/?q=${encodeURIComponent(q)}&sort=${sort}&page=${page - 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                ) : (
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
                    <ChevronLeft className="w-5 h-5" />
                  </div>
                )}
                
                <span className="text-sm font-medium text-slate-600 mx-2">
                  Halaman {page} dari {totalPages}
                </span>

                {page < totalPages ? (
                  <Link href={`/?q=${encodeURIComponent(q)}&sort=${sort}&page=${page + 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
      
      {/* Smooth Transition to Footer */}
      <div className="h-8 w-full bg-gradient-to-b from-transparent to-[#0B1527] mt-auto"></div>

      {/* Footer */}
      <footer className="relative bg-[#0B1527] py-10 sm:py-14 overflow-hidden">
        {/* Abstract lines background */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='none' stroke='%233C9FA7' stroke-width='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}></div>
        
        {/* Smooth Theme Ornaments */}
        <div className="absolute top-[-50%] left-[-10%] w-96 h-96 bg-teal-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-50%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-4 opacity-90">
             <Ticket className="w-5 h-5 text-teal-400" />
             <span className="text-lg font-black text-white tracking-widest uppercase">
                RTIO <span className="text-teal-400">TIX</span>
             </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">© 2026 RTIO TIX. Semua Hak Cipta Dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
