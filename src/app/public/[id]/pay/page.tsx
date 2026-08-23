import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Copy, Receipt, Clock, ArrowLeft, Ticket } from "lucide-react";
import { uploadPaymentProof } from "../actions";
import InteractiveBackground from "@/components/InteractiveBackground";
import WhatsAppSaveButton from "@/components/WhatsAppSaveButton";
import PaymentFormClient from "./PaymentFormClient";
import PublicNavbar from "@/components/PublicNavbar";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
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

  // If transaction is expired
  if (transaction.status === "EXPIRED") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-200 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Waktu Habis</h1>
          <p className="text-slate-600 mb-6">
            Batas waktu pembayaran untuk transaksi ini telah habis (1 jam). Transaksi dibatalkan dan kuota tiket telah dikembalikan.
          </p>
          <Link href={`/event/${transaction.event.slug}`} className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold">
            Pesan Tiket Ulang
          </Link>
        </div>
      </div>
    );
  }

  // Redirect if they shouldn't be here
  if (transaction.totalPrice === 0 || transaction.status === "APPROVED") {
    redirect(`/public/${transaction.id}/ticket`);
  }
  if (transaction.paymentProofUrl) {
    redirect(`/public/${transaction.id}/verify`);
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col relative z-0 pb-32 md:pb-0">
      <InteractiveBackground />
      
      <PublicNavbar />

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-8 flex flex-col items-center relative z-10">
        
        {/* Status Header */}
        <div className="text-center w-full max-w-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-500 mb-4">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Selesaikan Pembayaran</h1>
          <p className="text-slate-500 mt-2 mb-4">
            ID Transaksi: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded">{transaction.id}</span>
          </p>
          
          {transaction.expiresAt && (
            <div className="inline-flex items-center bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-medium border border-orange-200">
              <Clock className="w-4 h-4 mr-2" />
              Selesaikan sebelum: {new Date(transaction.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </div>
          )}
        </div>

        {/* Payment Instructions */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-emerald-200 relative overflow-hidden w-full max-w-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
          
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-emerald-500" />
            Instruksi Pembayaran
          </h2>
          
          <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 mb-6">
            <p className="text-sm text-emerald-800 mb-2">Total yang harus dibayar:</p>
            <div className="text-4xl font-black text-emerald-600">
              Rp {transaction.totalPrice.toLocaleString('id-ID')}
            </div>
          </div>

          <div className="space-y-4 text-slate-600 text-sm">
            <p>Silakan transfer tepat sesuai nominal di atas ke salah satu rekening berikut:</p>
            
            {transaction.event.bankAccounts && Array.isArray(transaction.event.bankAccounts) && transaction.event.bankAccounts.length > 0 ? (
              (transaction.event.bankAccounts as any[]).map((account, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div>
                    <div className="font-bold text-slate-800 text-lg">{account.bank}</div>
                    <div className="font-mono text-slate-600 mt-1">{account.number}</div>
                    <div className="text-xs text-slate-500 mt-1">a.n. {account.name}</div>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Salin Rekening">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
                <div>
                  <div className="font-bold text-slate-800 text-lg">BCA</div>
                  <div className="font-mono text-slate-600 mt-1">1234 5678 90</div>
                  <div className="text-xs text-slate-500 mt-1">a.n. PT RTIO Ticketing</div>
                </div>
                <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Salin Rekening">
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <hr className="my-8 border-slate-200" />

          <PaymentFormClient transactionId={transaction.id} />
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

        <div className="text-center w-full max-w-2xl">
          <Link href="/" className="text-emerald-600 font-medium hover:underline">
            Kembali ke Beranda
          </Link>
        </div>

      </div>
    </div>
  );
}
