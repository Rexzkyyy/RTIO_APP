"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  CameraOff,
  RotateCcw,
  User,
  Calendar,
  Tag,
  Clock,
  Loader2,
  Zap,
  ScanLine,
  History,
  X,
  Search,
  Phone,
  Filter,
  Check,
  Sparkles,
  Barcode,
  Wifi,
  WifiOff,
  CloudDownload,
  RefreshCw,
  Database,
  Users,
} from "lucide-react";
import {
  saveOfflineTickets,
  searchOfflineTickets,
  findOfflineTicketByBarcode,
  checkInTicketOffline,
  getPendingSyncQueue,
  clearPendingSyncQueue,
  getOfflineStats,
  OfflineTicket,
} from "@/lib/scannerOfflineDb";

// ─── Sound Feedback (Web Audio API) ───────────────────────────────────────────
function playBeep(type: "success" | "error" | "already") {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === "success") {
      // Pleasant double chime: 587Hz (D5) -> 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.35);
    } else if (type === "already") {
      // 2 quick warning beeps
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(370, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } else {
      // Error low buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio failures if browser blocks audio
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanStatus = "idle" | "scanning" | "loading" | "valid" | "already" | "invalid" | "error";

interface ScanResult {
  status: ScanStatus;
  message: string;
  ticket?: {
    id?: string;
    barcodeString?: string;
    holderName?: string;
    eventTitle?: string;
    category?: string;
    checkedInAt?: string;
    txStatus?: string;
    transactionId?: string;
    totalTickets?: number;
    checkedInCount?: number;
    remainingCount?: number;
  };
}

interface HistoryItem {
  id: string;
  barcodeString: string;
  status: "valid" | "already" | "invalid";
  holderName: string;
  eventTitle?: string;
  time: Date;
  isOfflineSync?: boolean;
}

export interface SearchedTicket {
  id: string;
  transactionId?: string;
  barcodeString: string;
  holderName: string | null;
  holderPhone: string | null;
  holderGender: string | null;
  isValidated: boolean;
  checkedInAt: string | null;
  totalTickets?: number;
  checkedInCount?: number;
  remainingCount?: number;
  ticketCategory: {
    id?: string;
    name: string;
    price: number;
  };
  transaction: {
    id?: string;
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    status: string;
    totalTickets?: number;
    checkedInCount?: number;
    remainingCount?: number;
    event: {
      id?: string;
      title: string;
    };
  };
}

interface ScannerClientProps {
  adminRole?: string;
  initialEvents?: { id: string; title: string }[];
}

export function ScannerClient({ adminRole, initialEvents = [] }: ScannerClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastScanRef = useRef<string>("");
  const cooldownRef = useRef<boolean>(false);
  const readerRef = useRef<import("@zxing/browser").BrowserQRCodeReader | null>(null);
  const zxingLibRef = useRef<{
    HTMLCanvasElementLuminanceSource: typeof import("@zxing/library").HTMLCanvasElementLuminanceSource;
    BinaryBitmap: typeof import("@zxing/library").BinaryBitmap;
    HybridBinarizer: typeof import("@zxing/library").HybridBinarizer;
  } | null>(null);

  // Scanner State
  const [isActive, setIsActive] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [fps, setFps] = useState<number>(0);
  const fpsCounterRef = useRef({ frames: 0, lastTime: 0 });

  // 1 Master Unified Input: Barcode / Nama / Telepon
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEvents[0]?.id || "");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNCHECKED" | "CHECKED">("ALL");
  const [searchResults, setSearchResults] = useState<SearchedTicket[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Validation / Confirmation Modal State
  const [ticketToValidate, setTicketToValidate] = useState<SearchedTicket | null>(null);
  const [isValidatingTicket, setIsValidatingTicket] = useState(false);
  const [validationSuccessMessage, setValidationSuccessMessage] = useState<string | null>(null);
  const [validationErrorMessage, setValidationErrorMessage] = useState<string | null>(null);

  const ticketToValidateRef = useRef<SearchedTicket | null>(null);
  useEffect(() => {
    ticketToValidateRef.current = ticketToValidate;
  }, [ticketToValidate]);

  const closeValidationModal = useCallback(() => {
    setTicketToValidate(null);
    setValidationSuccessMessage(null);
    setValidationErrorMessage(null);
    lastScanRef.current = "";
    cooldownRef.current = false;
    setIsLoading(false);
  }, []);

  // Mobile Tabs ("search" | "camera" | "history")
  const [mobileTab, setMobileTab] = useState<"search" | "camera" | "history">("search");

  // ── Network & Offline Sync State ───────────────────────────────────────────
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [offlineStats, setOfflineStats] = useState<{
    totalTickets: number;
    checkedInTickets: number;
    pendingSyncCount: number;
    lastSyncedAt: string | null;
  }>({
    totalTickets: 0,
    checkedInTickets: 0,
    pendingSyncCount: 0,
    lastSyncedAt: null,
  });
  const [syncStatusToast, setSyncStatusToast] = useState<string | null>(null);

  // ── Refresh Offline Stats ──────────────────────────────────────────────────
  const refreshOfflineStats = useCallback(async () => {
    try {
      const stats = await getOfflineStats(selectedEventId);
      setOfflineStats(stats);
    } catch {
      // Ignore
    }
  }, [selectedEventId]);

  // ── Download Tickets to Offline Cache (IndexedDB) ──────────────────────────
  const downloadOfflineCache = useCallback(
    async (showToast = true) => {
      if (!isOnline) {
        setSyncStatusToast("Sedang offline: Tidak dapat mengunduh data baru dari server.");
        setTimeout(() => setSyncStatusToast(null), 3500);
        return;
      }

      setIsDownloadingOffline(true);
      try {
        const params = new URLSearchParams();
        if (selectedEventId && selectedEventId !== "ALL") {
          params.append("eventId", selectedEventId);
        }

        const res = await fetch(`/api/scanner/offline-cache?${params.toString()}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.tickets)) {
          await saveOfflineTickets(selectedEventId, data.tickets);
          await refreshOfflineStats();

          if (showToast) {
            setSyncStatusToast(
              `✅ Berhasil mengunduh ${data.tickets.length} tiket untuk mode offline!`
            );
            setTimeout(() => setSyncStatusToast(null), 4000);
          }
        }
      } catch (err) {
        console.error("Gagal download offline cache:", err);
        if (showToast) {
          setSyncStatusToast("Gagal mengunduh data tiket offline. Periksa koneksi.");
          setTimeout(() => setSyncStatusToast(null), 3500);
        }
      } finally {
        setIsDownloadingOffline(false);
      }
    },
    [isOnline, refreshOfflineStats, selectedEventId]
  );

  // ── Sync Pending Offline Check-Ins to Server ────────────────────────────────
  const syncPendingQueue = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      const pendingItems = await getPendingSyncQueue();
      if (pendingItems.length === 0) return;

      setIsSyncingQueue(true);
      const res = await fetch("/api/scanner/offline-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pendingItems }),
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.syncedIds)) {
        await clearPendingSyncQueue(data.syncedIds);
        await refreshOfflineStats();
        setSyncStatusToast(`✅ ${data.syncedIds.length} tiket lokal berhasil disinkron ke server!`);
        setTimeout(() => setSyncStatusToast(null), 4000);
      }
    } catch (err) {
      console.error("Auto sync error:", err);
    } finally {
      setIsSyncingQueue(false);
    }
  }, [refreshOfflineStats]);

  // ── Listen to Online / Offline events & Auto Sync ──────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check & stats
    refreshOfflineStats();

    // Auto download cache if empty on first launch
    getOfflineStats(selectedEventId).then((stats) => {
      if (stats.totalTickets === 0 && navigator.onLine) {
        downloadOfflineCache(false);
      }
    });

    // Auto background sync timer every 25 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingQueue();
      }
    }, 25000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [downloadOfflineCache, refreshOfflineStats, selectedEventId, syncPendingQueue]);

  // ─── Init ZXing ────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]).then(([{ BrowserQRCodeReader }, lib]) => {
      if (isMounted) {
        readerRef.current = new BrowserQRCodeReader();
        zxingLibRef.current = {
          HTMLCanvasElementLuminanceSource: lib.HTMLCanvasElementLuminanceSource,
          BinaryBitmap: lib.BinaryBitmap,
          HybridBinarizer: lib.HybridBinarizer,
        };
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Search API Query (With Offline Fallback) ──────────────────────────────
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSearchResults = useCallback(
    async (query: string, eventId: string, status: string) => {
      const qClean = query.trim();
      if (!qClean) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      // JIKA OFFLINE: Cari langsung di IndexedDB lokal
      if (!navigator.onLine) {
        try {
          const rawOfflineResults = await searchOfflineTickets(
            qClean,
            eventId,
            status as "ALL" | "UNCHECKED" | "CHECKED"
          );
          const offlineResults = rawOfflineResults.filter((t) => t.txStatus !== "EXPIRED");
          const mapped: SearchedTicket[] = offlineResults.map((t) => {
            const total = t.totalTickets || 1;
            const checked = t.checkedInCount || (t.isValidated ? 1 : 0);
            const remaining = t.remainingCount ?? Math.max(0, total - checked);

            return {
              id: t.id,
              transactionId: t.transactionId,
              barcodeString: t.barcodeString,
              holderName: t.holderName,
              holderPhone: t.holderPhone,
              holderGender: t.holderGender,
              isValidated: t.isValidated,
              checkedInAt: t.checkedInAt,
              totalTickets: total,
              checkedInCount: checked,
              remainingCount: remaining,
              ticketCategory: { name: t.categoryName, price: t.categoryPrice },
              transaction: {
                id: t.transactionId,
                buyerName: t.buyerName,
                buyerPhone: t.buyerPhone,
                status: t.txStatus,
                totalTickets: total,
                checkedInCount: checked,
                remainingCount: remaining,
                event: { title: t.eventTitle },
              },
            };
          });
          setSearchResults(mapped);
        } catch (e) {
          console.error("Offline search error:", e);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
        return;
      }

      // JIKA ONLINE: Coba server dengan timeout 8 detik (fallback otomatis ke IndexedDB jika lemot/putus)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const params = new URLSearchParams();
        params.append("q", qClean);
        if (eventId && eventId !== "ALL") params.append("eventId", eventId);
        if (status && status !== "ALL") params.append("status", status);

        const res = await fetch(`/api/scanner/search?${params.toString()}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json();

        if (data.success && Array.isArray(data.tickets)) {
          const validTickets = data.tickets.filter((t: SearchedTicket) => t.transaction.status !== "EXPIRED");
          setSearchResults(validTickets);
        } else {
          setSearchResults([]);
        }
      } catch {
        // Jaringan lemot atau putus: Ambil dari cache IndexedDB lokal!
        try {
          const rawOfflineResults = await searchOfflineTickets(
            qClean,
            eventId,
            status as "ALL" | "UNCHECKED" | "CHECKED"
          );
          const offlineResults = rawOfflineResults.filter((t) => t.txStatus !== "EXPIRED");
          const mapped: SearchedTicket[] = offlineResults.map((t) => {
            const total = t.totalTickets || 1;
            const checked = t.checkedInCount || (t.isValidated ? 1 : 0);
            const remaining = t.remainingCount ?? Math.max(0, total - checked);

            return {
              id: t.id,
              transactionId: t.transactionId,
              barcodeString: t.barcodeString,
              holderName: t.holderName,
              holderPhone: t.holderPhone,
              holderGender: t.holderGender,
              isValidated: t.isValidated,
              checkedInAt: t.checkedInAt,
              totalTickets: total,
              checkedInCount: checked,
              remainingCount: remaining,
              ticketCategory: { name: t.categoryName, price: t.categoryPrice },
              transaction: {
                id: t.transactionId,
                buyerName: t.buyerName,
                buyerPhone: t.buyerPhone,
                status: t.txStatus,
                totalTickets: total,
                checkedInCount: checked,
                remainingCount: remaining,
                event: { title: t.eventTitle },
              },
            };
          });
          setSearchResults(mapped);
        } catch {
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Debounced search on typing
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchSearchResults(searchQuery, selectedEventId, statusFilter);
    }, 200);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, selectedEventId, statusFilter, fetchSearchResults]);

  // ─── Handle Enter on the Single Input (or from Barcode Gun) ─────────────────
  const handleMasterInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qClean = searchQuery.trim();
    if (!qClean) return;

    // 1. Cek exact match pada hasil pencarian saat ini
    const exactBarcodeMatch = searchResults.find(
      (t) => t.barcodeString.toLowerCase() === qClean.toLowerCase()
    );

    if (exactBarcodeMatch) {
      setTicketToValidate(exactBarcodeMatch);
      return;
    }

    // 2. Jika hanya 1 hasil ditemukan
    if (searchResults.length === 1) {
      setTicketToValidate(searchResults[0]);
      return;
    }

    // 3. Coba cari di IndexedDB lokal terlebih dahulu
    try {
      const localMatch = await findOfflineTicketByBarcode(qClean);
      if (localMatch) {
        const total = localMatch.totalTickets || 1;
        const checked = localMatch.checkedInCount || (localMatch.isValidated ? 1 : 0);
        const remaining = localMatch.remainingCount ?? Math.max(0, total - checked);

        setTicketToValidate({
          id: localMatch.id,
          transactionId: localMatch.transactionId,
          barcodeString: localMatch.barcodeString,
          holderName: localMatch.holderName,
          holderPhone: localMatch.holderPhone,
          holderGender: localMatch.holderGender,
          isValidated: localMatch.isValidated,
          checkedInAt: localMatch.checkedInAt,
          totalTickets: total,
          checkedInCount: checked,
          remainingCount: remaining,
          ticketCategory: { name: localMatch.categoryName, price: localMatch.categoryPrice },
          transaction: {
            id: localMatch.transactionId,
            buyerName: localMatch.buyerName,
            buyerPhone: localMatch.buyerPhone,
            status: localMatch.txStatus,
            totalTickets: total,
            checkedInCount: checked,
            remainingCount: remaining,
            event: { title: localMatch.eventTitle },
          },
        });
        return;
      }
    } catch {
      // Ignore
    }

    // 4. Cari tiket dan buka modal konfirmasi
    verifyTicket(qClean);
  };

  // ─── Lookup Ticket by Barcode & Open Confirmation Modal (Camera QR / Barcode Gun) ──
  // Sesuai kebutuhan: TIDAK langsung auto check-in, melainkan memunculkan dialog konfirmasi
  // dengan info nama peserta, no HP, kategori tiket, jumlah rombongan, serta tombol pilihan
  // check-in 1 tiket atau check-in semua tiket rombongan sekaligus.
  const verifyTicket = useCallback(
    async (barcodeString: string) => {
      const qClean = barcodeString.trim();
      if (!qClean) return;
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      setIsLoading(true);
      setScanResult({ status: "loading", message: "Memeriksa data tiket..." });
      if (navigator.vibrate) navigator.vibrate(50);

      let foundTicket: SearchedTicket | null = null;

      // 1. Coba cari di IndexedDB lokal terlebih dahulu (respons super cepat < 2ms)
      try {
        const localMatch = await findOfflineTicketByBarcode(qClean);
        if (localMatch) {
          const total = localMatch.totalTickets || 1;
          const checked = localMatch.checkedInCount || (localMatch.isValidated ? 1 : 0);
          const remaining = localMatch.remainingCount ?? Math.max(0, total - checked);

          foundTicket = {
            id: localMatch.id,
            transactionId: localMatch.transactionId,
            barcodeString: localMatch.barcodeString,
            holderName: localMatch.holderName,
            holderPhone: localMatch.holderPhone,
            holderGender: localMatch.holderGender,
            isValidated: localMatch.isValidated,
            checkedInAt: localMatch.checkedInAt,
            totalTickets: total,
            checkedInCount: checked,
            remainingCount: remaining,
            ticketCategory: {
              name: localMatch.categoryName,
              price: localMatch.categoryPrice,
            },
            transaction: {
              id: localMatch.transactionId,
              buyerName: localMatch.buyerName,
              buyerPhone: localMatch.buyerPhone,
              status: localMatch.txStatus,
              totalTickets: total,
              checkedInCount: checked,
              remainingCount: remaining,
              event: { title: localMatch.eventTitle },
            },
          };
        }
      } catch (err) {
        console.warn("Lookup offline error:", err);
      }

      // 2. Jika online, cek data terbaru dari server dengan timeout 8 detik (bukan 2.5s)
      if (navigator.onLine) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const params = new URLSearchParams();
          params.append("q", qClean);
          if (selectedEventId && selectedEventId !== "ALL") {
            params.append("eventId", selectedEventId);
          }

          const res = await fetch(`/api/scanner/search?${params.toString()}`, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const data = await res.json();

          if (data.success && Array.isArray(data.tickets) && data.tickets.length > 0) {
            const exact =
              data.tickets.find(
                (t: SearchedTicket) =>
                  t.barcodeString.toLowerCase() === qClean.toLowerCase()
              ) || data.tickets[0];

            if (exact) {
              foundTicket = exact;
            }
          }
        } catch (err) {
          console.warn("Online search fetch error, fallback to local if available:", err);
        }
      }

      setIsLoading(false);
      setScanResult(null);

      // 3. Tampilkan hasil: Jika tiket ditemukan, buka modal konfirmasi!
      if (foundTicket) {
        if (foundTicket.isValidated && (foundTicket.remainingCount ?? 0) === 0) {
          playBeep("already");
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } else {
          playBeep("success");
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        }
        setTicketToValidate(foundTicket);
        // decode loop otomatis pause karena ticketToValidateRef.current aktif
        cooldownRef.current = false;
      } else {
        // Tiket tidak ditemukan
        playBeep("error");
        if (navigator.vibrate) navigator.vibrate(400);
        setScanResult({
          status: "invalid",
          message: `Tiket tidak ditemukan (Barcode: "${qClean}"). Pastikan kode sesuai atau perbarui cache offline.`,
        });

        setTimeout(() => {
          lastScanRef.current = "";
          cooldownRef.current = false;
          setIsLoading(false);
        }, 2200);

        setTimeout(() => {
          setScanResult(null);
        }, 3500);
      }
    },
    [selectedEventId]
  );

  // ─── Batch Check-In Sisa Tiket Rombongan dari Popup Scan Kamera ──────────────
  const handleCheckInAllFromScan = async (scannedTicket: NonNullable<ScanResult["ticket"]>) => {
    setIsLoading(true);

    // Mode OFFLINE
    if (!navigator.onLine) {
      if (scannedTicket.id) {
        try {
          const res = await checkInTicketOffline(scannedTicket.id, true);
          if (res.status === "VALID") {
            playBeep("success");
            if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
            setScanResult({
              status: "valid",
              message: `✅ Berhasil check-in SEMUA sisa rombongan (${scannedTicket.totalTickets || 1} tiket) offline!`,
              ticket: {
                ...scannedTicket,
                checkedInCount: scannedTicket.totalTickets || 1,
                remainingCount: 0,
              },
            });

            if (searchQuery.trim()) {
              fetchSearchResults(searchQuery, selectedEventId, statusFilter);
            }
            refreshOfflineStats();

            setTimeout(() => {
              setScanResult(null);
              lastScanRef.current = "";
              cooldownRef.current = false;
              setIsLoading(false);
            }, 3500);
          } else {
            playBeep("already");
            setScanResult({
              status: "already",
              message: res.message,
              ticket: {
                ...scannedTicket,
                checkedInCount: scannedTicket.totalTickets || 1,
                remainingCount: 0,
              },
            });
            setIsLoading(false);
          }
        } catch {
          playBeep("error");
          setIsLoading(false);
        }
      }
      return;
    }

    // Mode ONLINE
    try {
      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: scannedTicket.id,
          barcodeString: scannedTicket.barcodeString,
          transactionId: scannedTicket.transactionId,
          checkInAll: true,
        }),
      });
      const data = await res.json();

      if (data.success && data.status === "VALID") {
        playBeep("success");
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        setScanResult({
          status: "valid",
          message: data.message || `✅ Berhasil check-in SEMUA tiket rombongan!`,
          ticket: data.ticket || {
            ...scannedTicket,
            checkedInCount: scannedTicket.totalTickets || 1,
            remainingCount: 0,
          },
        });

        if (searchQuery.trim()) {
          fetchSearchResults(searchQuery, selectedEventId, statusFilter);
        }

        setTimeout(() => {
          setScanResult(null);
          lastScanRef.current = "";
          cooldownRef.current = false;
          setIsLoading(false);
        }, 3500);
      } else {
        playBeep("already");
        setScanResult({
          status: "already",
          message: data.message || "Semua tiket sudah digunakan.",
          ticket: data.ticket,
        });
        setIsLoading(false);
      }
    } catch {
      // Fallback offline jika request online gagal
      if (scannedTicket.id) {
        try {
          const res = await checkInTicketOffline(scannedTicket.id, true);
          if (res.status === "VALID") {
            playBeep("success");
            setScanResult({
              status: "valid",
              message: `✅ Koneksi lambat: Check-in rombongan disimpan lokal!`,
              ticket: {
                ...scannedTicket,
                checkedInCount: scannedTicket.totalTickets || 1,
                remainingCount: 0,
              },
            });
            refreshOfflineStats();
            setTimeout(() => {
              setScanResult(null);
              lastScanRef.current = "";
              cooldownRef.current = false;
              setIsLoading(false);
            }, 3500);
          }
        } catch {
          playBeep("error");
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
  };

  // ─── Direct Check-In from Modal (by Ticket ID & Supports Check-In All) ───────
  const handleConfirmCheckIn = async (ticket: SearchedTicket, checkInAll: boolean = false) => {
    setIsValidatingTicket(true);
    setValidationErrorMessage(null);
    setValidationSuccessMessage(null);

    // Jika OFFLINE: Eksekusi langsung di IndexedDB
    if (!navigator.onLine) {
      try {
        const checkRes = await checkInTicketOffline(ticket.id, checkInAll);
        if (checkRes.status === "VALID") {
          playBeep("success");
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
          const successMsg = checkInAll
            ? `Check-in offline berhasil untuk SEMUA tiket rombongan (${ticket.totalTickets || 1} tiket)! Data tersimpan di HP/Laptop.`
            : `Check-in offline berhasil untuk ${ticket.holderName || ticket.transaction.buyerName}! Data tersimpan di HP/Laptop.`;
          setValidationSuccessMessage(successMsg);

          setSearchResults((prev) =>
            prev.map((t) => {
              if (checkInAll && t.transactionId && t.transactionId === ticket.transactionId) {
                return {
                  ...t,
                  isValidated: true,
                  checkedInAt: new Date().toISOString(),
                  checkedInCount: t.totalTickets || 1,
                  remainingCount: 0,
                };
              }
              const matchedId = checkRes.ticket?.id || ticket.id;
              if (t.id === matchedId) {
                const newChecked = checkRes.ticket?.checkedInCount ?? ((t.checkedInCount || 0) + 1);
                return {
                  ...t,
                  isValidated: true,
                  checkedInAt: new Date().toISOString(),
                  checkedInCount: newChecked,
                  remainingCount:
                    checkRes.ticket?.remainingCount ??
                    Math.max(0, (t.totalTickets || 1) - newChecked),
                };
              }
              if (t.transactionId && t.transactionId === ticket.transactionId) {
                const newChecked = checkRes.ticket?.checkedInCount ?? ((t.checkedInCount || 0) + 1);
                return {
                  ...t,
                  checkedInCount: newChecked,
                  remainingCount:
                    checkRes.ticket?.remainingCount ??
                    Math.max(0, (t.totalTickets || 1) - newChecked),
                };
              }
              return t;
            })
          );

          setHistory((prev) => [
            {
              id: Date.now().toString(),
              barcodeString: checkRes.ticket?.barcodeString || ticket.barcodeString,
              status: "valid",
              holderName: checkInAll
                ? `Rombongan: ${ticket.holderName || ticket.transaction.buyerName} (${ticket.totalTickets || 1} tiket)`
                : checkRes.ticket?.holderName || ticket.holderName || ticket.transaction.buyerName,
              eventTitle: ticket.transaction.event.title,
              time: new Date(),
              isOfflineSync: true,
            },
            ...prev.slice(0, 19),
          ]);

          refreshOfflineStats();

          const finalRemainingOffline = checkInAll
            ? 0
            : (checkRes.ticket?.remainingCount ??
              Math.max(
                0,
                (ticket.totalTickets || 1) -
                (checkRes.ticket?.checkedInCount ?? ((ticket.checkedInCount || 0) + 1))
              ));
          const finalCheckedCountOffline = checkInAll
            ? (ticket.totalTickets || 1)
            : (checkRes.ticket?.checkedInCount ?? ((ticket.checkedInCount || 0) + 1));

          setTicketToValidate((curr) => {
            if (!curr) return null;
            return {
              ...curr,
              isValidated: true,
              checkedInAt: checkRes.ticket?.checkedInAt || new Date().toISOString(),
              checkedInCount: finalCheckedCountOffline,
              remainingCount: finalRemainingOffline,
            };
          });

          setIsValidatingTicket(false);

          // JIKA SEMUA TIKET SUDAH LENGKAP: Tutup modal otomatis setelah 1.8 detik
          // JIKA BELUM HABIS: JANGAN TUTUP POP-UP MODAL! Biarkan admin bisa lanjut check-in tiket berikutnya
          if (finalRemainingOffline === 0) {
            setTimeout(() => {
              closeValidationModal();
              searchInputRef.current?.focus();
            }, 1800);
          } else {
            setTimeout(() => {
              setValidationSuccessMessage(null);
            }, 2500);
          }
        } else {
          if (checkRes.status === "ALREADY_CHECKED_IN") playBeep("already");
          else playBeep("error");
          setValidationErrorMessage(checkRes.message);
          setIsValidatingTicket(false);
        }
      } catch (err) {
        console.error(err);
        playBeep("error");
        setValidationErrorMessage("Gagal memproses check-in lokal.");
        setIsValidatingTicket(false);
      }
      return;
    }

    // Jika ONLINE: Kirim ke server dengan fallback lokal jika timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch("/api/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          barcodeString: ticket.barcodeString,
          transactionId: ticket.transactionId,
          checkInAll,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (data.success && data.status === "VALID") {
        playBeep("success");
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        setValidationSuccessMessage(
          data.message ||
          (checkInAll
            ? `Check-in berhasil untuk SEMUA tiket (${ticket.totalTickets || 1} tiket)!`
            : `Check-in berhasil untuk ${ticket.holderName || ticket.transaction.buyerName}!`)
        );

        setSearchResults((prev) =>
          prev.map((t) => {
            if (checkInAll && t.transactionId && t.transactionId === ticket.transactionId) {
              return {
                ...t,
                isValidated: true,
                checkedInAt: new Date().toISOString(),
                checkedInCount: t.totalTickets || 1,
                remainingCount: 0,
              };
            }
            const matchedId = data.ticket?.id || ticket.id;
            if (t.id === matchedId) {
              const newChecked = data.ticket?.checkedInCount ?? ((t.checkedInCount || 0) + 1);
              return {
                ...t,
                isValidated: true,
                checkedInAt: new Date().toISOString(),
                checkedInCount: newChecked,
                remainingCount:
                  data.ticket?.remainingCount ??
                  Math.max(0, (t.totalTickets || 1) - newChecked),
              };
            }
            if (t.transactionId && t.transactionId === ticket.transactionId) {
              const newChecked = data.ticket?.checkedInCount ?? ((t.checkedInCount || 0) + 1);
              return {
                ...t,
                checkedInCount: newChecked,
                remainingCount:
                  data.ticket?.remainingCount ??
                  Math.max(0, (t.totalTickets || 1) - newChecked),
              };
            }
            return t;
          })
        );

        setHistory((prev) => [
          {
            id: Date.now().toString(),
            barcodeString: data.ticket?.barcodeString || ticket.barcodeString,
            status: "valid",
            holderName: checkInAll
              ? `Rombongan: ${ticket.holderName || ticket.transaction.buyerName} (${ticket.totalTickets || 1} tiket)`
              : data.ticket?.holderName || ticket.holderName || ticket.transaction.buyerName,
            eventTitle: ticket.transaction.event.title,
            time: new Date(),
          },
          ...prev.slice(0, 19),
        ]);

        if (searchQuery.trim()) {
          fetchSearchResults(searchQuery, selectedEventId, statusFilter);
        }

        const finalRemainingOnline = checkInAll
          ? 0
          : (data.ticket?.remainingCount ??
            Math.max(
              0,
              (ticket.totalTickets || 1) -
              (data.ticket?.checkedInCount ?? ((ticket.checkedInCount || 0) + 1))
            ));
        const finalCheckedCountOnline = checkInAll
          ? (ticket.totalTickets || 1)
          : (data.ticket?.checkedInCount ?? ((ticket.checkedInCount || 0) + 1));

        setTicketToValidate((curr) => {
          if (!curr) return null;
          return {
            ...curr,
            isValidated: true,
            checkedInAt: data.ticket?.checkedInAt || new Date().toISOString(),
            checkedInCount: finalCheckedCountOnline,
            remainingCount: finalRemainingOnline,
          };
        });

        setIsValidatingTicket(false);

        // JIKA SEMUA TIKET SUDAH LENGKAP: Tutup modal otomatis setelah 1.8 detik
        // JIKA BELUM HABIS: JANGAN TUTUP POP-UP MODAL! Biarkan admin bisa lanjut check-in tiket berikutnya
        if (finalRemainingOnline === 0) {
          setTimeout(() => {
            closeValidationModal();
            searchInputRef.current?.focus();
          }, 1800);
        } else {
          setTimeout(() => {
            setValidationSuccessMessage(null);
          }, 2500);
        }
      } else {
        if (data.status === "ALREADY_CHECKED_IN") {
          playBeep("already");
        } else {
          playBeep("error");
        }
        setValidationErrorMessage(data.message || "Gagal melakukan check-in.");
        setIsValidatingTicket(false);
      }
    } catch {
      // Jaringan ngelag / timeout: Otomatis check-in ke memori lokal IndexedDB!
      try {
        const localCheckRes = await checkInTicketOffline(ticket.id, checkInAll);
        if (localCheckRes.status === "VALID") {
          playBeep("success");
          setValidationSuccessMessage(
            `Koneksi lemot: Check-in berhasil disimpan di memori lokal (${checkInAll
              ? "Semua tiket rombongan"
              : ticket.holderName || ticket.transaction.buyerName
            }). Akan otomatis tersinkron saat internet lancar.`
          );

          setSearchResults((prev) =>
            prev.map((t) => {
              if (checkInAll && t.transactionId && t.transactionId === ticket.transactionId) {
                return {
                  ...t,
                  isValidated: true,
                  checkedInAt: new Date().toISOString(),
                  checkedInCount: t.totalTickets || 1,
                  remainingCount: 0,
                };
              }
              const matchedId = localCheckRes.ticket?.id || ticket.id;
              if (t.id === matchedId) {
                const newChecked = localCheckRes.ticket?.checkedInCount ?? ((t.checkedInCount || 0) + 1);
                return {
                  ...t,
                  isValidated: true,
                  checkedInAt: new Date().toISOString(),
                  checkedInCount: newChecked,
                  remainingCount:
                    localCheckRes.ticket?.remainingCount ??
                    Math.max(0, (t.totalTickets || 1) - newChecked),
                };
              }
              if (t.transactionId && t.transactionId === ticket.transactionId) {
                const newChecked = localCheckRes.ticket?.checkedInCount ?? ((t.checkedInCount || 0) + 1);
                return {
                  ...t,
                  checkedInCount: newChecked,
                  remainingCount:
                    localCheckRes.ticket?.remainingCount ??
                    Math.max(0, (t.totalTickets || 1) - newChecked),
                };
              }
              return t;
            })
          );

          setHistory((prev) => [
            {
              id: Date.now().toString(),
              barcodeString: ticket.barcodeString,
              status: "valid",
              holderName: checkInAll
                ? `Rombongan: ${ticket.holderName || ticket.transaction.buyerName} (${ticket.totalTickets || 1} tiket)`
                : ticket.holderName || ticket.transaction.buyerName,
              eventTitle: ticket.transaction.event.title,
              time: new Date(),
              isOfflineSync: true,
            },
            ...prev.slice(0, 19),
          ]);

          refreshOfflineStats();

          const finalRemainingFallback = checkInAll
            ? 0
            : (localCheckRes.ticket?.remainingCount ??
              Math.max(
                0,
                (ticket.totalTickets || 1) -
                (localCheckRes.ticket?.checkedInCount ?? ((ticket.checkedInCount || 0) + 1))
              ));
          const finalCheckedCountFallback = checkInAll
            ? (ticket.totalTickets || 1)
            : (localCheckRes.ticket?.checkedInCount ?? ((ticket.checkedInCount || 0) + 1));

          setTicketToValidate((curr) => {
            if (!curr) return null;
            return {
              ...curr,
              isValidated: true,
              checkedInAt: localCheckRes.ticket?.checkedInAt || new Date().toISOString(),
              checkedInCount: finalCheckedCountFallback,
              remainingCount: finalRemainingFallback,
            };
          });

          setIsValidatingTicket(false);

          // JIKA SEMUA TIKET SUDAH LENGKAP: Tutup modal otomatis setelah 1.8 detik
          // JIKA BELUM HABIS: JANGAN TUTUP POP-UP MODAL! Biarkan admin bisa lanjut check-in tiket berikutnya
          if (finalRemainingFallback === 0) {
            setTimeout(() => {
              closeValidationModal();
              searchInputRef.current?.focus();
            }, 1800);
          } else {
            setTimeout(() => {
              setValidationSuccessMessage(null);
            }, 2500);
          }
        } else {
          setValidationErrorMessage(localCheckRes.message);
          setIsValidatingTicket(false);
        }
      } catch {
        playBeep("error");
        setValidationErrorMessage("Koneksi gagal dan penyimpanan lokal tidak dapat diakses.");
        setIsValidatingTicket(false);
      }
    }
  };

  // ─── 60fps Camera Decode Loop ──────────────────────────────────────────────
  const startDecodeLoop = useCallback(() => {
    if (!readerRef.current) return;
    const decode = async () => {
      // Jika modal konfirmasi sedang terbuka, pause pemindaian agar tidak ter-trigger berulang
      if (ticketToValidateRef.current) {
        animFrameRef.current = requestAnimationFrame(decode);
        return;
      }

      const now = Date.now();
      if (fpsCounterRef.current.lastTime === 0) {
        fpsCounterRef.current.lastTime = now;
      }
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }

      if (videoRef.current && canvasRef.current && !cooldownRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (zxingLibRef.current && readerRef.current) {
              try {
                const { HTMLCanvasElementLuminanceSource, BinaryBitmap, HybridBinarizer } =
                  zxingLibRef.current;
                const ls = new HTMLCanvasElementLuminanceSource(canvas);
                const bb = new BinaryBitmap(new HybridBinarizer(ls));
                const result = readerRef.current.decodeBitmap(bb);
                const text = result.getText();
                if (text && text !== lastScanRef.current) {
                  lastScanRef.current = text;
                  verifyTicket(text);
                }
              } catch {
                // Ignore empty frame
              }
            }
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(decode);
    };
    animFrameRef.current = requestAnimationFrame(decode);
  }, [verifyTicket]);

  // ─── Camera Controls ───────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          frameRate: { ideal: 60, min: 30 },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const track = stream.getVideoTracks()[0];
      const getCaps = (track as unknown as { getCapabilities?: () => { torch?: boolean } })
        .getCapabilities;
      const caps = getCaps ? getCaps.call(track) : null;
      setHasFlash(!!caps?.torch);
      setIsActive(true);
      startDecodeLoop();
    } catch (err: unknown) {
      const errorObj = err as { name?: string };
      if (errorObj?.name === "NotAllowedError") {
        setCameraError("Izin kamera ditolak. Mohon izinkan akses kamera di browser.");
      } else if (errorObj?.name === "NotFoundError") {
        setCameraError("Kamera tidak ditemukan di perangkat ini.");
      } else {
        setCameraError("Gagal mengakses kamera. Silakan gunakan pencarian nama/barcode di sebelah.");
      }
    }
  }, [startDecodeLoop]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsActive(false);
    setIsFlashOn(false);
  }, []);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      // @ts-expect-error Torch constraint
      await track.applyConstraints({ advanced: [{ torch: !isFlashOn }] });
      setIsFlashOn((v) => !v);
    } catch {
      // Ignore
    }
  }, [isFlashOn]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ─── Result Configurations for Toast/Alert ─────────────────────────────────
  const RESULT_CFG = {
    valid: {
      gradient: "from-emerald-500/20 to-emerald-600/10",
      border: "border-emerald-500/50",
      icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
      badge: "bg-emerald-500",
      label: "VALID ✓",
      textColor: "text-emerald-300",
      glow: "shadow-emerald-500/20",
    },
    already: {
      gradient: "from-amber-500/20 to-amber-600/10",
      border: "border-amber-500/50",
      icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
      badge: "bg-amber-500",
      label: "SUDAH CHECK-IN",
      textColor: "text-amber-300",
      glow: "shadow-amber-500/20",
    },
    invalid: {
      gradient: "from-red-500/20 to-red-600/10",
      border: "border-red-500/50",
      icon: <XCircle className="w-8 h-8 text-red-400" />,
      badge: "bg-red-500",
      label: "TIDAK VALID ✗",
      textColor: "text-red-300",
      glow: "shadow-red-500/20",
    },
    error: {
      gradient: "from-slate-600/20 to-slate-700/10",
      border: "border-slate-500/50",
      icon: <XCircle className="w-8 h-8 text-slate-400" />,
      badge: "bg-slate-600",
      label: "ERROR",
      textColor: "text-slate-300",
      glow: "",
    },
    loading: {
      gradient: "from-blue-500/20 to-blue-600/10",
      border: "border-blue-500/50",
      icon: <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />,
      badge: "bg-blue-500",
      label: "MEMVERIFIKASI",
      textColor: "text-blue-300",
      glow: "shadow-blue-500/20",
    },
    idle: { gradient: "", border: "", icon: null, badge: "", label: "", textColor: "", glow: "" },
    scanning: {
      gradient: "",
      border: "",
      icon: null,
      badge: "",
      label: "",
      textColor: "",
      glow: "",
    },
  };
  const cfg = scanResult ? RESULT_CFG[scanResult.status] : null;

  return (
    <div
      className="flex flex-col min-h-[calc(100vh-4rem)] text-slate-100 selection:bg-emerald-500 selection:text-white"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #0d1b2a 0%, #070d18 60%, #040810 100%)",
      }}
    >
      {/* ── Top Bar & Offline Status (Normal on Mobile, Sticky on Desktop) ──── */}
      <div className="relative lg:sticky lg:top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20">
        <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
            >
              <ScanLine className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-white font-bold text-sm sm:text-lg tracking-tight leading-none">
                  Check-In & Scanner
                </h1>
                {adminRole && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                    {adminRole === "VALIDATOR" ? "VALIDATOR" : "SUPER ADMIN"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                Scan barcode tiket atau cari nama / nomor telepon peserta secara cepat
              </p>
            </div>
          </div>

          {/* Right Actions: Network Status, Pending Sync, History */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Network Connection Indicator */}
            <div
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-semibold ${isOnline
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/15 border-red-500/30 text-red-400 animate-pulse"
                }`}
              title={isOnline ? "Terhubung ke Internet" : "Mode Offline: Bekerja dengan Cache Lokal"}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isOnline ? "Online" : "Mode Offline"}</span>
            </div>

            {/* Pending Sync Button/Badge */}
            {offlineStats.pendingSyncCount > 0 && (
              <button
                onClick={syncPendingQueue}
                disabled={isSyncingQueue || !isOnline}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs font-bold hover:brightness-110 active:scale-95 transition-all animate-bounce"
                title="Ada data check-in lokal yang belum terkirim ke server. Klik untuk sinkronkan!"
              >
                <RefreshCw
                  className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isSyncingQueue ? "animate-spin text-amber-200" : ""}`}
                />
                <span>{offlineStats.pendingSyncCount} Sync</span>
              </button>
            )}

            {/* History modal trigger */}
            <button
              onClick={() => setShowHistory(true)}
              className="relative flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-slate-300 text-[11px] sm:text-xs font-medium"
              title="Riwayat Check-in"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Riwayat</span>
              {history.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                  {history.length}
                </span>
              )}
            </button>

            {/* FPS Indicator when camera active */}
            {isActive && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                <span className="text-xs font-mono text-yellow-300 tabular-nums">
                  {fps} <span className="text-yellow-500/60 text-[10px]">FPS</span>
                </span>
              </div>
            )}
          </div>
        </header>

        {/* ── Offline Cache & Sync Banner (Sub Header Bar) ──────────────────────── */}
        <div className="px-3 sm:px-6 py-1.5 border-t border-white/5 bg-slate-900/60 flex items-center justify-between gap-2 text-[11px] sm:text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              DB Lokal:{" "}
              <strong className="text-emerald-300 font-mono">
                {offlineStats.totalTickets} tiket
              </strong>{" "}
              <span className="hidden sm:inline">tersimpan di HP/Laptop</span>
            </span>
            {offlineStats.lastSyncedAt && (
              <span className="text-slate-500 hidden md:inline">
                (Diunduh:{" "}
                {new Date(offlineStats.lastSyncedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                )
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download offline data button */}
            <button
              onClick={() => downloadOfflineCache(true)}
              disabled={isDownloadingOffline || !isOnline}
              className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300 hover:text-white transition-all disabled:opacity-40 text-[10px] sm:text-xs font-medium"
              title="Perbarui daftar tiket lokal agar tetap bisa check-in saat sinyal ngelag"
            >
              {isDownloadingOffline ? (
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
              ) : (
                <CloudDownload className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              )}
              <span>
                {isDownloadingOffline ? "Mengunduh..." : "Perbarui Data"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification for Sync / Network info */}
      {syncStatusToast && (
        <div className="px-3 sm:px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncStatusToast}</span>
          </div>
          <button
            onClick={() => setSyncStatusToast(null)}
            className="text-emerald-400 hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Mobile Tab Navigation (Only screens < lg) ───────────────────────── */}
      <div className="lg:hidden px-3 pt-2 pb-1 border-b border-white/5 bg-slate-900/50">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
          <button
            onClick={() => setMobileTab("search")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${mobileTab === "search"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 font-bold"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Cari / Input</span>
          </button>
          <button
            onClick={() => setMobileTab("camera")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${mobileTab === "camera"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 font-bold"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Kamera QR</span>
          </button>
          <button
            onClick={() => setMobileTab("history")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${mobileTab === "history"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25 font-bold"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat ({history.length})</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-24 sm:py-5 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">

          {/* ═══════════════════════════════════════════════════════════════════
              KOLOM KIRI: 1 INPUT MASTER (BARCODE / NAMA / TELPON) & HASIL
             ═══════════════════════════════════════════════════════════════════ */}
          <div
            className={`lg:col-span-7 flex flex-col gap-3 sm:gap-4 ${mobileTab !== "search" ? "hidden lg:flex" : "flex"
              }`}
          >
            {/* 1 Master Unified Input Card */}
            <div
              className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden"
              style={{
                boxShadow: "0 20px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <form onSubmit={handleMasterInputSubmit} className="flex flex-col gap-2.5 sm:gap-3">
                {/* Master Input Field */}
                <div className="relative flex items-center">
                  <div className="absolute left-3 sm:left-4 flex items-center pointer-events-none text-emerald-400">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-emerald-400" />
                    ) : (
                      <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>

                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Scan barcode tiket atau ketik nama / no HP..."
                    autoFocus
                    className="w-full pl-9 sm:pl-12 pr-20 sm:pr-24 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-base text-white placeholder:text-slate-500 focus:outline-none transition-all font-medium"
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.2) inset",
                      caretColor: "#10b981",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(16, 185, 129, 0.8)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.2)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(16, 185, 129, 0.35)";
                      e.target.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2) inset";
                    }}
                  />

                  {/* Clear / Enter Buttons inside input */}
                  <div className="absolute right-2 sm:right-2.5 flex items-center gap-1 sm:gap-1.5">
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          searchInputRef.current?.focus();
                        }}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                        title="Hapus pencarian"
                      >
                        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!searchQuery.trim()}
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-bold text-xs text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-md shadow-emerald-500/20"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                    >
                      <span>Cek</span>
                      <kbd className="hidden sm:inline-block text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono">
                        ↵
                      </kbd>
                    </button>
                  </div>
                </div>

                {/* ── HINTS (Petunjuk Input) ────────────────────────────────── */}
                <div className="flex items-center gap-1.5 pt-0.5 text-[10px] sm:text-[11px] text-slate-400 overflow-x-auto no-scrollbar flex-nowrap shrink-0">
                  <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Cari:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("TX-");
                      searchInputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 transition-colors shrink-0 whitespace-nowrap"
                  >
                    <Barcode className="w-3 h-3 text-emerald-400" />
                    <span>Kode (TX-...)</span>
                  </button>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 shrink-0 whitespace-nowrap">
                    <User className="w-3 h-3 text-blue-400" />
                    <span>Nama Peserta</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 shrink-0 whitespace-nowrap">
                    <Phone className="w-3 h-3 text-purple-400" />
                    <span>No. WA / HP</span>
                  </span>
                </div>

                {/* Event Selector if multiple */}
                {initialEvents.length > 1 && (
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/5 text-[11px] sm:text-xs text-slate-400">
                    <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
                    <span className="shrink-0">Event:</span>
                    <select
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                      className="bg-slate-800/90 border border-white/10 rounded-lg sm:rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 text-slate-200 text-[11px] sm:text-xs focus:outline-none focus:border-emerald-500 flex-1 truncate font-medium"
                    >
                      {initialEvents.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </form>
            </div>

            {/* ── STATE 1: JIKA BELUM MENGETIK (JANGAN TAMPILKAN SEMUA DATA) ─── */}
            {!searchQuery.trim() && (
              <div
                className="p-6 sm:p-14 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center text-center gap-3 sm:gap-4"
                style={{
                  boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                }}
              >
                <div className="relative">
                  <div className="absolute inset-0 w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-emerald-500/10 blur-xl" />
                  <div
                    className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border border-white/10"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))",
                    }}
                  >
                    <Search className="w-6 h-6 sm:w-9 sm:h-9 text-emerald-400" />
                  </div>
                </div>

                <div className="max-w-md">
                  <h3 className="text-white font-bold text-sm sm:text-lg">
                    Siap untuk Validasi & Check-In
                  </h3>
                  <p className="text-slate-400 text-[11px] sm:text-sm mt-1 sm:mt-1.5 leading-relaxed">
                    Ketik <strong>Kode Barcode</strong>, <strong>Nama Peserta</strong>, atau{" "}
                    <strong>Nomor Telepon</strong> di kolom pencarian di atas untuk memunculkan
                    data peserta.
                  </p>
                </div>
              </div>
            )}

            {/* ── STATE 2: JIKA SUDAH MENGETIK (HASIL PENCARIAN REALTIME) ───── */}
            {searchQuery.trim() && (
              <div className="flex flex-col gap-2.5 sm:gap-3">
                {/* Result header & count */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    <h2 className="text-xs sm:text-sm font-bold text-slate-200">
                      Hasil Pencarian untuk &ldquo;{searchQuery}&rdquo;
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {!isOnline && (
                      <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        Mode Offline
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                      {searchResults.length} ditemukan
                    </span>
                  </div>
                </div>

                {/* List of matching tickets */}
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  {isSearching && searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-slate-900/40 border border-white/5 text-center">
                      <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 animate-spin mb-2 sm:mb-3" />
                      <p className="text-slate-300 font-medium text-xs sm:text-sm">Mencari data peserta...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 sm:p-12 rounded-2xl sm:rounded-3xl bg-slate-900/40 border border-white/5 text-center">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-3 text-slate-500">
                        <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <h3 className="text-slate-300 font-bold text-xs sm:text-sm">
                        Tidak ada data yang cocok
                      </h3>
                      <p className="text-slate-500 text-[11px] sm:text-xs mt-1 max-w-sm">
                        Tidak ditemukan tiket dengan kata kunci &ldquo;{searchQuery}&rdquo;. Periksa kembali
                        ejaan nama, nomor tiket, atau nomor telepon.
                      </p>
                    </div>
                  ) : (
                    searchResults.map((ticket) => {
                      const attendeeName = ticket.holderName || ticket.transaction.buyerName;
                      const isCheckedIn = ticket.isValidated;
                      const isApproved = ticket.transaction.status === "APPROVED";

                      return (
                        <div
                          key={ticket.id}
                          onClick={() => setTicketToValidate(ticket)}
                          className="group p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 relative overflow-hidden active:scale-[0.99]"
                          style={{
                            background: isCheckedIn
                              ? "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.8))"
                              : "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.8))",
                            borderColor: isCheckedIn
                              ? "rgba(245, 158, 11, 0.3)"
                              : "rgba(16, 185, 129, 0.35)",
                          }}
                        >
                          {/* Left: Attendee details */}
                          <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0">
                            {/* Avatar */}
                            <div
                              className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 mt-0.5 border ${isCheckedIn
                                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                                : !isApproved
                                  ? "bg-red-500/15 border-red-500/30 text-red-400"
                                  : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 group-hover:scale-105 transition-transform"
                                }`}
                            >
                              {isCheckedIn ? (
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                              ) : !isApproved ? (
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                              ) : (
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="font-bold text-white text-sm sm:text-base group-hover:text-emerald-300 transition-colors truncate">
                                  {attendeeName}
                                </span>
                                {ticket.holderName &&
                                  ticket.holderName !== ticket.transaction.buyerName && (
                                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal truncate max-w-[120px] sm:max-w-none">
                                      (Pemesan: {ticket.transaction.buyerName})
                                    </span>
                                  )}

                                {/* Multi-Ticket / Rombongan Badge */}
                                {ticket.totalTickets && ticket.totalTickets > 1 && (
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border ${(ticket.checkedInCount ?? 0) >= ticket.totalTickets
                                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                      : (ticket.checkedInCount ?? 0) > 0
                                        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                        : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                      }`}
                                  >
                                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span>
                                      Rombongan: {ticket.checkedInCount ?? (ticket.isValidated ? 1 : 0)}/{ticket.totalTickets} Hadir
                                    </span>
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 text-[11px] sm:text-xs text-slate-400">
                                {/* Barcode Tag */}
                                <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[10px] sm:text-xs">
                                  {ticket.barcodeString}
                                </span>

                                {/* Category */}
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-slate-300 font-medium text-[10px] sm:text-xs">
                                  {ticket.ticketCategory.name}
                                </span>

                                {/* Phone */}
                                {(ticket.holderPhone || ticket.transaction.buyerPhone) && (
                                  <span className="inline-flex items-center gap-1 text-slate-400 text-[10px] sm:text-xs">
                                    <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500" />
                                    {ticket.holderPhone || ticket.transaction.buyerPhone}
                                  </span>
                                )}

                                {/* Event Title */}
                                <span className="hidden md:inline-block text-slate-500 truncate max-w-[180px]">
                                  • {ticket.transaction.event.title}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Status badge & Action */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                            {isCheckedIn ? (
                              <div className="w-full sm:w-auto flex items-center justify-between sm:block text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg sm:rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {ticket.totalTickets && ticket.totalTickets > 1
                                    ? `HADIR (${ticket.checkedInCount ?? 1}/${ticket.totalTickets})`
                                    : "SUDAH CHECK-IN"}
                                </span>
                                {ticket.checkedInAt && (
                                  <p className="text-[10px] text-slate-400 sm:mt-1 font-mono">
                                    {new Date(ticket.checkedInAt).toLocaleString("id-ID", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </p>
                                )}
                              </div>
                            ) : !isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg sm:rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {ticket.transaction.status}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTicketToValidate(ticket);
                                }}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-500/20 hover:brightness-110"
                                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Check-In</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              KOLOM KANAN: KAMERA SCANNER & RIWAYAT (Desktop: 5 Cols, Mobile: Tab "camera")
             ═══════════════════════════════════════════════════════════════════ */}
          <div
            className={`lg:col-span-5 flex flex-col gap-4 ${mobileTab !== "camera" ? "hidden lg:flex" : "flex"
              }`}
          >
            {/* Viewfinder Card */}
            <div
              className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl"
              style={{
                aspectRatio: "4/3",
                boxShadow: isActive
                  ? "0 0 0 1px rgba(16,185,129,0.4), 0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(16,185,129,0.12)"
                  : "0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
                transition: "all 0.3s ease",
              }}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Vignette overlay */}
              {isActive && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.7) 100%)",
                  }}
                />
              )}

              {/* Idle state */}
              {!isActive && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 p-6 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 w-16 h-16 rounded-full bg-emerald-500/10 blur-xl" />
                    <div
                      className="relative w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))",
                      }}
                    >
                      <Camera className="w-8 h-8 text-emerald-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Scanner QR Kamera</p>
                    <p className="text-slate-400 text-xs mt-1 max-w-xs">
                      Aktifkan kamera untuk scan langsung tiket peserta melalui QR code.
                    </p>
                  </div>
                </div>
              )}

              {/* Camera error */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
                    <CameraOff className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-red-300 text-xs leading-relaxed max-w-xs">{cameraError}</p>
                </div>
              )}

              {/* Active scanning viewfinder overlay */}
              {isActive && !scanResult && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Corner frame */}
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                    {[
                      "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                      "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                      "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                      "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
                    ].map((cls, i) => (
                      <div
                        key={i}
                        className={`absolute w-8 h-8 sm:w-10 sm:h-10 border-emerald-400/90 ${cls}`}
                      />
                    ))}
                    {/* Scan line */}
                    <div
                      className="absolute left-3 right-3"
                      style={{
                        height: "2px",
                        background:
                          "linear-gradient(90deg, transparent, #34d399, #10b981, #34d399, transparent)",
                        animation: "scannerLine 2s ease-in-out infinite",
                      }}
                    />
                    {/* Center dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="w-2 h-2 rounded-full bg-emerald-400/70"
                        style={{ animation: "scannerPulse 2s ease-in-out infinite" }}
                      />
                    </div>
                  </div>

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <div
                      className="px-3 py-1 rounded-full text-[10px] font-bold text-emerald-300 tracking-wider"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(16,185,129,0.3)",
                      }}
                    >
                      ARAHKAN KE QR TIKET
                    </div>
                  </div>
                </div>
              )}

              {/* Flash badge */}
              {isFlashOn && (
                <div
                  className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(234,179,8,0.2)",
                    border: "1px solid rgba(234,179,8,0.4)",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-yellow-300 text-[10px] font-bold tracking-wider">FLASH ON</span>
                </div>
              )}

              {/* Keyframe animations */}
              <style>{`
                @keyframes scannerLine {
                  0%   { top: 15%; opacity: 0.2; }
                  50%  { top: 85%; opacity: 1; }
                  100% { top: 15%; opacity: 0.2; }
                }
                @keyframes scannerPulse {
                  0%, 100% { opacity: 0.3; transform: scale(1); }
                  50%       { opacity: 1;   transform: scale(1.6); }
                }
                @keyframes resultFadeIn {
                  from { opacity: 0; transform: translateY(8px) scale(0.98); }
                  to   { opacity: 1; transform: translateY(0) scale(1); }
                }
              `}</style>
            </div>

            {/* Camera Actions & Controls */}
            <div className="flex items-center gap-2.5">
              {!isActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/25 hover:brightness-110"
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <Camera className="w-4 h-4" />
                  <span>Aktifkan Kamera</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white/80 hover:text-white transition-all active:scale-95 border border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    <CameraOff className="w-4 h-4" />
                    <span>Matikan Kamera</span>
                  </button>

                  {hasFlash && (
                    <button
                      type="button"
                      onClick={toggleFlash}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border"
                      style={{
                        background: isFlashOn ? "rgba(234,179,8,0.2)" : "rgba(255,255,255,0.05)",
                        borderColor: isFlashOn ? "rgba(234,179,8,0.4)" : "rgba(255,255,255,0.1)",
                        color: isFlashOn ? "#fbbf24" : "rgba(255,255,255,0.5)",
                      }}
                      title="Nyalakan Flashlight"
                    >
                      ⚡
                    </button>
                  )}

                  {scanResult && (
                    <button
                      type="button"
                      onClick={() => {
                        setScanResult(null);
                        lastScanRef.current = "";
                        cooldownRef.current = false;
                        setIsLoading(false);
                      }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300"
                      title="Reset Status Scanner"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Scan Toast Result Card (When scanned via camera) */}
            {scanResult && cfg && (
              <div
                className={`w-full rounded-2xl border p-4 ${cfg.border} shadow-xl ${cfg.glow}`}
                style={{
                  background: `linear-gradient(135deg, ${cfg.gradient.replace("from-", "").replace("to-", "")})`,
                  backdropFilter: "blur(12px)",
                  animation: "resultFadeIn 0.25s ease-out forwards",
                }}
              >
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0 mt-0.5">{cfg.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-lg ${cfg.badge} text-white`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold ${cfg.textColor} leading-snug`}>
                      {scanResult.message}
                    </p>
                    {scanResult.ticket && (
                      <div className="mt-2.5 space-y-1.5 text-xs">
                        {scanResult.ticket.holderName && (
                          <div className="flex items-center gap-2 text-white font-bold">
                            <User className="w-3.5 h-3.5 text-white/60" />
                            <span>{scanResult.ticket.holderName}</span>
                          </div>
                        )}
                        {scanResult.ticket.category && (
                          <div className="flex items-center gap-2 text-white/80">
                            <Tag className="w-3.5 h-3.5 text-white/60" />
                            <span>{scanResult.ticket.category}</span>
                          </div>
                        )}

                        {/* Rombongan Info (Kuota e.g. 1/3) */}
                        {scanResult.ticket.totalTickets && scanResult.ticket.totalTickets > 1 && (
                          <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-between text-purple-200 font-medium">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-300 shrink-0" />
                              <span>
                                Kuota Rombongan:{" "}
                                <strong className="text-white">
                                  {scanResult.ticket.checkedInCount ?? 1}/{scanResult.ticket.totalTickets}
                                </strong>
                              </span>
                            </div>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/25 font-bold font-mono">
                              {(scanResult.ticket.remainingCount ?? 0) > 0
                                ? `Sisa ${scanResult.ticket.remainingCount}`
                                : "Lengkap"}
                            </span>
                          </div>
                        )}

                        {/* Tombol Check-In Sisa Tiket Sekaligus */}
                        {scanResult.ticket.remainingCount !== undefined &&
                          scanResult.ticket.remainingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => handleCheckInAllFromScan(scanResult.ticket!)}
                              className="w-full mt-2 py-2.5 px-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-purple-500/25 hover:brightness-110"
                              style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}
                            >
                              <Users className="w-4 h-4 text-purple-200" />
                              <span>
                                Check-In Sisa {scanResult.ticket.remainingCount} Tiket Sekaligus
                              </span>
                            </button>
                          )}
                        {scanResult.ticket.checkedInAt && (
                          <div className="flex items-center gap-2 text-white/60">
                            <Clock className="w-3.5 h-3.5 text-white/60" />
                            <span>
                              {new Date(scanResult.ticket.checkedInAt).toLocaleString("id-ID", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Riwayat Scan Sesi Ini (Desktop Panel) */}
            <div className="hidden lg:flex flex-col gap-2.5 p-4 rounded-3xl border border-white/10 bg-slate-900/40">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-emerald-400" />
                  Riwayat Scan Sesi Ini
                </span>
                <span className="text-slate-500 font-mono text-[11px]">{history.length} data</span>
              </div>
              {history.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Belum ada aktivitas scan pada sesi ini.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {history.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.status === "valid" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : item.status === "already" ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{item.holderName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {item.barcodeString}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {item.time.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        {item.isOfflineSync && (
                          <span className="text-[9px] text-amber-400 font-bold">Lokal</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              MOBILE TAB "HISTORY" (Only on mobile tab)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className={`lg:hidden flex-col gap-3 ${mobileTab !== "history" ? "hidden" : "flex"}`}>
            <div className="p-4 rounded-3xl border border-white/10 bg-slate-900/60">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Riwayat Check-In Sesi Ini ({history.length})
              </h2>
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Belum ada riwayat check-in pada sesi ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.status === "valid"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : item.status === "already"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                            }`}
                        >
                          {item.status === "valid" ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : item.status === "already" ? (
                            <AlertTriangle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-xs font-bold truncate">{item.holderName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {item.barcodeString}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {item.time.toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                        {item.isOfflineSync && (
                          <span className="text-[9px] text-amber-400 font-bold">Lokal</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          VALIDASI & KONFIRMASI CHECK-IN MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      {ticketToValidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: "rgba(3, 7, 18, 0.82)", backdropFilter: "blur(12px)" }}
          onClick={() => {
            if (!isValidatingTicket) {
              closeValidationModal();
            }
          }}
        >
          <div
            className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative"
            style={{
              background: "linear-gradient(160deg, #0f172a 0%, #090e17 100%)",
              animation: "resultFadeIn 0.25s ease-out forwards",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-xs sm:text-base">
                    Validasi Data & Konfirmasi Check-In
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Pastikan identitas peserta sudah sesuai</p>
                </div>
              </div>
              {!isValidatingTicket && (
                <button
                  onClick={closeValidationModal}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 flex flex-col gap-3.5 sm:gap-5 overflow-y-auto">
              {/* Peserta Info Card */}
              <div
                className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border flex flex-col gap-2.5 sm:gap-3"
                style={{
                  background: ticketToValidate.isValidated
                    ? "rgba(245, 158, 11, 0.08)"
                    : "rgba(16, 185, 129, 0.08)",
                  borderColor: ticketToValidate.isValidated
                    ? "rgba(245, 158, 11, 0.3)"
                    : "rgba(16, 185, 129, 0.3)",
                }}
              >
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Nama Peserta / Pemegang Tiket
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 tracking-tight">
                    {ticketToValidate.holderName || ticketToValidate.transaction.buyerName}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Nomor / Kode Tiket</span>
                    <span className="font-mono text-emerald-300 font-bold text-xs sm:text-sm">
                      {ticketToValidate.barcodeString}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Kategori Tiket</span>
                    <span className="text-white font-bold text-xs sm:text-sm">
                      {ticketToValidate.ticketCategory.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">No. WhatsApp / HP</span>
                    <span className="text-slate-200 font-medium text-xs">
                      {ticketToValidate.holderPhone && ticketToValidate.holderPhone !== "-"
                        ? ticketToValidate.holderPhone
                        : ticketToValidate.transaction.buyerPhone || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Event</span>
                    <span className="text-slate-200 font-medium truncate block text-xs">
                      {ticketToValidate.transaction.event.title}
                    </span>
                  </div>
                </div>

                {ticketToValidate.holderName &&
                  ticketToValidate.holderName !== ticketToValidate.transaction.buyerName && (
                    <div className="pt-2 border-t border-white/10 text-[10px] sm:text-[11px] text-slate-400">
                      Pemesan Transaksi:{" "}
                      <strong className="text-slate-300">
                        {ticketToValidate.transaction.buyerName}
                      </strong>
                    </div>
                  )}

                {/* Info Rombongan / Multi-tiket */}
                {ticketToValidate.totalTickets && ticketToValidate.totalTickets > 1 && (
                  <div className="pt-2 pb-0.5 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div>
                        <span className="text-purple-300 text-[11px] sm:text-xs font-bold block">
                          Tiket Rombongan ({ticketToValidate.checkedInCount ?? (ticketToValidate.isValidated ? 1 : 0)}/{ticketToValidate.totalTickets} Hadir)
                        </span>
                        <span className="text-slate-400 text-[10px] sm:text-[11px]">
                          {(ticketToValidate.remainingCount ?? Math.max(0, ticketToValidate.totalTickets - (ticketToValidate.checkedInCount ?? 0))) > 0
                            ? `Sisa ${ticketToValidate.remainingCount ?? Math.max(0, ticketToValidate.totalTickets - (ticketToValidate.checkedInCount ?? 0))} tiket belum hadir`
                            : "Semua kuota tiket rombongan sudah hadir"}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 shrink-0">
                      {ticketToValidate.checkedInCount ?? (ticketToValidate.isValidated ? 1 : 0)} / {ticketToValidate.totalTickets}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Alert or Confirmation Prompt */}
              {ticketToValidate.isValidated ? (
                <div className="flex flex-col gap-2.5">
                  {/* Jika rombongan masih punya sisa tiket yang belum check-in */}
                  {(ticketToValidate.remainingCount ?? 0) > 0 ? (
                    <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-start gap-2.5 sm:gap-3">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-purple-300 font-bold text-xs sm:text-sm">
                          Progress Rombongan: {ticketToValidate.checkedInCount ?? 1} dari {ticketToValidate.totalTickets} tiket sudah check-in
                        </p>
                        <p className="text-purple-200/80 text-[11px] sm:text-xs mt-0.5">
                          Masih ada <strong>{ticketToValidate.remainingCount} tiket</strong> belum hadir. Anda dapat langsung melanjutkan check-in tiket berikutnya menggunakan tombol di bawah.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 sm:gap-3">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-300 font-bold text-xs sm:text-sm">
                          Semua tiket rombongan ({ticketToValidate.totalTickets}/{ticketToValidate.totalTickets}) sudah digunakan!
                        </p>
                        <p className="text-amber-200/70 text-[11px] sm:text-xs mt-0.5">
                          Check-in terakhir tercatat pada{" "}
                          {ticketToValidate.checkedInAt
                            ? new Date(ticketToValidate.checkedInAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                            : "Sebelumnya"}
                          .
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : ticketToValidate.transaction.status !== "APPROVED" ? (
                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 sm:gap-3">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-bold text-xs sm:text-sm">
                      Pembayaran Belum Disetujui
                    </p>
                    <p className="text-red-200/70 text-[11px] sm:text-xs mt-0.5">
                      Status pembayaran tiket ini adalah{" "}
                      <strong>{ticketToValidate.transaction.status}</strong>. Tiket tidak dapat
                      di-check in sebelum diverifikasi.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 sm:gap-3">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-emerald-200 text-xs sm:text-sm leading-relaxed">
                    Apakah Anda yakin informasi atas nama{" "}
                    <strong className="text-white">
                      {ticketToValidate.holderName || ticketToValidate.transaction.buyerName}
                    </strong>{" "}
                    sudah sesuai dan ingin melakukan Check-In untuk tiket ini?
                  </p>
                </div>
              )}

              {/* Feedback messages */}
              {validationSuccessMessage && (
                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                  <span>{validationSuccessMessage}</span>
                </div>
              )}

              {validationErrorMessage && (
                <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />
                  <span>{validationErrorMessage}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 bg-slate-900/60 flex flex-wrap items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isValidatingTicket}
                onClick={closeValidationModal}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
              >
                {ticketToValidate.isValidated
                  ? "Selesai / Tutup"
                  : ticketToValidate.transaction.status !== "APPROVED"
                    ? "Tutup"
                    : "Batal"}
              </button>

              {ticketToValidate.transaction.status === "APPROVED" && (
                <>
                  {/* JIKA TIKET INI BELUM CHECK-IN */}
                  {!ticketToValidate.isValidated && (
                    <>
                      {/* Tombol 1: Check-in 1 Tiket Ini */}
                      <button
                        type="button"
                        disabled={isValidatingTicket}
                        onClick={() => handleConfirmCheckIn(ticketToValidate, false)}
                        className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed border border-emerald-500/30 bg-emerald-600/30 hover:bg-emerald-600/50 shadow-md shadow-emerald-500/10"
                      >
                        {isValidatingTicket ? (
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                        )}
                        <span>
                          {ticketToValidate.totalTickets && ticketToValidate.totalTickets > 1
                            ? "Check-In 1 Tiket Ini"
                            : "Ya, Check-In Sekarang"}
                        </span>
                      </button>

                      {/* Tombol 2: Check-In SEMUA Tiket Sekaligus (Hanya jika rombongan & sisa > 1) */}
                      {ticketToValidate.totalTickets &&
                        ticketToValidate.totalTickets > 1 &&
                        (ticketToValidate.remainingCount ?? ticketToValidate.totalTickets) > 1 && (
                          <button
                            type="button"
                            disabled={isValidatingTicket}
                            onClick={() => handleConfirmCheckIn(ticketToValidate, true)}
                            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:brightness-110"
                            style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                          >
                            {isValidatingTicket ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                <span>Memproses...</span>
                              </>
                            ) : (
                              <>
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-200" />
                                <span>
                                  Check-In Semua ({ticketToValidate.remainingCount ?? ticketToValidate.totalTickets} Tiket)
                                </span>
                              </>
                            )}
                          </button>
                        )}
                    </>
                  )}

                  {/* JIKA TIKET INI SUDAH CHECK-IN, TETAPI ROMBONGAN MASIH PUNYA SISA TIKET! */}
                  {ticketToValidate.isValidated && (ticketToValidate.remainingCount ?? 0) > 0 && (
                    <>
                      {/* Tombol Check-In 1 Tiket Berikutnya */}
                      <button
                        type="button"
                        disabled={isValidatingTicket}
                        onClick={() => handleConfirmCheckIn(ticketToValidate, false)}
                        className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed border border-emerald-500/30 bg-emerald-600/30 hover:bg-emerald-600/50 shadow-md shadow-emerald-500/10"
                      >
                        {isValidatingTicket ? (
                          <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                        )}
                        <span>
                          Check-In Tiket Ke-{(ticketToValidate.checkedInCount || 0) + 1}
                        </span>
                      </button>

                      {/* Tombol Check-In Sisa Tiket Sekaligus */}
                      <button
                        type="button"
                        disabled={isValidatingTicket}
                        onClick={() => handleConfirmCheckIn(ticketToValidate, true)}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 hover:brightness-110"
                        style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)" }}
                      >
                        {isValidatingTicket ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-200" />
                            <span>
                              Check-In Sisa {ticketToValidate.remainingCount} Tiket Sekaligus
                            </span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Standalone History Modal ────────────────────────────────────────── */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            style={{
              background: "linear-gradient(160deg, #111827 0%, #0d1520 100%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                <h3 className="text-white font-bold text-xs sm:text-base">Riwayat Scan Sesi Ini</h3>
                <span className="text-[11px] sm:text-xs text-slate-400 font-mono">({history.length})</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 sm:p-4 space-y-2 flex-1">
              {history.length === 0 ? (
                <div className="text-center py-10 sm:py-12 text-slate-500 text-xs">
                  Belum ada aktivitas scan pada sesi ini.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${item.status === "valid"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : item.status === "already"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-red-500/20 text-red-400"
                          }`}
                      >
                        {item.status === "valid" ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : item.status === "already" ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-bold text-xs sm:text-sm truncate">
                          {item.holderName}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                          {item.barcodeString}
                        </p>
                        {item.eventTitle && (
                          <p className="text-[10px] text-slate-500 truncate">{item.eventTitle}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                        {item.time.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {item.isOfflineSync && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                            LOKAL
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider ${item.status === "valid"
                            ? "text-emerald-400"
                            : item.status === "already"
                              ? "text-amber-400"
                              : "text-red-400"
                            }`}
                        >
                          {item.status === "valid"
                            ? "CHECK-IN"
                            : item.status === "already"
                              ? "SUDAH"
                              : "INVALID"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
