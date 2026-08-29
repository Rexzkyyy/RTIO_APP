"use client";

import { useState } from "react";
import imageCompression from "browser-image-compression";
import { uploadPaymentProof } from "../actions";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import CuteLoadingOverlay from "@/components/CuteLoadingOverlay";

export default function PaymentFormClient({ transactionId }: { transactionId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form 
      onSubmit={() => setIsSubmitting(true)}
      action={async (formData) => {
      setErrorMsg(null);
      // setIsSubmitting(true); handled by onSubmit
      
      try {
        const file = formData.get("paymentProof") as File;
        if (file && file.size > 0) {
          const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
          const compressedFile = await imageCompression(file, options);
          formData.set("paymentProof", compressedFile, file.name);
        }
        const result = await uploadPaymentProof(formData);
        if (result && result.success) {
          // Do NOT reset isSubmitting, let it spin until navigation completes
          router.push(result.url);
        }
      } catch (error) {
        console.error(error);
        setErrorMsg("Gagal memproses gambar. Pastikan format gambar valid.");
      } finally {
        setIsSubmitting(false);
      }
    }} className="space-y-6">
      <CuteLoadingOverlay isVisible={isSubmitting} />
      <input type="hidden" name="transactionId" value={transactionId} />
      
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center">
          <span className="text-red-800 text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-slate-800 mb-2">Konfirmasi Pembayaran</label>
        <p className="text-xs text-slate-500 mb-4">Upload foto/screenshot bukti transfer Anda di sini agar kami dapat memproses tiket Anda.</p>
        
        <input 
          type="file" 
          name="paymentProof"
          required
          accept="image/*"
          className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 border border-slate-200 rounded-xl p-2 cursor-pointer"
        />
      </div>

      {/* Desktop Button */}
      <button 
        type="submit"
        disabled={isSubmitting}
        className={`hidden md:flex w-full justify-center items-center px-6 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/50 transition-all shadow-lg shadow-emerald-500/30 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Memproses...
          </>
        ) : (
          'Proses Pembayaran'
        )}
      </button>

      {/* Mobile Sticky Bottom Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50">
        <button 
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex justify-center items-center px-6 py-3.5 bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Memproses...
            </>
          ) : (
            'Proses Pembayaran'
          )}
        </button>
      </div>
    </form>
  );
}
