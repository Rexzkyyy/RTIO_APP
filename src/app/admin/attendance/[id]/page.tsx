import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Users, Download, Search, CheckCircle2, FileText, Calendar } from "lucide-react";
import { Metadata } from "next";
import AttendanceClient from "./AttendanceClient";

export const metadata: Metadata = {
  title: "Detail Kehadiran — Admin RTIO TIX",
  description: "Daftar peserta yang hadir pada event.",
};

export const dynamic = "force-dynamic";

export default async function AttendanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  const cookieStore = await cookies();
  const bypassRole = process.env.NODE_ENV !== "production"
    ? cookieStore.get("dev-admin-bypass")?.value
    : null;

  if (!session?.user && !bypassRole) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const eventId = resolvedParams.id;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      fields: true
    }
  });

  if (!event) notFound();

  // Fetch all checked-in tickets for this event
  const checkedInTickets = await prisma.ticket.findMany({
    where: {
      ticketCategory: { eventId },
      isValidated: true
    },
    include: {
      ticketCategory: true,
      transaction: true,
      answers: {
        include: {
          field: true
        }
      }
    },
    orderBy: {
      checkedInAt: 'desc'
    }
  });

  const serializableTickets = checkedInTickets.map(t => ({
    id: t.id,
    barcodeString: t.barcodeString,
    holderName: t.holderName || t.transaction.buyerName,
    holderPhone: t.holderPhone || t.transaction.buyerPhone,
    holderGender: t.holderGender || t.transaction.buyerGender,
    categoryName: t.ticketCategory.name,
    checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
    answers: t.answers.map(a => ({
      fieldName: a.field.name,
      value: a.value
    }))
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/attendance" className="p-2 bg-white text-slate-500 hover:text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors shrink-0 shadow-sm border border-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Data Kehadiran</h1>
            <p className="text-slate-500 mt-1 flex items-center text-sm sm:text-base">
              <Calendar className="w-4 h-4 mr-2" />
              {event.title}
            </p>
          </div>
        </div>
        
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-3 w-fit shrink-0">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Hadir</div>
            <div className="text-xl font-black text-emerald-700 leading-none mt-0.5">{serializableTickets.length} <span className="text-sm font-medium">Orang</span></div>
          </div>
        </div>
      </div>

      <AttendanceClient tickets={serializableTickets} eventTitle={event.title} />
    </div>
  );
}
