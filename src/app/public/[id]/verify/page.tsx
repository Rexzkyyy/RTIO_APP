import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Info, Clock, ArrowLeft, Ticket } from "lucide-react";
import InteractiveBackground from "@/components/InteractiveBackground";
import WhatsAppSaveButton from "@/components/WhatsAppSaveButton";
import PublicNavbar from "@/components/PublicNavbar";

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (transaction.totalPrice === 0 || transaction.status === "APPROVED") {
    redirect(`/public/${transaction.id}/ticket`);
  }
  if (!transaction.paymentProofUrl) {
    redirect(`/public/${transaction.id}/pay`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex flex-col relative z-0 pb-24 md:pb-0">
      <PublicNavbar />

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-8 space-y-6 flex flex-col items-center relative z-10">
        
        {/* Status Header */}
        <div className="text-center w-full max-w-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 text-yellow-500 mb-6 shadow-sm border border-yellow-200">
            <Clock className="w-10 h-10 animate-spin" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Menunggu Verifikasi</h1>
          <p className="text-slate-500 mt-2">
            ID Transaksi: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">{transaction.id}</span>
          </p>
        </div>

        {/* Pending Verification Message */}
        <div className="bg-yellow-50 p-6 sm:p-8 rounded-2xl border border-yellow-200 flex flex-col items-center text-center w-full max-w-2xl shadow-sm">
          <div className="flex items-center justify-center mb-3">
             <Info className="w-6 h-6 text-yellow-600 mr-2" />
             <h3 className="font-bold text-yellow-800 text-lg">Bukti Transfer Sedang Dicek</h3>
          </div>
          <p className="text-yellow-700 text-sm mb-6">
            Terima kasih telah mengirimkan bukti pembayaran. Admin kami akan segera memvalidasi pembayaran Anda dalam waktu maksimal 1x24 jam.
          </p>
          
          <div className="bg-white p-5 rounded-xl border border-yellow-200 w-full mb-2 shadow-sm">
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              <span className="font-bold text-slate-800">💡 Simpan link halaman ini!</span><br/>
              Pastikan Anda tidak kehilangan halaman ini. Silakan simpan tautannya ke WhatsApp Anda dengan menekan tombol di bawah, sehingga Anda bisa dengan mudah mengecek status tiket kapan saja.
            </p>
            <div className="flex justify-center">
              <WhatsAppSaveButton eventTitle={transaction.event.title} transactionId={transaction.id} buyerName={transaction.buyerName} isPending={true} />
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full max-w-2xl">
          <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Detail Pesanan</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Event</span>
              <span className="font-medium text-slate-800 text-right">{transaction.event.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kategori Tiket</span>
              <span className="font-medium text-slate-800">{transaction.tickets[0]?.ticketCategory.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jumlah</span>
              <span className="font-medium text-slate-800">{transaction.totalTickets} Tiket</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Atas Nama</span>
              <span className="font-medium text-slate-800">{transaction.buyerName}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile Sticky Bottom Bar (One-Handed UX) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex justify-center items-center">
        <Link 
          href="/" 
          className="w-full px-6 py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 active:scale-95 transition-all shadow-md text-center"
        >
          Kembali ke Beranda
        </Link>
      </div>

      {/* Desktop Bottom Button */}
      <div className="hidden md:flex justify-center w-full max-w-2xl mx-auto pb-12">
        <Link href="/" className="text-yellow-600 font-medium hover:text-yellow-700 hover:underline">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
