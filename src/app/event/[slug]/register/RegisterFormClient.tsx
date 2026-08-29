"use client";

import { useState } from "react";
import { Ticket, CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { submitRegistration } from "./actions";
import { useRouter } from "next/navigation";

export default function RegisterFormClient({ event, initialTicketId }: { event: any, initialTicketId?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'general' | 'quota'>('general');
  const router = useRouter();

  return (
    <form action={async (formData) => {
      setErrorMsg(null);
      setIsSubmitting(true);
      
      try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
        
        // Compress image files client-side before upload
        for (const field of event.fields) {
          if (field.type === 'FILE') {
            const file = formData.get(`customAnswer_${field.id}`) as File;
            if (file && file.size > 0) {
              const compressedFile = await imageCompression(file, options);
              formData.set(`customAnswer_${field.id}`, compressedFile, file.name);
            }
          }
        }
        
        const result = await submitRegistration(formData);
        if (result && result.success) {
          // Do NOT set isSubmitting to false, keep the button spinning while navigating!
          router.push(result.url);
        }
      } catch (error: any) {
        const message = error?.message || "Gagal memproses pendaftaran. Coba lagi.";
        // Detect quota-specific errors for special UI treatment
        const isQuotaError = message.toLowerCase().includes('habis') || message.toLowerCase().includes('kuota') || message.toLowerCase().includes('sisa');
        setErrorType(isQuotaError ? 'quota' : 'general');
        setErrorMsg(message);
        setIsSubmitting(false);
      }
    }} className="space-y-8">
      <input type="hidden" name="eventId" value={event.id} />
      
      {errorMsg && (
        <div className={`border-l-4 p-5 rounded-xl flex items-start gap-3 ${
          errorType === 'quota' 
            ? 'bg-orange-50 border-orange-500' 
            : 'bg-red-50 border-red-500'
        }`}>
          {errorType === 'quota' 
            ? <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className={`text-sm font-bold mb-1 ${
              errorType === 'quota' ? 'text-orange-800' : 'text-red-800'
            }`}>
              {errorType === 'quota' ? '⚠️ Tiket Tidak Tersedia' : 'Terjadi Kesalahan'}
            </p>
            <p className={`text-sm ${
              errorType === 'quota' ? 'text-orange-700' : 'text-red-700'
            }`}>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Section 1: Pilih Tiket */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Ticket className="w-5 h-5 mr-2 text-emerald-500" />
          1. Pilih Kategori Tiket
        </h2>
        
        <div className="space-y-4">
          {event.ticketCategories.map((ticket: any, index: number) => (
            <label key={ticket.id} className="relative flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:border-emerald-500 transition-colors bg-slate-50">
              <div className="flex items-center">
                <input 
                  type="radio" 
                  name="ticketCategoryId" 
                  value={ticket.id}
                  required
                  defaultChecked={initialTicketId ? ticket.id === initialTicketId : index === 0}
                  className="w-5 h-5 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                <div className="ml-4">
                  <span className="block text-sm font-bold text-slate-800">{ticket.name}</span>
                  <span className="block text-sm text-emerald-600 font-medium">
                    {ticket.price === 0 ? "Gratis" : `Rp ${ticket.price.toLocaleString('id-ID')}`}
                  </span>
                </div>
              </div>
              <div className="text-sm text-slate-500">
                Sisa: {ticket.quota}
              </div>
            </label>
          ))}
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah Tiket</label>
          <input 
            type="number" 
            name="ticketQuantity"
            defaultValue={1}
            min={1}
            max={5}
            required
            className="w-full sm:w-1/3 px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Section 2: Data Pemesan */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <span className="w-5 h-5 mr-2 flex justify-center items-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">2</span>
          Informasi Pemesan
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Nama Lengkap</label>
            <input 
              type="text" 
              name="buyerName"
              required
              placeholder="Misal: Budi Santoso"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Alamat Email</label>
            <input 
              type="email" 
              name="buyerEmail"
              required
              placeholder="budi@email.com"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nomor WhatsApp</label>
            <input 
              type="tel" 
              name="buyerPhone"
              required
              placeholder="081234567890"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Custom Form Fields */}
      {event.fields.length > 0 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="w-5 h-5 mr-2 flex justify-center items-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">3</span>
            Pertanyaan Tambahan
          </h2>
          
          <div className="space-y-6">
            {event.fields.map((field: any) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {field.name}
                  {field.isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input type="hidden" name="customFieldId[]" value={field.id} />
                
                {field.type === 'TEXT' && (
                  <input 
                    type="text" 
                    name={`customAnswer_${field.id}`}
                    required={field.isRequired}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                  />
                )}
                
                {field.type === 'NUMBER' && (
                  <input 
                    type="number" 
                    name={`customAnswer_${field.id}`}
                    required={field.isRequired}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                  />
                )}

                {field.type === 'PHONE' && (
                  <input 
                    type="tel" 
                    name={`customAnswer_${field.id}`}
                    required={field.isRequired}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                  />
                )}

                {field.type === 'SELECT' && field.options && (
                  <select 
                    name={`customAnswer_${field.id}`}
                    required={field.isRequired}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                  >
                    <option value="">-- Pilih {field.name} --</option>
                    {JSON.parse(field.options).map((opt: string, i: number) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'FILE' && (
                  <input 
                    type="file" 
                    name={`customAnswer_${field.id}`}
                    required={field.isRequired}
                    accept="image/*"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4">
        <button 
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex justify-center items-center px-6 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/50 transition-all text-lg shadow-lg shadow-emerald-500/30 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-6 h-6 mr-2 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6 mr-2" />
              Proses Pembayaran
            </>
          )}
        </button>
      </div>
    </form>
  );
}
