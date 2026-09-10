
"use client";
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function TermsModalClient() {
  const [showModal, setShowModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // Show modal once when payment page loads
    const hasSeenTerms = sessionStorage.getItem("hasSeenPaymentTerms");
    if (!hasSeenTerms) {
      setShowModal(true);
    }
  }, []);

  const handleNext = () => {
    if (acceptedTerms) {
      sessionStorage.setItem("hasSeenPaymentTerms", "true");
      setShowModal(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Syarat & Ketentuan</h3>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-600 space-y-4">
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4">
            <p className="font-bold text-orange-800 text-center uppercase">Mohon Dibaca Sebelum Melakukan Pembayaran</p>
          </div>
          <p>Sebelum melakukan pembayaran, pastikan Anda telah memahami dan menyetujui ketentuan berikut:</p>
          <ol className="list-decimal pl-5 space-y-3">
            <li><strong className="text-slate-700">Tiket yang telah dibeli tidak dapat dibatalkan atau meminta pengembalian uang</strong> karena alasan pribadi, termasuk berhalangan hadir, perubahan rencana, atau alasan lainnya dari pihak peserta.</li>
            <li>Pengembalian uang hanya diberikan apabila terdapat kesalahan atau kelalaian dari pihak penyelenggara yang menyebabkan hak/fasilitas peserta tidak dapat diberikan.</li>
            <li>Pastikan <strong className="text-slate-700">nama, nomor WhatsApp, kategori tiket, dan jumlah tiket sudah benar</strong> sebelum melakukan pembayaran.</li>
            <li>File tiket yang hilang akibat dari kelalaian peserta tidak dapat digantikan oleh pihak Penyelenggara.</li>
            <li>Pembayaran yang telah dilakukan dianggap sebagai persetujuan peserta terhadap seluruh ketentuan tiket.</li>
            <li>Dengan melanjutkan pembayaran, peserta menyatakan telah membaca, memahami, dan menyetujui ketentuan tersebut.</li>
          </ol>
        </div>
        
        <div className="p-6 border-t bg-slate-50 rounded-b-2xl">
          <label className="flex items-start gap-3 cursor-pointer mb-6 group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input 
                type="checkbox" 
                className="peer w-6 h-6 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer appearance-none checked:bg-emerald-500 checked:border-emerald-500 transition-colors"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <CheckCircle2 className="w-4 h-4 text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
            </div>
            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
              Saya telah membaca dan menyetujui ketentuan di atas dan siap melakukan pembayaran.
            </span>
          </label>
          
          <div className="flex gap-4">
            <button
              onClick={handleNext}
              disabled={!acceptedTerms}
              className={`w-full flex justify-center items-center py-3 px-4 font-bold rounded-xl transition-all ${
                !acceptedTerms ? "bg-emerald-200 text-emerald-50 cursor-not-allowed" : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30"
              }`}
            >
              Lanjut
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
