"use client";

import { useState, useRef, useTransition, useEffect } from "react";
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
  Send, 
  RotateCcw, 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  Search, 
  MapPin, 
  ChevronLeft, 
  ArrowRight, 
  Layers, 
  Users, 
  Plus, 
  Trash2, 
  Wand2, 
  Minus,
  Receipt,
  QrCode
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
  bannerUrl?: string | null;
  waGroupLink?: string | null;
  totalIssuedTickets?: number;
  ticketCategories: Category[];
  fields: CustomField[];
}

interface Props {
  events: EventData[];
  defaultPjName: string;
  initialEventId?: string;
}

export interface BatchTicketItem {
  id: string;
  ticketNumber: string;
  holderName: string;
  holderPhone: string;
}

let batchIdSeed = 0;
const generateBatchId = () => `batch_${Date.now()}_${++batchIdSeed}`;

export default function OfflineTicketForm({ events, defaultPjName, initialEventId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateOfflineTicketResult | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState<boolean>(false);

  // Search query for event selection screen
  const [eventSearchQuery, setEventSearchQuery] = useState<string>("");

  const topRef = useRef<HTMLDivElement>(null);
  const ticketInputRef = useRef<HTMLInputElement>(null);

  // Selected event (empty by default if no initialEventId, so user picks an event first)
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    if (initialEventId && events.some((e) => e.id === initialEventId)) {
      return initialEventId;
    }
    return "";
  });

  const currentEvent = events.find((e) => e.id === selectedEventId);

  // Selected category within current event
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    currentEvent?.ticketCategories.length ? currentEvent.ticketCategories[0].id : ""
  );

  const currentCategory = currentEvent?.ticketCategories.find(
    (c) => c.id === selectedCategoryId
  );

  const normalCategoryPrice = currentCategory 
    ? (currentCategory.hasDiscount && currentCategory.discountPrice !== null ? currentCategory.discountPrice : currentCategory.price)
    : 0;

  const [customPrice, setCustomPrice] = useState<string>(() => String(normalCategoryPrice || ""));

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const evId = urlParams.get("eventId") || "";
      const ev = events.find((e) => e.id === evId);
      if (ev) {
        setSelectedEventId(ev.id);
        if (ev.ticketCategories.length > 0) {
          const firstCat = ev.ticketCategories[0];
          setSelectedCategoryId(firstCat.id);
          const pr = firstCat.hasDiscount && firstCat.discountPrice !== null ? firstCat.discountPrice : firstCat.price;
          setCustomPrice(String(pr));
        }
      } else {
        setSelectedEventId("");
        setSelectedCategoryId("");
        setCustomPrice("");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [events]);

  // Handle selecting an event from list
  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setResult(null);
    setShowModal(false);
    setCustomAnswers({});

    const ev = events.find((e) => e.id === eventId);
    if (ev && ev.ticketCategories.length > 0) {
      const firstCat = ev.ticketCategories[0];
      setSelectedCategoryId(firstCat.id);
      const pr = firstCat.hasDiscount && firstCat.discountPrice !== null ? firstCat.discountPrice : firstCat.price;
      setCustomPrice(String(pr));
    } else {
      setSelectedCategoryId("");
      setCustomPrice("");
    }

    // Update URL query parameter
    if (typeof window !== "undefined") {
      const url = eventId 
        ? `${window.location.pathname}?eventId=${encodeURIComponent(eventId)}` 
        : window.location.pathname;
      window.history.pushState({ eventId }, "", url);
    }

    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCategoryChange = (newCatId: string) => {
    setSelectedCategoryId(newCatId);
    const cat = currentEvent?.ticketCategories.find((c) => c.id === newCatId);
    if (cat) {
      const price = cat.hasDiscount && cat.discountPrice !== null ? cat.discountPrice : cat.price;
      setCustomPrice(String(price));
    }
  };

  // ─── Mode Entri Tiket: Single vs Batch ───
  const [entryMode, setEntryMode] = useState<"single" | "batch">("single");

  // Single mode ticket number
  const [ticketNumber, setTicketNumber] = useState<string>("");

  // Batch mode tickets list (default 2 tickets)
  const [batchTickets, setBatchTickets] = useState<BatchTicketItem[]>([
    { id: "1", ticketNumber: "", holderName: "", holderPhone: "" },
    { id: "2", ticketNumber: "", holderName: "", holderPhone: "" },
  ]);

  // Option: Samakan data peserta dengan pembeli utama
  const [sameAsBuyer, setSameAsBuyer] = useState<boolean>(true);

  // Auto-generator fields
  const [showGenerator, setShowGenerator] = useState<boolean>(false);
  const [seqPrefix, setSeqPrefix] = useState<string>("OFF-");
  const [seqStart, setSeqStart] = useState<string>("001");

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

  const formatRupiahDisplay = (val: string | number) => {
    if (val === "" || val === undefined || val === null) return "";
    const clean = String(val).replace(/\D/g, "");
    if (!clean) return "";
    return parseInt(clean, 10).toLocaleString("id-ID");
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    setCustomPrice(rawDigits);
  };

  const activeUnitPrice = customPrice !== "" && !isNaN(parseInt(customPrice, 10))
    ? parseInt(customPrice, 10)
    : normalCategoryPrice;

  const totalQuantity = entryMode === "batch" ? batchTickets.length : 1;
  const grandTotalPrice = activeUnitPrice * totalQuantity;

  // Batch tickets actions
  const handleAddBatchTicket = () => {
    const newId = generateBatchId();
    setBatchTickets((prev) => [
      ...prev,
      { id: newId, ticketNumber: "", holderName: "", holderPhone: "" },
    ]);
    setTimeout(() => {
      const el = document.getElementById(`batch-ticket-input-${batchTickets.length}`);
      el?.focus();
    }, 50);
  };

  const handleRemoveBatchTicket = (id: string) => {
    if (batchTickets.length <= 1) return;
    setBatchTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const handleBatchChange = (id: string, field: keyof BatchTicketItem, value: string) => {
    setBatchTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSetBatchCount = (count: number) => {
    const target = Math.max(1, Math.min(100, count));
    setBatchTickets((prev) => {
      if (prev.length === target) return prev;
      if (prev.length < target) {
        const added: BatchTicketItem[] = [];
        for (let i = prev.length; i < target; i++) {
          added.push({
            id: generateBatchId(),
            ticketNumber: "",
            holderName: "",
            holderPhone: "",
          });
        }
        return [...prev, ...added];
      } else {
        return prev.slice(0, target);
      }
    });
  };

  const handleApplySequential = () => {
    const count = batchTickets.length;
    const match = seqStart.match(/\d+$/);
    const numStr = match ? match[0] : seqStart;
    const padLen = numStr.length;
    const baseNum = parseInt(numStr, 10) || 1;
    const prefix = seqPrefix || (match ? seqStart.slice(0, seqStart.length - numStr.length) : "");

    const newTickets: BatchTicketItem[] = [];
    for (let i = 0; i < count; i++) {
      const nextNum = baseNum + i;
      const formattedNum = String(nextNum).padStart(padLen, "0");
      newTickets.push({
        id: batchTickets[i]?.id || generateBatchId(),
        ticketNumber: `${prefix}${formattedNum}`,
        holderName: batchTickets[i]?.holderName || "",
        holderPhone: batchTickets[i]?.holderPhone || "",
      });
    }
    setBatchTickets(newTickets);
    setShowGenerator(false);
  };

  // Barcode scanner friendly: on Enter key press in input row, jump to next input or create new row
  const handleKeyDownTicketInput = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index < batchTickets.length - 1) {
        const nextInput = document.getElementById(`batch-ticket-input-${index + 1}`);
        nextInput?.focus();
      } else {
        // Last row, automatically add new row and focus
        const newId = generateBatchId();
        setBatchTickets((prev) => [
          ...prev,
          { id: newId, ticketNumber: "", holderName: "", holderPhone: "" },
        ]);
        setTimeout(() => {
          const nextInput = document.getElementById(`batch-ticket-input-${index + 1}`);
          nextInput?.focus();
        }, 50);
      }
    }
  };

  const scrollToTopContainer = () => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);

    const formData = new FormData(e.currentTarget);

    if (entryMode === "batch") {
      const filled = batchTickets.filter((t) => t.ticketNumber.trim().length > 0);
      if (filled.length === 0) {
        alert("Harap masukkan minimal 1 nomor tiket fisik.");
        return;
      }

      const itemsPayload = filled.map((t) => ({
        ticketNumber: t.ticketNumber.trim(),
        holderName: (!sameAsBuyer && t.holderName.trim()) 
          ? t.holderName.trim() 
          : buyerName,
        holderPhone: (!sameAsBuyer && t.holderPhone.trim()) 
          ? t.holderPhone.trim() 
          : buyerPhone,
        holderGender: buyerGender,
      }));

      formData.set("ticketItems", JSON.stringify(itemsPayload));
    } else {
      formData.set("ticketNumber", ticketNumber.trim());
      formData.set("ticketItems", JSON.stringify([{
        ticketNumber: ticketNumber.trim(),
        holderName: buyerName,
        holderPhone: buyerPhone,
        holderGender: buyerGender,
      }]));
    }

    startTransition(async () => {
      const res = await createOfflineTicket(null, formData);
      setResult(res);
      scrollToTopContainer();

      if (res.success) {
        setShowModal(true);
      }
    });
  };

  const handleResetForNextTicket = () => {
    setTicketNumber("");
    setBatchTickets([
      { id: "1", ticketNumber: "", holderName: "", holderPhone: "" },
      { id: "2", ticketNumber: "", holderName: "", holderPhone: "" },
    ]);
    setBuyerName("");
    setBuyerPhone("");
    setBuyerEmail("");
    setCustomAnswers({});
    setResult(null);
    setShowModal(false);
    setDate(getNowLocalDateTime());
    if (currentCategory) {
      const price = currentCategory.hasDiscount && currentCategory.discountPrice !== null 
        ? currentCategory.discountPrice 
        : currentCategory.price;
      setCustomPrice(String(price));
    }
    
    scrollToTopContainer();
    setTimeout(() => {
      if (entryMode === "single") {
        ticketInputRef.current?.focus();
      } else {
        const firstBatch = document.getElementById("batch-ticket-input-0");
        firstBatch?.focus();
      }
    }, 200);
  };

  const copyTicketNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(num);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAllTicketNumbers = (numbers: string[]) => {
    navigator.clipboard.writeText(numbers.join(", "));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  const getWhatsAppMessage = (res: CreateOfflineTicketResult) => {
    if (!res) return "";
    const isBatch = (res.totalTickets || 1) > 1;

    let ticketsList = "";
    if (res.tickets && res.tickets.length > 0) {
      ticketsList = res.tickets.map((t, i) => `${i + 1}. *#${t.ticketNumber}* (${t.holderName})`).join("\n");
    } else if (res.ticketNumbers && res.ticketNumbers.length > 0) {
      ticketsList = res.ticketNumbers.map((num, i) => `${i + 1}. *#${num}*`).join("\n");
    } else {
      ticketsList = `1. *#${res.ticketNumber}*`;
    }

    if (isBatch) {
      return `Assalamualaikum ${res.buyerName},\n\nTerima kasih telah melakukan pembelian tiket offline untuk acara *${res.eventTitle}*.\n\n*Detail Pembelian:*\n- Jumlah: *${res.totalTickets} Tiket*\n- Kategori: *${res.categoryName}*\n- Total Biaya: *Rp ${res.priceCharged !== undefined ? res.priceCharged.toLocaleString("id-ID") : "0"}*\n- Status: *LUNAS (Offline)*\n- Penanggung Jawab: ${pjName}\n\n*Daftar Nomor Tiket Fisik:*\n${ticketsList}\n\nTiket fisik Anda telah resmi terdaftar di sistem. Anda dapat menunjukkan nomor tiket ini saat check-in di lokasi acara.\n\nTerima kasih!`;
    }

    return `Assalamualaikum ${res.buyerName},\n\nTerima kasih telah melakukan pembelian tiket offline untuk acara *${res.eventTitle}*.\n\n*Detail Tiket:*\n- Nomor Tiket: *#${res.ticketNumber}*\n- Kategori: *${res.categoryName}*\n- Biaya: *Rp ${res.priceCharged !== undefined ? res.priceCharged.toLocaleString("id-ID") : "0"}*\n- Status: *LUNAS (Offline)*\n- Penanggung Jawab: ${pjName}\n\nTiket fisik Anda telah resmi terdaftar di sistem. Anda dapat menunjukkan nomor tiket ini saat check-in di lokasi acara.\n\nTerima kasih!`;
  };

  // Helper format date
  const formatEventDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Filter events for selection view
  const filteredEvents = events.filter((ev) => {
    if (!eventSearchQuery.trim()) return true;
    const query = eventSearchQuery.toLowerCase();
    return (
      ev.title.toLowerCase().includes(query) ||
      ev.location.toLowerCase().includes(query)
    );
  });

  // If no active events exist at all
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Tidak Ada Event Aktif</h3>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
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

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 1: PILIH EVENT DULU (Grid of Events)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!selectedEventId || !currentEvent) {
    return (
      <div ref={topRef} className="w-full space-y-6 animate-in fade-in duration-200">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <TicketPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Loket Penjualan Tiket Offline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Pilih Event
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Pilih salah satu event aktif di bawah untuk mulai menerbitkan tiket fisik secara langsung di lokasi.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={eventSearchQuery}
              onChange={(e) => setEventSearchQuery(e.target.value)}
              placeholder="Cari event atau lokasi..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition-all"
            />
            {eventSearchQuery && (
              <button
                type="button"
                onClick={() => setEventSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Event Tidak Ditemukan</h3>
            <p className="text-slate-500 text-xs mt-1">
              Tidak ada event yang cocok dengan kata kunci &quot;{eventSearchQuery}&quot;.
            </p>
            <button
              type="button"
              onClick={() => setEventSearchQuery("")}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const totalQuota = event.ticketCategories.reduce((sum, c) => sum + (c.quota || 0), 0);
              const minPrice = event.ticketCategories.length > 0 
                ? Math.min(...event.ticketCategories.map(c => c.price)) 
                : 0;

              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event.id)}
                  className="bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-500 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer hover:-translate-y-1"
                >
                  <div className="h-44 bg-slate-900 relative overflow-hidden shrink-0">
                    {event.bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.bannerUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-emerald-950 to-teal-900 flex items-center justify-center p-6 text-center">
                        <span className="text-white/40 font-black text-2xl uppercase tracking-wider line-clamp-2">
                          {event.title}
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-sm">
                        <Calendar className="w-3 h-3 text-emerald-600" />
                        {formatEventDate(event.eventDate)}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white shadow-sm">
                        Aktif
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-extrabold text-base line-clamp-1 group-hover:text-emerald-300 transition-colors drop-shadow-sm">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-1 text-slate-300 text-xs mt-0.5 drop-shadow-xs">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {event.ticketCategories.length} Kategori Tiket
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          totalQuota > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {totalQuota > 0 ? `Sisa: ${totalQuota.toLocaleString('id-ID')} Tiket` : 'Kuota Habis'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {event.ticketCategories.slice(0, 3).map((cat) => (
                          <span
                            key={cat.id}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] font-bold text-slate-600"
                          >
                            {cat.name} • Rp {cat.price.toLocaleString("id-ID")}
                          </span>
                        ))}
                        {event.ticketCategories.length > 3 && (
                          <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-500">
                            +{event.ticketCategories.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Mulai Dari</span>
                        <span className="font-extrabold text-slate-800">
                          {minPrice === 0 ? "Gratis" : `Rp ${minPrice.toLocaleString("id-ID")}`}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white font-bold text-xs rounded-xl transition-all shadow-2xs">
                        <span>Buka Loket</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW 2: STREAMLINED POS / LOKET OFFLINE DESK (2-Column Optimized UX)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div ref={topRef} className="w-full space-y-5 pb-12 animate-in fade-in duration-200">
      
      {/* ─── Sleek Header: Event Context & Quick Switch ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSelectEvent("")}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shrink-0"
            title="Ganti ke event lain"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Pilih Event Lain</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              <span className="truncate max-w-[280px] sm:max-w-md">{currentEvent.title}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider shrink-0">
                Loket Aktif
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            {formatEventDate(currentEvent.eventDate)}
          </span>
          <span className="text-slate-300">•</span>
          <span className="inline-flex items-center gap-1.5 truncate max-w-[180px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {currentEvent.location}
          </span>
        </div>
      </div>

      {/* ─── Top Notification: Sukses (Compact & Informative) ─── */}
      {result && result.success && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-xs animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-emerald-950 text-sm">
                    {(result.totalTickets || 1) > 1 
                      ? `${result.totalTickets} Tiket Offline Berhasil Diterbitkan!` 
                      : `Tiket #${result.ticketNumber} Berhasil Diterbitkan!`}
                  </h4>
                  <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    Total: Rp {result.priceCharged?.toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  Pemesan: <strong>{result.buyerName}</strong> ({result.categoryName})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {result.buyerPhone && result.buyerPhone !== "-" && (
                <a
                  href={`https://wa.me/${result.buyerPhone.replace(/^0/, "62")}?text=${encodeURIComponent(
                    getWhatsAppMessage(result)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </a>
              )}

              <button
                type="button"
                onClick={handleResetForNextTicket}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-2xs transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Input Lagi</span>
              </button>

              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top Notification: Error ─── */}
      {result && !result.success && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-4 shadow-xs flex items-start gap-3 animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h4 className="font-extrabold text-red-950 text-sm">Gagal Menyimpan Tiket</h4>
            <p className="text-red-800 text-xs mt-0.5">{result.message}</p>
          </div>
          <button
            onClick={() => setResult(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── MAIN POS WORKSPACE: 2-COLUMN GRID ─── */}
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="eventId" value={selectedEventId} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ════════════════════════════════════════════════════════════════════
              LEFT PANEL (Col 7): Tiket Fisik Desk (Core Operational Entry)
             ════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Box 1: Jenis Tiket & Data Nomor Fisik */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
              
              {/* Header with Mode Toggle Pill */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">Entri Tiket Fisik</h2>
                    <p className="text-[11px] text-slate-400">Pilih kategori dan masukkan nomor fisik gelang/karcis.</p>
                  </div>
                </div>

                {/* Sleek Segmented Switcher */}
                <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setEntryMode("single")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      entryMode === "single"
                        ? "bg-white text-indigo-900 shadow-2xs border border-slate-200/50"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Tag className="w-3 h-3 text-indigo-600" />
                    <span>Satuan (1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEntryMode("batch")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      entryMode === "batch"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>Borongan / Batch</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                      entryMode === "batch" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"
                    }`}>
                      {batchTickets.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Kategori & Harga Satuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kategori Tiket <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="ticketCategoryId"
                    value={selectedCategoryId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    required
                  >
                    {currentEvent.ticketCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} — Rp {cat.price.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Harga Satuan (Rp) <span className="text-red-500">*</span>
                    </label>
                    {currentCategory && Number(customPrice) !== normalCategoryPrice && (
                      <button
                        type="button"
                        onClick={() => setCustomPrice(String(normalCategoryPrice))}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Reset Normal
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                      Rp
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customPrice === "" ? "" : formatRupiahDisplay(customPrice)}
                      onChange={handlePriceChange}
                      placeholder="0"
                      required
                      className={`w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border rounded-xl font-mono font-bold text-slate-900 transition-all shadow-2xs ${
                        Number(customPrice) !== normalCategoryPrice
                          ? "border-amber-400 bg-amber-50/40 focus:ring-2 focus:ring-amber-500"
                          : "border-slate-300 bg-slate-50/70 hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      }`}
                    />
                    <input type="hidden" name="customPrice" value={customPrice} />
                  </div>
                </div>
              </div>

              {/* ─── JIKA MODE SINGLE (1 TIKET) ─── */}
              {entryMode === "single" && (
                <div className="pt-2 animate-in fade-in duration-150">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor Tiket Fisik (Barcode / Karcis) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-400">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <input
                      ref={ticketInputRef}
                      type="text"
                      name="ticketNumber"
                      value={ticketNumber}
                      onChange={(e) => setTicketNumber(e.target.value)}
                      placeholder="Contoh: OFF-001 / Scan barcode langsung"
                      required={entryMode === "single"}
                      className="w-full pl-10 pr-4 py-3 text-sm bg-indigo-50/30 hover:bg-indigo-50/50 border border-indigo-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-950 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Ketik nomor fisik atau gunakan barcode scanner untuk mengisi otomatis.
                  </p>
                </div>
              )}

              {/* ─── JIKA MODE BATCH (BANYAK TIKET) ─── */}
              {entryMode === "batch" && (
                <div className="pt-2 space-y-3 animate-in fade-in duration-150">
                  
                  {/* Clean Batch Controls Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-600 mr-1">Jumlah:</span>
                      
                      {/* Stepper - / + */}
                      <button
                        type="button"
                        onClick={() => handleSetBatchCount(batchTickets.length - 1)}
                        disabled={batchTickets.length <= 1}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 shadow-2xs"
                        title="Kurangi 1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="px-2 font-mono font-black text-xs text-indigo-900 min-w-[24px] text-center">
                        {batchTickets.length}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSetBatchCount(batchTickets.length + 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs"
                        title="Tambah 1"
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {/* Quick chips */}
                      <div className="flex items-center gap-1 ml-1.5 border-l border-slate-200 pl-2">
                        {[2, 3, 5, 10].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => handleSetBatchCount(cnt)}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded-md border transition-all ${
                              batchTickets.length === cnt
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGenerator(!showGenerator)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                          showGenerator
                            ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                            : "bg-white text-purple-700 border-purple-200 hover:bg-purple-50 shadow-2xs"
                        }`}
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Auto Nomor Urut</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline Auto-Generator Panel */}
                  {showGenerator && (
                    <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          Generate {batchTickets.length} Nomor Tiket Berurutan
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowGenerator(false)}
                          className="text-purple-400 hover:text-purple-700 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                        <div>
                          <label className="block text-[10px] font-bold text-purple-900 mb-0.5">
                            Awalan (Prefix)
                          </label>
                          <input
                            type="text"
                            value={seqPrefix}
                            onChange={(e) => setSeqPrefix(e.target.value)}
                            placeholder="OFF-"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-purple-900 mb-0.5">
                            Nomor Mulai
                          </label>
                          <input
                            type="text"
                            value={seqStart}
                            onChange={(e) => setSeqStart(e.target.value)}
                            placeholder="001"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-200 rounded-lg font-mono font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={handleApplySequential}
                            className="w-full py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all active:scale-95"
                          >
                            Terapkan ke {batchTickets.length} Tiket
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Toggle Same as Buyer */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 px-1">
                    <input
                      type="checkbox"
                      checked={sameAsBuyer}
                      onChange={(e) => setSameAsBuyer(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Samakan nama peserta di semua tiket dengan nama pembeli utama</span>
                  </label>

                  {/* COMPACT POS TICKET TABLE (Scrollable Container - max 360px) */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-100/80 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span>#</span>
                        <span>Nomor Tiket Fisik</span>
                      </div>
                      <span className="text-slate-400 font-normal lowercase">
                        enter = baris baru
                      </span>
                    </div>

                    <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 p-1">
                      {batchTickets.map((item, idx) => (
                        <div
                          key={item.id}
                          className="px-2.5 py-1.5 flex items-center gap-2 hover:bg-indigo-50/30 transition-colors rounded-xl"
                        >
                          <span className="w-5 font-mono text-[11px] font-bold text-slate-400 text-center shrink-0">
                            {idx + 1}
                          </span>

                          <div className="flex-1">
                            <input
                              id={`batch-ticket-input-${idx}`}
                              type="text"
                              value={item.ticketNumber}
                              onChange={(e) => handleBatchChange(item.id, "ticketNumber", e.target.value)}
                              onKeyDown={(e) => handleKeyDownTicketInput(e, idx)}
                              placeholder={`Nomor tiket #${idx + 1} (Scan/Ketik)`}
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-indigo-950 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 shadow-2xs"
                            />
                          </div>

                          {!sameAsBuyer && (
                            <div className="w-36 shrink-0">
                              <input
                                type="text"
                                value={item.holderName}
                                onChange={(e) => handleBatchChange(item.id, "holderName", e.target.value)}
                                placeholder="Nama peserta"
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 placeholder:text-slate-400"
                              />
                            </div>
                          )}

                          {batchTickets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBatchTicket(item.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0"
                              title="Hapus baris ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50/80 px-3.5 py-2 border-t border-slate-200 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleAddBatchTicket}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah 1 Baris Tiket</span>
                      </button>

                      <span className="text-[11px] font-semibold text-slate-500">
                        Total: <strong className="text-slate-800">{batchTickets.length} tiket</strong>
                      </span>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Box 2: Form Tambahan Event (Custom Fields jika ada) */}
            {currentEvent.fields.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-900">Formulir Tambahan Event</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {field.name}
                        </label>
                        {field.type === "SELECT" && options.length > 0 ? (
                          <select
                            name={`customAnswer_${field.id}`}
                            value={customAnswers[field.id] || ""}
                            onChange={(e) =>
                              setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* ════════════════════════════════════════════════════════════════════
              RIGHT PANEL (Col 5): Kasir, Pembeli & Tagihan (STICKY)
             ════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 lg:sticky lg:top-4 space-y-4">
            
            {/* Tagihan & Data Pembeli Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
              
              {/* POS Receipt Card Header */}
              <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between text-[11px] text-slate-300 pb-2 border-b border-white/10">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-400">
                    <Receipt className="w-3.5 h-3.5" />
                    Kuitansi Kasir
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-extrabold border border-emerald-500/30">
                    LUNAS (Offline)
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs text-slate-300 block truncate max-w-[180px]">
                      {currentCategory?.name || "Tiket"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {totalQuantity} lembar × Rp {activeUnitPrice.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Tagihan</span>
                    <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight text-emerald-400">
                      Rp {grandTotalPrice.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Pembeli Form */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-extrabold text-slate-800">
                    Data Pembeli / Perwakilan
                  </span>
                </div>

                {/* Nama Pembeli */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="buyerName"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzan"
                    required
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 shadow-2xs"
                  />
                </div>

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      name="buyerPhone"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="08123456789 (untuk bukti WA)"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50/70 hover:bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Jenis Kelamin
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border cursor-pointer font-bold text-xs transition-all ${
                      buyerGender === 'L'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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

                    <label className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border cursor-pointer font-bold text-xs transition-all ${
                      buyerGender === 'P'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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

                {/* Email (Optional) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Email <span className="text-slate-400 font-normal">(opsional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      name="buyerEmail"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="pembeli@gmail.com (opsional)"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/70 hover:bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Waktu & Petugas Kasir (Inline 2-column) */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Penanggung Jawab (PJ)
                    </label>
                    <input
                      type="text"
                      name="pjName"
                      value={pjName}
                      onChange={(e) => setPjName(e.target.value)}
                      required
                      placeholder="Nama kasir"
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Waktu Bayar
                    </label>
                    <input
                      type="datetime-local"
                      name="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                    />
                  </div>
                </div>

              </div>

              {/* Action Submit Button */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Tiket...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        Simpan & Terbitkan {totalQuantity > 1 ? `${totalQuantity} Tiket` : "Tiket"} (Rp {grandTotalPrice.toLocaleString("id-ID")})
                      </span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleResetForNextTicket}
                    className="text-xs text-slate-400 hover:text-slate-600 font-semibold py-1 transition-colors"
                  >
                    Reset Formulir
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      </form>

      {/* ─── SUCCESS MODAL POPUP (Clean & Celebratory) ─── */}
      {showModal && result && result.success && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200 my-6">
            
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                {(result.totalTickets || 1) > 1
                  ? `${result.totalTickets} Tiket Offline Terbit!`
                  : "Tiket Offline Terbit!"}
              </h3>
              <p className="text-xs text-slate-500">
                Tercatat resmi lunas dan siap digunakan untuk check-in.
              </p>
            </div>

            {/* Receipt Summary in Modal */}
            <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Pembeli</span>
                <span className="font-bold text-slate-900">{result.buyerName}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Kategori & Jumlah</span>
                <span className="font-bold text-slate-900">{result.totalTickets || 1}x {result.categoryName}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Total Uang Diterima</span>
                <span className="font-extrabold text-emerald-700 font-mono text-sm">
                  Rp {result.priceCharged?.toLocaleString("id-ID")}
                </span>
              </div>

              {/* List of ticket badges */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Nomor Tiket Fisik ({result.totalTickets || 1}):
                  </span>
                  {result.ticketNumbers && result.ticketNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => copyAllTicketNumbers(result.ticketNumbers!)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      {allCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{allCopied ? "Disalin!" : "Salin Semua"}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-slate-200 rounded-xl">
                  {result.tickets && result.tickets.length > 0 ? (
                    result.tickets.map((t, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px]"
                      >
                        <span className="font-mono font-bold text-slate-800">#{t.ticketNumber}</span>
                        <button
                          type="button"
                          onClick={() => copyTicketNumber(t.ticketNumber)}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {copied === t.ticketNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-xs">
                      <span className="font-mono font-bold text-slate-800">#{result.ticketNumber}</span>
                      <button
                        type="button"
                        onClick={() => result.ticketNumber && copyTicketNumber(result.ticketNumber)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        {copied === result.ticketNumber ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="space-y-2">
              {result.buyerPhone && result.buyerPhone !== "-" && (
                <a
                  href={`https://wa.me/${result.buyerPhone.replace(/^0/, "62")}?text=${encodeURIComponent(
                    getWhatsAppMessage(result)
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Konfirmasi WhatsApp</span>
                </a>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResetForNextTicket}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all"
                >
                  Transaksi Baru
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
