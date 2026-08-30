import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, Ticket } from "lucide-react";
import TicketCard from "@/components/TicketCard";
import InteractiveBackground from "@/components/InteractiveBackground";
import PublicNavbar from "@/components/PublicNavbar";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const transaction = await prisma.transaction.findUnique({
    where: { id: resolvedParams.id },
    include: {
      event: true,
      tickets: {
        include: { ticketCategory: true }
      }
    }
  });

  if (!transaction) notFound();

  const isFree = transaction.totalPrice === 0;

  if (!isFree && transaction.status !== "APPROVED") {
    // If pending but proof uploaded
    if (transaction.paymentProofUrl) {
      redirect(`/public/${transaction.id}/verify`);
    } else {
      // If pending and no proof
      redirect(`/public/${transaction.id}/pay`);
    }
  }

  const config = (transaction.event.ticketConfig as any) || {};
  const pageBgColor = config.pageBgColor || '#f8fafc';

  return (
    <div 
      className="min-h-screen flex flex-col relative z-0 pb-32 md:pb-0 transition-colors duration-300"
      style={{ backgroundColor: pageBgColor }}
    >
      <InteractiveBackground />
      
      <PublicNavbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-8 flex flex-col items-center relative z-10">
        
        {/* Status Header */}
        <div className="text-center w-full max-w-2xl no-print">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-500 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Pendaftaran Berhasil!</h1>
          <p className="text-slate-500 mt-2">
            ID Transaksi: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">{transaction.id}</span>
          </p>
        </div>

        {/* Ticket Card */}
        <div className="w-full max-w-6xl">

          <TicketCard 
            data={{
              transaction: {
                id: transaction.id,
                buyerName: transaction.buyerName,
                totalTickets: transaction.totalTickets,
                status: transaction.status,
                totalPrice: transaction.totalPrice
              },
              event: {
                title: transaction.event.title,
                eventDate: transaction.event.eventDate.toISOString(),
                location: transaction.event.location,
                bannerUrl: transaction.event.bannerUrl,
                ticketDesignUrl: transaction.event.ticketDesignUrl,
                description: transaction.event.description,
                artists: transaction.event.artists,
                sponsors: transaction.event.sponsors
              },
              ticketCategoryName: transaction.tickets[0]?.ticketCategory.name || 'Umum'
            }}
          />
        </div>

        {/* Desktop Bottom Button */}
        <div className="hidden md:flex justify-center w-full max-w-2xl no-print pb-12">
          <Link href="/" className="text-emerald-600 font-medium hover:underline">
            Kembali ke Beranda
          </Link>
        </div>

        {/* Mobile Sticky Bottom Button */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 no-print">
          <Link 
            href="/"
            className="w-full flex justify-center items-center px-6 py-3.5 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md"
          >
            Kembali ke Beranda
          </Link>
        </div>

      </div>
    </div>
  );
}
