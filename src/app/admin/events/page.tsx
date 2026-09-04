import Link from "next/link";
import { PlusCircle, Calendar as CalendarIcon, MapPin, Users, ListPlus, ExternalLink, Receipt, Search, ChevronLeft, ChevronRight } from "lucide-react";
import prisma from "@/lib/prisma";
import { DeleteEventButton } from "@/components/admin/DeleteEventButton";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Server Component
export default async function EventsPage({ searchParams }: Props) {
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
      { slug: { contains: q, mode: 'insensitive' as const } },
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

  // Fetch events from the database
  const events = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      ticketCategories: true,
      _count: {
        select: { transactions: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Event</h1>
          <p className="text-slate-500 mt-1">Kelola semua event komunitas Anda di sini.</p>
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
              placeholder="Cari event atau lokasi..." 
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input type="hidden" name="page" value="1" />
          </form>
          {!session?.user?.adminRole || (session?.user?.adminRole as string) !== "VALIDATOR" ? (
            <Link 
              prefetch={false}
              href="/admin/events/create" 
              className="flex items-center justify-center px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Buat Event Baru
            </Link>
          ) : null}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <CalendarIcon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Belum ada event</h3>
            <p className="mt-1 text-slate-500">Mulai buat event pertama Anda untuk mengundang peserta.</p>
            <div className="mt-6">
              {!session?.user?.adminRole || (session?.user?.adminRole as string) !== "VALIDATOR" ? (
                <Link 
                  prefetch={false}
                  href="/admin/events/create" 
                  className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Buat Event
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tanggal & Lokasi</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Harga & Kuota</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Link Publik</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{event.title}</div>
                            <div className="text-sm text-slate-500">/{event.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-slate-900">
                          <CalendarIcon className="w-4 h-4 mr-2 text-slate-400" />
                          {new Date(event.eventDate).toLocaleDateString('id-ID')}
                        </div>
                        <div className="flex items-center text-sm text-slate-500 mt-1">
                          <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                          {event.location}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 font-medium">
                          {event.ticketCategories.length > 0 
                            ? `Mulai Rp ${Math.min(...event.ticketCategories.map(t => t.price)).toLocaleString('id-ID')}` 
                            : 'Belum diatur'}
                        </div>
                        <div className="flex items-center text-sm text-slate-500 mt-1">
                          <Users className="w-4 h-4 mr-1 text-slate-400" />
                          {event.ticketCategories.reduce((acc, curr) => acc + curr.quota, 0)} Total Kuota
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {event.isActive ? 'Aktif' : 'Tutup'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a href={`/event/${event.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center">
                          /event/{event.slug}
                          <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* @ts-ignore */}
                        {(!session?.user?.adminRole || (session?.user?.adminRole as string) !== "VALIDATOR") && (
                          <>
                            <Link prefetch={false} href={`/admin/events/${event.id}/form-builder`} className="text-emerald-600 hover:text-emerald-900 mr-4" title="Form Builder">
                              <ListPlus className="w-5 h-5 inline-block" />
                            </Link>
                            <Link prefetch={false} href={`/admin/events/${event.id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit Event">
                              Edit
                            </Link>
                            <DeleteEventButton id={event.id} />
                          </>
                        )}
                        <Link prefetch={false} href={`/admin/transactions?eventId=${event.id}&status=PENDING`} className="text-blue-600 hover:text-blue-900 ml-4 border border-blue-200 px-3 py-1.5 rounded-lg inline-flex items-center" title="Validasi Tiket">
                          <Receipt className="w-4 h-4 mr-1.5" />
                          <span>Validasi ({event._count.transactions})</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 bg-slate-50">
              {events.map((event) => (
                <div key={event.id} className="p-5 bg-white space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="text-base font-bold text-slate-900 leading-tight">{event.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">/{event.slug}</div>
                    </div>
                    <span className={`px-2 py-1 text-[9px] uppercase tracking-wider font-bold rounded-md shrink-0 ${event.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {event.isActive ? 'Aktif' : 'Tutup'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                    <div className="flex items-center text-slate-600">
                      <CalendarIcon className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{new Date(event.eventDate).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <MapPin className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{event.location}</span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <Receipt className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-emerald-600">
                        {event.ticketCategories.length > 0 
                          ? `Rp ${Math.min(...event.ticketCategories.map(t => t.price)).toLocaleString('id-ID')}` 
                          : 'Belum diatur'}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-600">
                      <Users className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">
                        {event.ticketCategories.reduce((acc, curr) => acc + curr.quota, 0)} Kuota
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-3 mt-3 border-t border-slate-100">
                    <div>
                      <a href={`/event/${event.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium items-center transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Lihat Web
                      </a>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 w-full">
                      {(!session?.user?.adminRole || (session?.user?.adminRole as string) !== "VALIDATOR") && (
                        <>
                          <Link prefetch={false} href={`/admin/events/${event.id}/form-builder`} className="flex-1 min-w-[45%] py-2 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 text-center flex items-center justify-center transition-colors">
                            <ListPlus className="w-3.5 h-3.5 mr-1.5" />
                            Form
                          </Link>
                          <Link prefetch={false} href={`/admin/events/${event.id}/edit`} className="flex-1 min-w-[45%] py-2 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 text-center flex items-center justify-center transition-colors">
                            Edit
                          </Link>
                          <DeleteEventButton id={event.id} className="flex-1 min-w-[45%] py-2 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 text-center transition-colors" />
                        </>
                      )}
                      <Link prefetch={false} href={`/admin/transactions?eventId=${event.id}&status=PENDING`} className="flex-1 min-w-[45%] py-2 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 text-center flex items-center justify-center transition-colors">
                        <Receipt className="w-3.5 h-3.5 mr-1.5" />
                        Validasi ({event._count.transactions})
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          {page > 1 ? (
            <Link prefetch={false} href={`/admin/events?q=${encodeURIComponent(q)}&page=${page - 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
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
            <Link prefetch={false} href={`/admin/events?q=${encodeURIComponent(q)}&page=${page + 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
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
