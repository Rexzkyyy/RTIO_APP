"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import imageCompression from "browser-image-compression";
import { uploadPaymentProof } from "../actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { showCuteLoader, hideCuteLoader } from "@/components/CuteLoadingOverlay";

export default function PaymentFormClient({ transactionId }: { transactionId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // Matikan loader global saat halaman Pay berhasil dimuat
  useEffect(() => {
    hideCuteLoader();
  }, []);

  return (
    <form 
      onSubmit={() => {
        setIsSubmitting(true);
        showCuteLoader();
      }}
      action={async (formData) => {
      setErrorMsg(null);
      
      try {
        const file = formData.get("paymentProof") as File;
        if (file && file.size > 0) {
          const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
          const compressedFile = await imageCompression(file, options);
          formData.set("paymentProof", compressedFile, file.name);
        }
        const result = await uploadPaymentProof(formData);
        if (result && result.success) {
          router.push(result.url);
        }
      } catch (error) {
        console.error(error);
        setErrorMsg("Gagal memproses gambar. Pastikan format gambar valid.");
        setIsSubmitting(false);
        hideCuteLoader();
      }
    }} className="space-y-6">
      <input type="hidden" name="transactionId" value={transactionId} />
      
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center">
          <span className="text-red-800 text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-2">Nama Pemilik Rekening</label>
        <p className="text-xs text-slate-500 mb-3">Masukkan nama lengkap pemilik rekening yang digunakan untuk transfer.</p>
        <input 
          type="text" 
          name="senderAccountName"
          required
          placeholder="Contoh: Budi Santoso"
          className="w-full text-sm text-slate-800 border border-slate-200 rounded-xl p-3 mb-6 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <label className="block text-sm font-bold text-slate-800 mb-2">Bukti Transfer</label>
        <p className="text-xs text-slate-500 mb-4">Upload foto/screenshot struk bukti transfer Anda di sini.</p>
        
        <input 
          type="file" 
          name="paymentProof"
          required
          accept="image/*"
          className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 border border-slate-200 rounded-xl p-2 cursor-pointer"
        />
      </div>

      {/* Submit Button */}
      <button 
        type="submit"
        disabled={isSubmitting}
        className={`flex w-full justify-center items-center px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/50 transition-all text-base shadow-lg shadow-emerald-500/30 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
      >
        Proses Pembayaran
      </button>
    </form>
  );
}
