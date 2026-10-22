"use client";

import { useState, useRef, useTransition } from "react";
import { 
  TicketPlus, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Send, 
  RotateCcw,
  ShieldCheck,
  Building2,
  X,
  Sparkles,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";
import { createOfflineTicket, CreateOfflineTicketResult } from "./actions";

interface Category {
  id: string;
  name: string;
  price: number;
  quota: number;
  hasDiscount: boolean;
  discountPrice: number | null;
  discountStartDate: string | null;
  discountEndDate: string | null;
  discountQuota: number | null;
}

interface CustomField {
  id: string;
  name: string;
  type: string;
  options: string | null;
  isRequired: boolean;
}

export interface EventData {
  id: string;
  title: string;
  location: string;
  eventDate: string;
  waGroupLink?: string | null;
  ticketCategories: Category[];
  fields: CustomField[];
}

interface Props {
  events: EventData[];
  defaultPjName: string;
}

export default function OfflineTicketForm({ events, defaultPjName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateOfflineTicketResult | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const topRef = useRef<HTMLDivElement>(null);
  const ticketInputRef = useRef<HTMLInputElement>(null);

  // Selected event & category
  const [selectedEventId, setSelectedEventId] = useState<string>(
    events.length > 0 ? events[0].id : ""
  );
  const currentEvent = events.find((e) => e.id === selectedEventId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    currentEvent?.ticketCategories.length ? currentEvent.ticketCategories[0].id : ""
  );

  // Form inputs
  const [ticketNumber, setTicketNumber] = useState<string>("");
  const [pjName, setPjName] = useState<string>(defaultPjName || "Panitia");
  
  // Format current local date-time for datetime-local input
  const getNowLocalDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };
  const [date, setDate] = useState<string>(getNowLocalDateTime());

  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerPhone, setBuyerPhone] = useState<string>("");
  const [buyerEmail, setBuyerEmail] = useState<string>("");
  const [buyerGender, setBuyerGender] = useState<string>("L");
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const handleEventChange = (newId: string) => {
    setSelectedEventId(newId);
    const ev = events.find((e) => e.id === newId);
    if (ev && ev.ticketCategories.length > 0) {
      setSelectedCategoryId(ev.ticketCategories[0].id);
    } else {
      setSelectedCategoryId("");
    }
    setCustomAnswers({});
    setResult(null);
    setShowModal(false);
  };

  const currentCategory = currentEvent?.ticketCategories.find(
    (c) => c.id === selectedCategoryId
  );

  const isQuotaEmpty = currentCategory ? currentCategory.quota <= 0 : false;

  const scrollToTopContainer = () => {
    // 1. Scroll top element
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // 2. Scroll the <main> scroll container in AdminLayout
    const mainContainer = document.querySelector("main");
    if (mainContainer) {
      mainContainer.scrollTo({ top: 0, behavior: "smooth" });
    }
    // 3. Fallback window scroll
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createOfflineTicket(null, formData);
      setResult(res);
      
      // Auto scroll to top so alert is immediately visible!
      scrollToTopContainer();

      if (res.success) {
        setShowModal(true);
      }
    });
  };

  const handleResetForNextTicket = () => {
    setTicketNumber("");
    setBuyerName("");
    setBuyerPhone("");
    setBuyerEmail("");
    setCustomAnswers({});
    setResult(null);
    setShowModal(false);
    setDate(getNowLocalDateTime());
    
    // Auto scroll top and focus on ticket number input
    scrollToTopContainer();
    setTimeout(() => {
      ticketInputRef.current?.focus();
    }, 200);
  };

  const copyTicketNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center max-w-xl mx-auto shadow-sm">
        <AlertCircle className="w-14 h-14 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Tidak Ada Event Aktif</h3>
        <p className="text-slate-500 text-sm mt-2">
          Saat ini belum ada event aktif yang tersedia untuk penjualan tiket offline.
        </p>
        <Link
          href="/admin/events"
          className="inline-flex items-center px-5 py-2.5 mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
        >
          Kelola Event
        </Link>
      </div>
    );
  }

  return (
    <div ref={topRef} className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* ─── Hero Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-12 w-72 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <TicketPlus className="w-4 h-4 text-emerald-400" />
              <span>Loket Penjualan Tiket Offline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Input Tiket Offline</h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              Catat penjualan tiket fisik secara langsung di lokasi. Data tiket langsung otomatis 
              tercatat berstatus <span className="text-emerald-400 font-extrabold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">LUNAS</span> dan masuk ke sistem validasi.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shrink-0 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Verifikasi</div>
              <div className="text-xs font-bold text-slate-100">Otomatis Terbit</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Top Notification: Sukses ───────────────────────────────────────── */}
      {result && result.success && (
        <div className="bg-emerald-50/90 border-2 border-emerald-400 rounded-3xl p-6 shadow-md animate-in fade-in slide-in-from-top-6 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Berhasil Disimpan
                </div>
                <h3 className="text-lg font-black text-emerald-950">
                  Tiket #{result.ticketNumber} Berhasil Diterbitkan!
                </h3>
                <p className="text-xs sm:text-sm text-emerald-800">{result.message}</p>
              </div>
            </div>

            <button
              onClick={() => setResult(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg self-end sm:self-start"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Ticket Snapshot Card */}
          <div className="mt-5 p-4 sm:p-5 bg-white rounded-2xl border border-emerald-200/80 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Nomor Tiket</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-mono text-base font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {result.ticketNumber}
                </span>
                <button
                  type="button"
                  onClick={() => result.ticketNumber && copyTicketNumber(result.ticketNumber)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                  title="Salin Nomor Tiket"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Nama Peserta</span>
              <span className="font-bold text-slate-800 text-sm block mt-1 truncate">
                {result.buyerName}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Kategori</span>
              <span className="font-bold text-emerald-700 text-sm block mt-1 truncate">
                {result.categoryName}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Penanggung Jawab</span>
              <span className="font-bold text-slate-700 text-sm block mt-1 truncate">
                {pjName}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex flex-wrap gap-2.5 items-center pt-2">
            <Link
              prefetch={false}
              href={`/admin/transactions?eventId=${selectedEventId}&status=APPROVED`}
              className="inline-flex items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Buka di Validasi Lunas
            </Link>

            {result.buyerPhone && result.buyerPhone !== "-" && (
              <a
                href={`https://wa.me/${result.buyerPhone.replace(/^0/, "62")}?text=${encodeURIComponent(
                  `Assalamualaikum ${result.buyerName},\n\nTerima kasih telah melakukan pembelian tiket offline untuk acara *${result.eventTitle}*.\n\n*Detail Tiket:*\n- Nomor Tiket: *${result.ticketNumber}*\n- Kategori: *${result.categoryName}*\n- Status: *LUNAS (Offline)*\n- Penanggung Jawab: ${pjName}\n\nTiket fisik Anda telah resmi terdaftar di sistem. Anda dapat menunjukkan nomor tiket ini saat check-in di lokasi acara.\n\nTerima kasih!`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Kirim Konfirmasi WA
              </a>
            )}

            <button
              type="button"
              onClick={handleResetForNextTicket}
              className="inline-flex items-center px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 sm:ml-auto"
            >
              <RotateCcw className="w-4 h-4 mr-1.5 text-slate-500" />
              Input Tiket Berikutnya
            </button>
          </div>
        </div>
      )}

      {/* ─── Top Notification: Error ────────────────────────────────────────── */}
      {result && !result.success && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-5 shadow-sm flex items-start gap-3.5 animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-red-950 text-sm">Gagal Menyimpan Tiket</h4>
            <p className="text-red-800 text-xs mt-0.5 leading-relaxed">{result.message}</p>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Main Form ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* CARD 1: Event & Kategori */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">1. Pilih Event & Kategori Tiket</h2>
              <p className="text-xs text-slate-400">Pilih acara dan jenis tiket fisik yang akan diterbitkan.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Pilih Event <span className="text-red-500">*</span>
              </label>
              <select
                name="eventId"
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 transition-all shadow-2xs"
                required
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Kategori Tiket <span className="text-red-500">*</span>
              </label>
              <select
                name="ticketCategoryId"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800 transition-all shadow-2xs"
                required
              >
                {currentEvent?.ticketCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} — Rp {cat.price.toLocaleString("id-ID")} (Sisa: {cat.quota})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price & Quota Preview */}
          {currentCategory && (
            <div className="pt-2 flex flex-wrap items-center gap-2.5 text-xs">
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-2xs">
                Harga Tiket: <strong className="text-slate-900 ml-1">Rp {currentCategory.price.toLocaleString("id-ID")}</strong>
              </span>
              <span
                className={`px-3.5 py-1.5 rounded-xl font-bold border shadow-2xs ${
                  currentCategory.quota > 10
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : currentCategory.quota > 0
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                Sisa Kuota: <strong className="ml-1">{currentCategory.quota} Lembar</strong>
              </span>
              {isQuotaEmpty && (
                <span className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                  ⚠️ Kuota untuk kategori ini sudah habis!
                </span>
              )}
            </div>
          )}
        </div>

        {/* CARD 2: Nomor Tiket & PJ */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">2. Data Tiket Fisik & Penanggung Jawab</h2>
              <p className="text-xs text-slate-400">Masukkan kode/nomor fisik tiket dan panitia yang bertanggung jawab.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Nomor Tiket Fisik <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={ticketInputRef}
                  type="text"
                  name="ticketNumber"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="Contoh: OFF-001 / 0124"
                  required
                  className="w-full px-4 py-3 text-sm bg-indigo-50/40 hover:bg-indigo-50/60 border-2 border-indigo-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-950 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 transition-all shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Ketik nomor yang tertera pada gelang/karcis fisik.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Tanggal Pembelian <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  name="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Default otomatis tanggal dan jam saat ini.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Penanggung Jawab (PJ) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="pjName"
                  value={pjName}
                  onChange={(e) => setPjName(e.target.value)}
                  placeholder="Nama panitia / kasir"
                  required
                  className="w-full px-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Nama petugas yang menerima pembayaran tunai.
              </p>
            </div>
          </div>
        </div>

        {/* CARD 3: Data Peserta */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">3. Data Peserta Pembeli</h2>
              <p className="text-xs text-slate-400">Identitas peserta pemegang tiket offline.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Nama Lengkap Peserta <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzan"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Nomor WhatsApp / HP
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  name="buyerPhone"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Bisa dikosongkan jika tidak ada, atau isi untuk kirim konfirmasi WA.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Email Peserta <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="buyerEmail"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="peserta@gmail.com (opsional)"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Jika dikosongkan, sistem otomatis membuatkan email sistem offline.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Jenis Kelamin
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border cursor-pointer font-bold text-xs transition-all ${
                  buyerGender === 'L'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                    : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="buyerGender"
                    value="L"
                    checked={buyerGender === 'L'}
                    onChange={() => setBuyerGender('L')}
                    className="sr-only"
                  />
                  <span>👨 Laki-laki</span>
                </label>
                <label className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border cursor-pointer font-bold text-xs transition-all ${
                  buyerGender === 'P'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                    : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="buyerGender"
                    value="P"
                    checked={buyerGender === 'P'}
                    onChange={() => setBuyerGender('P')}
                    className="sr-only"
                  />
                  <span>🧕 Perempuan</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: Pertanyaan Tambahan Event (jika ada) */}
        {currentEvent && currentEvent.fields.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">4. Formulir Tambahan Event (Opsional)</h2>
                <p className="text-xs text-slate-400">Pertanyaan khusus yang telah ditentukan oleh pengelola event.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {currentEvent.fields.map((field) => {
                let options: string[] = [];
                if (field.type === "SELECT" && field.options) {
                  try {
                    options = JSON.parse(field.options);
                  } catch {}
                }

                return (
                  <div key={field.id}>
                    <input type="hidden" name="customFieldId[]" value={field.id} />
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      {field.name}
                    </label>
                    {field.type === "SELECT" && options.length > 0 ? (
                      <select
                        name={`customAnswer_${field.id}`}
                        value={customAnswers[field.id] || ""}
                        onChange={(e) =>
                          setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })
                        }
                        className="w-full px-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-2xs"
                      >
                        <option value="">-- Pilih {field.name} --</option>
                        {options.map((opt, i) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === "NUMBER" ? "number" : "text"}
                        name={`customAnswer_${field.id}`}
                        value={customAnswers[field.id] || ""}
                        onChange={(e) =>
                          setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })
                        }
                        placeholder={`Isi ${field.name}`}
                        className="w-full px-4 py-3 text-sm bg-slate-50/80 hover:bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 transition-all shadow-2xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Form Action Footer Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20 backdrop-blur-md">
          <div className="text-xs text-slate-500 text-center sm:text-left leading-relaxed">
            Periksa kembali nomor tiket fisik dan nama peserta sebelum menekan tombol simpan.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetForNextTicket}
              className="px-4 py-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-2xl transition-all"
            >
              Reset Form
            </button>

            <button
              type="submit"
              disabled={isPending || isQuotaEmpty}
              className="flex-1 sm:flex-none px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2.5 active:scale-95"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Menyimpan Tiket...</span>
                </>
              ) : (
                <>
                  <TicketPlus className="w-5 h-5" />
                  <span>Simpan & Terbitkan Tiket Offline</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>

      {/* ─── SUCCESS MODAL POPUP ────────────────────────────────────────────── */}
      {showModal && result && result.success && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200">
            
            {/* Close modal button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Checkmark icon */}
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                Tiket Offline Berhasil Diterbitkan!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Data tiket telah berhasil disimpan dan langsung tercatat lunas.
              </p>
            </div>

            {/* Ticket Card Details in Modal */}
            <div className="my-6 p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-2xl border border-indigo-100/80 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-100/60">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">Nomor Tiket</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-lg font-black text-indigo-700 bg-white px-3 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                    {result.ticketNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => result.ticketNumber && copyTicketNumber(result.ticketNumber)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                    title="Salin Nomor Tiket"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Peserta</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">{result.buyerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Kategori</span>
                  <span className="font-bold text-emerald-700 mt-0.5 block truncate">{result.categoryName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">WhatsApp</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">{result.buyerPhone || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Penanggung Jawab</span>
                  <span className="font-bold text-slate-800 mt-0.5 block truncate">{pjName}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2.5">
              {result.buyerPhone && result.buyerPhone !== "-" && (
                <a
                  href={`https://wa.me/${result.buyerPhone.replace(/^0/, "62")}?text=${encodeURIComponent(
                    `Assalamualaikum ${result.buyerName},\n\nTerima kasih telah melakukan pembelian tiket offline untuk acara *${result.eventTitle}*.\n\n*Detail Tiket:*\n- Nomor Tiket: *${result.ticketNumber}*\n- Kategori: *${result.categoryName}*\n- Status: *LUNAS (Offline)*\n- Penanggung Jawab: ${pjName}\n\nTiket fisik Anda telah resmi terdaftar di sistem. Anda dapat menunjukkan nomor tiket ini saat check-in di lokasi acara.\n\nTerima kasih!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  Kirim Konfirmasi ke WhatsApp Peserta
                </a>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  prefetch={false}
                  href={`/admin/transactions?eventId=${selectedEventId}&status=APPROVED`}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Validasi Lunas
                </Link>

                <button
                  type="button"
                  onClick={handleResetForNextTicket}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all text-center active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
                  Input Tiket Baru
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
