"use client";

import { useState } from "react";
import { Ticket, CheckCircle2, AlertCircle, XCircle, Loader2, Users } from "lucide-react";
import imageCompression from "browser-image-compression";
import { submitRegistration } from "./actions";
import { useRouter } from "next/navigation";
import CuteLoadingOverlay from "@/components/CuteLoadingOverlay";

export default function RegisterFormClient({ event, initialTicketId }: { event: any, initialTicketId?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quantity, setQuantity] = useState<number | string>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'general' | 'quota'>('general');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = event.fields.length > 0 ? 3 : 2;

  const handleNext = () => {
    const currentStepEl = document.getElementById(`step-${step}`);
    if (!currentStepEl) return;
    
    const inputs = currentStepEl.querySelectorAll('input, select, textarea') as NodeListOf<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    let isValid = true;
    
    for (let i = 0; i < inputs.length; i++) {
      if (!inputs[i].checkValidity()) {
        inputs[i].reportValidity();
        isValid = false;
        break;
      }
    }
    
    if (isValid) {
      setStep(prev => Math.min(prev + 1, totalSteps));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <form 
      id="register-form"
      onSubmit={(e) => {
        if (step < totalSteps) {
          e.preventDefault();
          handleNext();
        } else {
          setIsSubmitting(true);
        }
      }}
      action={async (formData) => {
      setErrorMsg(null);
      // setIsSubmitting(true); is handled by onSubmit
      
      try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1280, useWebWorker: true };
        
        const formatPhone = (val: string | null) => {
          if (!val) return val;
          let cleaned = val.toString().replace(/\D/g, '');
          if (cleaned.startsWith('62')) return '+' + cleaned;
          if (cleaned.startsWith('0')) return '+62' + cleaned.substring(1);
          return '+62' + cleaned;
        };

        const buyerPhone = formData.get('buyerPhone');
        if (buyerPhone) formData.set('buyerPhone', formatPhone(buyerPhone as string)!);

        for (let i = 1; i < Number(quantity); i++) {
          const holderPhone = formData.get(`holderPhone_${i}`);
          if (holderPhone) formData.set(`holderPhone_${i}`, formatPhone(holderPhone as string)!);
        }

        // Compress image files client-side before upload
        for (const field of event.fields) {
          if (field.type === 'PHONE') {
            const customPhone = formData.get(`customAnswer_${field.id}`);
            if (customPhone) formData.set(`customAnswer_${field.id}`, formatPhone(customPhone as string)!);
          }
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
      <CuteLoadingOverlay isVisible={isSubmitting} />
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

      {/* Stepper Header */}
      <div className="mb-10 mt-2">
        <div className="flex items-center justify-between relative px-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-300"
            style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
          ></div>
          
          {[1, 2, totalSteps === 3 ? 3 : null].filter(Boolean).map((s) => (
            <div key={s as number} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors ${
                step >= (s as number) ? 'bg-emerald-500 border-emerald-100 text-white' : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {step > (s as number) ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              <span className={`text-xs font-bold mt-2 absolute -bottom-6 whitespace-nowrap ${
                step >= (s as number) ? 'text-emerald-700' : 'text-slate-400'
              }`}>
                {s === 1 ? 'Pilih Tiket' : s === 2 ? 'Data Diri' : 'Tambahan'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Pilih Tiket */}
      <div id="step-1" className={step === 1 ? 'block' : 'hidden'}>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
          <Ticket className="w-5 h-5 mr-2 text-emerald-500" />
          1. Pilih Kategori Tiket
        </h2>
        
        <div className="space-y-4">
          {event.ticketCategories.map((ticket: any, index: number) => {
            const now = new Date();
            const discountStart = ticket.discountStartDate ? new Date(ticket.discountStartDate) : null;
            const discountEnd = ticket.discountEndDate ? new Date(ticket.discountEndDate) : null;
            const isDiscountActive = ticket.hasDiscount && ticket.discountPrice != null && 
              (!discountStart || now >= discountStart) && 
              (!discountEnd || now <= discountEnd);
            const activePrice = isDiscountActive ? ticket.discountPrice : ticket.price;

            return (
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
                      {activePrice === 0 ? "Gratis" : `Rp ${activePrice.toLocaleString('id-ID')}`}
                    </span>
                    {isDiscountActive && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded-full">
                        🔥 FLASH SALE
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  Sisa: {ticket.quota}
                </div>
              </label>
            );
          })}
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Jumlah Tiket</label>
          <input 
            type="number" 
            name="ticketQuantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
            min={1}
            max={5}
            required
            className="w-full sm:w-1/3 px-4 py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
          />
        </div>
      </div>
      </div>

      {/* STEP 2: Data Diri */}
      <div id="step-2" className={step === 2 ? 'block space-y-8' : 'hidden'}>
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
            <div className="flex relative">
              <span className="inline-flex items-center px-4 py-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-600 font-bold text-sm">
                +62
              </span>
              <input 
                type="tel" 
                name="buyerPhone"
                required
                placeholder="81234567890"
                className="w-full px-4 py-3 rounded-r-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                onInput={(e) => {
                  let val = e.currentTarget.value;
                  if (val.startsWith('0')) e.currentTarget.value = val.substring(1);
                  else if (val.startsWith('62')) e.currentTarget.value = val.substring(2);
                  else if (val.startsWith('+62')) e.currentTarget.value = val.substring(3);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2.5: Data Pemegang Tiket (Jika > 1) */}
      {Number(quantity) > 1 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <span className="w-5 h-5 mr-2 flex justify-center items-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold"><Users className="w-3 h-3"/></span>
            Data Pemegang Tiket
          </h2>
          <p className="text-sm text-slate-500 mb-4">Anda memesan {quantity} tiket. Data pemesan utama otomatis menjadi pemegang Tiket 1. Silakan lengkapi data untuk tiket tambahannya.</p>
          
          <div className="space-y-6">
            {Array.from({ length: Number(quantity) - 1 }).map((_, idx) => {
              const i = idx + 1; // Start from 1 for Ticket 2
              return (
              <div key={i} className="p-5 border rounded-xl bg-slate-50 relative">
                <h3 className="font-bold text-slate-800 mb-4">Pemegang Tiket {i + 1}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nama Lengkap <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name={`holderName_${i}`}
                      required
                      placeholder="Nama sesuai identitas"
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nomor WhatsApp <span className="text-red-500">*</span></label>
                    <div className="flex relative">
                      <span className="inline-flex items-center px-3 py-2.5 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-600 font-bold text-sm">
                        +62
                      </span>
                      <input 
                        type="tel" 
                        name={`holderPhone_${i}`}
                        required
                        placeholder="812..."
                        className="w-full px-3 py-2.5 rounded-r-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                        onInput={(e) => {
                          let val = e.currentTarget.value;
                          if (val.startsWith('0')) e.currentTarget.value = val.substring(1);
                          else if (val.startsWith('62')) e.currentTarget.value = val.substring(2);
                          else if (val.startsWith('+62')) e.currentTarget.value = val.substring(3);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}
      </div>

      {/* STEP 3: Pertanyaan Tambahan */}
      {totalSteps === 3 && (
        <div id="step-3" className={step === 3 ? 'block' : 'hidden'}>
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
                  <div className="flex relative">
                    <span className="inline-flex items-center px-4 py-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 text-slate-600 font-bold text-sm">
                      +62
                    </span>
                    <input 
                      type="tel" 
                      name={`customAnswer_${field.id}`}
                      required={field.isRequired}
                      placeholder="812..."
                      className="w-full px-4 py-3 rounded-r-lg border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                      onInput={(e) => {
                        let val = e.currentTarget.value;
                        if (val.startsWith('0')) e.currentTarget.value = val.substring(1);
                        else if (val.startsWith('62')) e.currentTarget.value = val.substring(2);
                        else if (val.startsWith('+62')) e.currentTarget.value = val.substring(3);
                      }}
                    />
                  </div>
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
      </div>
      )}

      {/* Navigation Buttons */}
      <div className="pt-6 flex gap-4">
        {step > 1 && (
          <button 
            type="button"
            onClick={handlePrev}
            disabled={isSubmitting}
            className="w-1/3 md:w-1/4 flex justify-center items-center px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all text-base border border-slate-300"
          >
            Kembali
          </button>
        )}
        
        {step < totalSteps ? (
          <button 
            type="button"
            onClick={handleNext}
            className="flex-1 flex justify-center items-center px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/50 transition-all text-base shadow-lg shadow-emerald-500/30"
          >
            Selanjutnya
          </button>
        ) : (
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center items-center px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/50 transition-all text-base shadow-lg shadow-emerald-500/30 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
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
        )}
      </div>
    </form>
  );
}
