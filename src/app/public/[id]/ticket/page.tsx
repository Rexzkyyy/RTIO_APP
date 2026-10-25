import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowLeft, MessageCircle } from "lucide-react";
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

  const config = (transaction.event.ticketConfig as Record<string, string | boolean | undefined> | null) || {};
  const pageBgColor = (config.pageBgColor as string) || '#f8fafc';

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
          {transaction.tickets.length > 1 && (
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Kamu memiliki <span className="font-bold text-slate-800">{transaction.tickets.length} e-tiket</span> terdaftar dalam transaksi ini.
            </p>
          )}
        </div>

        {/* Ticket Cards */}
        <div className="w-full space-y-8">
          {transaction.tickets.map((ticket, index) => (
            <div key={ticket.id} className="w-full flex flex-col items-center">
              {transaction.tickets.length > 1 && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/10 text-slate-800 text-xs font-bold mb-3 no-print">
                  <span>Tiket #{index + 1} dari {transaction.tickets.length}</span>
                  {ticket.holderName && (
                    <span className="text-slate-600 font-medium">({ticket.holderName})</span>
                  )}
                </div>
              )}
              <TicketCard 
                data={{
                  barcodeString: ticket.barcodeString || 'UNKNOWN',
                  transaction: {
                    id: transaction.id,
                    buyerName: ticket.holderName || transaction.buyerName,
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
                  ticketCategoryName: ticket.ticketCategory?.name || 'Umum'
                }}
              />
            </div>
          ))}
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
