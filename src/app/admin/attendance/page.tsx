import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { Calendar, Users, ChevronRight, Clock, MapPin } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kehadiran Peserta — Admin RTIO TIX",
  description: "Lihat daftar kehadiran peserta per event.",
};

export const dynamic = "force-dynamic";

export default async function AttendanceSelectEventPage() {
  const session = await getServerSession(authOptions);

  const cookieStore = await cookies();
  const bypassRole = process.env.NODE_ENV !== "production"
    ? cookieStore.get("dev-admin-bypass")?.value
    : null;

  if (!session?.user && !bypassRole) {
    redirect("/login");
  }

  // Fetch all active events
  const events = await prisma.event.findMany({
    where: { isActive: true },
    orderBy: { eventDate: 'desc' },
    select: {
      id: true,
      title: true,
      eventDate: true,
      location: true,
      bannerUrl: true,
    }
  });

  const eventsWithCount = await Promise.all(events.map(async (event) => {
    const count = await prisma.ticket.count({
      where: {
        ticketCategory: { eventId: event.id },
        isValidated: true
      }
    });
    return { ...event, attendanceCount: count };
  }));

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Data Kehadiran Peserta</h1>
          <p className="text-slate-500 mt-2">Pilih event untuk melihat daftar peserta yang sudah check-in.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Belum Ada Event Aktif</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Anda belum memiliki event aktif. Buat event terlebih dahulu untuk dapat mengelola kehadiran peserta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventsWithCount.map(event => {
            const nowCheck = new Date();
            const eventDateForCheck = new Date(event.eventDate);
            const isFinished = nowCheck > new Date(eventDateForCheck.setHours(23, 59, 59, 999));
            return (
            <Link 
              key={event.id}
              href={`/admin/attendance/${event.id}`}
              className={`rounded-2xl border border-slate-200 overflow-hidden transition-all group flex flex-col h-full ${isFinished ? 'bg-slate-100/70 opacity-75 grayscale-[0.5]' : 'bg-white hover:shadow-xl hover:-translate-y-1'}`}
            >
              <div className="h-40 bg-slate-100 relative overflow-hidden shrink-0">
                {event.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.bannerUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
                    <span className="text-white/50 font-bold text-2xl tracking-widest uppercase px-4 text-center">{event.title}</span>
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">{event.attendanceCount} Hadir</span>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-slate-800 mb-4 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors">
                  {event.title}
                </h3>
                
                <div className="mt-auto space-y-2.5">
                  <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <Clock className="w-4 h-4 mr-2.5 text-emerald-500 shrink-0" />
                    {event.eventDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })}
                  </div>
                  <div className="flex items-center text-sm text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <MapPin className="w-4 h-4 mr-2.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-emerald-600 font-medium">
                  <span className="text-sm">Lihat Kehadiran</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 group-hover:scale-110 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          )})}
        </div>
      )}
    </div>
  );
}
