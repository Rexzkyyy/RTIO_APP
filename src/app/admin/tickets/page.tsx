import Link from "next/link";
import { Calendar as CalendarIcon, MapPin, Search, ChevronLeft, ChevronRight, Palette } from "lucide-react";
import prisma from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const pageStr = typeof params.page === 'string' ? params.page : '1';
  const page = parseInt(pageStr, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' as const } },
      { location: { contains: q, mode: 'insensitive' as const } },
    ];
  }

  // Get current user session
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);

  // If user is VALIDATOR, filter by assigned events
  // @ts-ignore
  if (session?.user?.adminRole === "VALIDATOR" && session?.user?.adminId) {
    const assignedEvents = await prisma.adminEventAccess.findMany({
      // @ts-ignore
      where: { adminId: session.user.adminId },
      select: { eventId: true }
    });
    const eventIds = assignedEvents.map(a => a.eventId);
    where.id = { in: eventIds };
  }

  const totalEvents = await prisma.event.count({ where });
  const totalPages = Math.ceil(totalEvents / limit);

  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Desain Tiket</h1>
          <p className="text-slate-500 mt-1">Pilih event untuk mengubah tampilan desain tiket (CMS Semi).</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <form className="relative flex-1 sm:w-64">
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
            <input type="hidden" name="page" value="1" />
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <CalendarIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Belum ada event</h3>
            <p className="mt-1 text-slate-500">Mulai buat event terlebih dahulu.</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="h-32 bg-slate-900 relative overflow-hidden">
                {(event.ticketDesignUrl || event.bannerUrl) ? (
                  <img src={(event.ticketDesignUrl || event.bannerUrl) as string} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-teal-500 opacity-60"></div>
                )}
                <div className="absolute bottom-4 left-4 right-4 text-white z-10 drop-shadow-md">
                  <h3 className="text-lg font-bold line-clamp-1">{event.title}</h3>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center text-sm text-slate-500 mb-2">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {new Date(event.eventDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center text-sm text-slate-500 mb-6">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="line-clamp-1">{event.location}</span>
                </div>
                <div className="mt-auto">
                  <Link 
                    href={`/admin/tickets/${event.id}`}
                    className="w-full flex items-center justify-center px-4 py-2 bg-emerald-50 text-emerald-600 font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                  >
                    <Palette className="w-4 h-4 mr-2" />
                    Edit Desain Tiket
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          {page > 1 ? (
            <Link href={`/admin/tickets?q=${encodeURIComponent(q)}&page=${page - 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
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
            <Link href={`/admin/tickets?q=${encodeURIComponent(q)}&page=${page + 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
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
