import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, Ticket, MessageCircle } from "lucide-react";
import TicketCard from "@/components/TicketCard";
import InteractiveBackground from "@/components/InteractiveBackground";
import PublicNavbar from "@/components/PublicNavbar";

export const dynamic = "force-dynamic";

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
      className="min-h-screen flex flex-col relative z-0 pb-12 transition-colors duration-300"
      style={{ backgroundColor: pageBgColor }}
    >
      <InteractiveBackground />
      
      <PublicNavbar />

      <div className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 xl:px-12 py-8 space-y-8 flex flex-col items-center relative z-10">
        
        {/* Status Header */}
        <div className="text-center w-full max-w-2xl no-print">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-500 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Pendaftaran Berhasil!</h1>
        </div>

        {/* Ticket Card */}
        <div className="w-full">
          <TicketCard 
            data={{
              barcodeString: transaction.tickets[0]?.barcodeString || 'UNKNOWN',
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
                sponsors: transaction.event.sponsors,
                ticketConfig: config
              },
              ticketCategoryName: transaction.tickets[0]?.ticketCategory.name || 'Umum'
            }}
          />
        </div>

        {transaction.event.waGroupLink && (
          <div className="bg-white p-5 rounded-xl border border-emerald-200 w-full max-w-2xl shadow-sm mt-4 no-print">
            <p className="text-sm text-slate-600 mb-4 leading-relaxed text-center">
              <span className="font-bold text-emerald-800">🗣️ Bergabung ke Grup WhatsApp!</span><br/>
              Silakan bergabung ke grup WhatsApp event untuk mendapatkan informasi terbaru terkait acara ini.
            </p>
            <div className="flex justify-center">
              <a 
                href={transaction.event.waGroupLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 active:scale-95 transition-all shadow-md w-full sm:w-auto"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Gabung Grup WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Bottom Button */}
        <div className="flex justify-center w-full max-w-2xl no-print pt-2 pb-8">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all shadow-sm active:scale-95 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Link>
        </div>

      </div>
    </div>
  );
}
