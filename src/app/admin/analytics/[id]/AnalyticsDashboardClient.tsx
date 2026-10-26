"use client";

import React, { useState, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  ArrowLeft,
  Download,
  Users,
  CreditCard,
  Ticket,
  TrendingUp,
  Calendar,
  Store,
  Plus,
  CheckCircle,
  Clock,
  UserCheck,
  MapPin,
  Sparkles,
  BarChart3,
  Layers,
  Activity,
  Receipt,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

// ─── Interfaces & Types ───────────────────────────────────────────────────────
export interface EventData {
  id: string;
  title: string;
  slug: string;
  bannerUrl?: string | null;
  location?: string;
  eventDate: string;
}

export interface CategoryItem {
  name: string;
  terjual: number;
  terjualPromo: number;
  terjualNormal: number;
  sisaPromo: number;
  sisaNormal: number;
  revenue: number;
}

export interface RevenueByCategoryItem {
  name: string;
  value: number;
}

export interface TransactionStatusItem {
  name: string;
  value: number;
  color: string;
}

export interface RecentTransactionItem {
  id: string;
  buyerName: string;
  buyerEmail: string;
  totalTickets: number;
  totalPrice: number;
  createdAt: string;
}

export interface RevenueOverTimeItem {
  date: string;
  revenue: number;
  tickets: number;
}

export interface HourlyItem {
  hour: string;
  total: number;
}

export interface SimpleChartItem {
  name: string;
  value: number;
  color?: string;
  revenue?: number;
}

export interface OfflinePjItem {
  pjName: string;
  tickets: number;
  revenue: number;
}

export interface OfflineCategoryItem {
  name: string;
  tickets: number;
  revenue: number;
}

export interface RecentOfflineTicketItem {
  id: string;
  ticketNumber: string;
  buyerName: string;
  buyerPhone?: string;
  categoryName: string;
  price: number;
  pjName: string;
  isValidated: boolean;
  createdAt: string;
}

export interface OfflineData {
  offlineRevenue: number;
  offlineTicketsSold: number;
  offlineTransactionsCount: number;
  onlineRevenue: number;
  onlineTicketsSold: number;
  onlineTransactionsCount: number;
  offlineByPj: OfflinePjItem[];
  offlineByCategory: OfflineCategoryItem[];
  recentOfflineTickets: RecentOfflineTicketItem[];
}

export interface AnalyticsData {
  totalRevenue: number;
  totalTicketsSold: number;
  totalCapacity?: number;
  totalCheckedIn?: number;
  totalTransactions: number;
  conversionRate: number;
  transactionStatus: TransactionStatusItem[];
  ticketsByCategory: CategoryItem[];
  revenueByCategory: RevenueByCategoryItem[];
  recentTransactions: RecentTransactionItem[];
  totalPromo: number;
  totalNormal: number;
  promoData: SimpleChartItem[];
  revenueOverTime: RevenueOverTimeItem[];
  txByHour: HourlyItem[];
  checkinByHour: HourlyItem[];
  checkinData: SimpleChartItem[];
  ageData: SimpleChartItem[];
  genderData: SimpleChartItem[];
  channelData: SimpleChartItem[];
  offlineData: OfflineData;
}

interface AnalyticsDashboardClientProps {
  event: EventData;
  analyticsData: AnalyticsData;
}

type TabType = "overview" | "tickets" | "audience" | "offline" | "all";

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const formatRupiah = (val: number): string =>
  `Rp ${Math.round(val).toLocaleString("id-ID")}`;

export const formatRupiahCompact = (val: number): string => {
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`;
  if (val >= 1_000_000) {
    const formatted = (val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1);
    return `Rp ${formatted}jt`;
  }
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}rb`;
  return `Rp ${val.toLocaleString("id-ID")}`;
};

export default function AnalyticsDashboardClient({
  event,
  analyticsData,
}: AnalyticsDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [trendMetric, setTrendMetric] = useState<"revenue" | "tickets">("revenue");
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Export PDF with element-aware block pagination (No cut cards or charts)
  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    const previousTab = activeTab;
    setActiveTab("all");

    try {
      // Delay agar React me-render semua 4 tab & Recharts SVG stabil
      await new Promise((resolve) => setTimeout(resolve, 800));

      const cardElements = dashboardRef.current.querySelectorAll<HTMLElement>(".pdf-card");
      if (!cardElements || cardElements.length === 0) {
        alert("Tidak ada bagian dashboard yang ditemukan untuk diekspor.");
        return;
      }

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 10;
      const marginTop = 12;
      const marginBottom = 15;
      const contentWidth = pageWidth - marginX * 2; // 190mm
      const maxY = pageHeight - marginBottom; // 282mm

      let currentY = marginTop;
      let isFirstPage = true;

      for (let i = 0; i < cardElements.length; i++) {
        const el = cardElements[i];

        // Tentukan background agar elemen dark (seperti official header) tidak tertimpa putih
        const isDark = el.classList.contains("bg-slate-900");
        const dataUrl = await toPng(el, {
          quality: 0.98,
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          pixelRatio: 2,
        });

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => reject(e);
          img.src = dataUrl;
        });

        // Hitung tinggi proporsional card dalam satuan mm di atas lembar A4
        const cardHeightMm = (img.height * contentWidth) / img.width;

        // Cek jika card ini melebihi sisa tinggi halaman, pindah ke halaman baru
        if (!isFirstPage && currentY + cardHeightMm > maxY) {
          pdf.addPage("a4", "p");
          currentY = marginTop;
        }

        pdf.addImage(dataUrl, "PNG", marginX, currentY, contentWidth, cardHeightMm, undefined, "FAST");
        currentY += cardHeightMm + 4; // Berikan jeda 4mm antar blok card
        isFirstPage = false;
      }

      // Berikan penomoran halaman dan footer resmi di seluruh halaman PDF
      const totalPages = pdf.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p);
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.text(
          `Halaman ${p} dari ${totalPages}  •  RTIO TIX Sales Analytics  •  ${event.title}`,
          pageWidth / 2,
          291,
          { align: "center" }
        );
      }

      pdf.save(`Laporan-Analisis-Lengkap-${event.slug || "event"}.pdf`);
    } catch (error: unknown) {
      console.error("Gagal export PDF:", error);
      alert("Terjadi kesalahan saat mengekspor ke PDF.");
    } finally {
      setActiveTab(previousTab);
      setIsExporting(false);
    }
  };

  // Cetak / Simpan PDF langsung via mesin browser (Vektor SVG & Teks Murni)
  const handleNativePrint = () => {
    const previousTab = activeTab;
    setActiveTab("all");
    setTimeout(() => {
      window.print();
      setActiveTab(previousTab);
    }, 600);
  };


  // Calculations for KPI insights
  const avgOrderValue =
    analyticsData.totalTransactions > 0
      ? Math.round(analyticsData.totalRevenue / analyticsData.totalTransactions)
      : 0;

  const totalCapacity = analyticsData.totalCapacity || 0;
  const soldPercent =
    totalCapacity > 0
      ? Math.min(100, Math.round((analyticsData.totalTicketsSold / totalCapacity) * 100))
      : null;

  const totalCheckedIn = analyticsData.totalCheckedIn || 0;
  const attendancePercent =
    analyticsData.totalTicketsSold > 0
      ? Math.min(100, Math.round((totalCheckedIn / analyticsData.totalTicketsSold) * 100))
      : 0;

  const onlineRevenue = analyticsData.offlineData?.onlineRevenue || 0;
  const offlineRevenue = analyticsData.offlineData?.offlineRevenue || 0;
  const onlineRevPercent =
    analyticsData.totalRevenue > 0
      ? Math.round((onlineRevenue / analyticsData.totalRevenue) * 100)
      : 0;
  const offlineRevPercent =
    analyticsData.totalRevenue > 0
      ? 100 - onlineRevPercent
      : 0;

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "overview", label: "Ringkasan Eksekutif", icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: "tickets",
      label: "Kategori & Kuota",
      icon: <Layers className="w-4 h-4" />,
      badge: `${analyticsData.ticketsByCategory.length}`,
    },
    { id: "audience", label: "Waktu & Demografi", icon: <Activity className="w-4 h-4" /> },
    {
      id: "offline",
      label: "Audit Kasir Loket",
      icon: <Store className="w-4 h-4" />,
      badge:
        analyticsData.offlineData?.offlineTicketsSold > 0
          ? `${analyticsData.offlineData.offlineTicketsSold} Tiket`
          : undefined,
    },
    { id: "all", label: "Semua Tab (Lengkap)", icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Event Header Banner ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 text-white shadow-xl print:hidden no-print">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none translate-y-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Link
              href="/admin/analytics"
              className="inline-flex items-center text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors group mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" />
              Kembali ke Daftar Event
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {event.title}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3 h-3" /> Live Analytics
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                {new Date(event.eventDate).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
            <button
              onClick={exportPDF}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all active:scale-95 shadow-md disabled:opacity-50"
              title="Download langsung file PDF yang rapi tanpa potongan gambar"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-slate-900" />
              )}
              {isExporting ? "Menyiapkan PDF..." : "Download PDF"}
            </button>
            <button
              onClick={handleNativePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md border border-slate-700"
              title="Buka dialog cetak browser (Simpan sebagai PDF Vektor tajam)"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              Cetak / Simpan PDF (Vektor)
            </button>
            <Link
              href={`/admin/offline-tickets?eventId=${event.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all active:scale-95 shadow-md shadow-emerald-950/30"
            >
              <Store className="w-4 h-4" />
              Buka Loket Offline
            </Link>
          </div>
        </div>
      </div>

      {/* ── Segmented Navigation Tabs ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar print:hidden no-print">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Dashboard Printable Capture Container ──────────────────────────── */}
      <div ref={dashboardRef} className="space-y-6">
        {/* ── Official PDF Header (Muncul saat Export atau di tab Semua) ─────── */}
        {(isExporting || activeTab === "all") && (
          <div className="pdf-card bg-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 font-mono">
                  LAPORAN LENGKAP SEMUA BAGIAN
                </span>
                <span className="text-xs text-slate-400 font-mono">RTIO TIX ANALYTICS</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">{event.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-medium pt-1">
                <span>
                  📅 {new Date(event.eventDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
                {event.location && <span>📍 {event.location}</span>}
              </div>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800 shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Waktu Ekspor Laporan</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}, {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        )}

        {/* ── KPI HIGHLIGHT CARDS (Always visible) ─────────────────────────── */}
        <div className="pdf-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Pendapatan */}
          <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Pendapatan
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              {formatRupiah(analyticsData.totalRevenue)}
            </h3>

            {/* Online vs Offline Distribution Bar */}
            <div className="mt-3.5 space-y-1.5">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${onlineRevPercent}%` }}
                  title={`Online: ${onlineRevPercent}%`}
                />
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${offlineRevPercent}%` }}
                  title={`Offline: ${offlineRevPercent}%`}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-semibold">
                <span className="text-blue-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Web: {formatRupiahCompact(onlineRevenue)}
                </span>
                <span className="text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Loket: {formatRupiahCompact(offlineRevenue)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Tiket Terjual */}
          <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tiket Terjual
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsData.totalTicketsSold}
              </h3>
              {totalCapacity > 0 && (
                <span className="text-xs font-medium text-slate-400">
                  / {totalCapacity} kuota ({soldPercent}%)
                </span>
              )}
            </div>

            <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-slate-600">
                <span className="text-blue-600 font-bold">
                  {analyticsData.offlineData?.onlineTicketsSold || 0}
                </span>{" "}
                Online
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">
                <span className="text-emerald-600 font-bold">
                  {analyticsData.offlineData?.offlineTicketsSold || 0}
                </span>{" "}
                Loket
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-purple-600 font-bold">
                {analyticsData.totalPromo} Promo
              </span>
            </div>
          </div>

          {/* Card 3: Transaksi Sukses & AOV */}
          <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Transaksi Lunas
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsData.totalTransactions}
              </h3>
              <span className="text-xs font-medium text-slate-400">pesanan</span>
            </div>

            <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Rata-rata Order (AOV):</span>
              <span className="font-bold text-slate-800">{formatRupiah(avgOrderValue)}</span>
            </div>
          </div>

          {/* Card 4: Tingkat Kehadiran & Konversi */}
          <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Kehadiran & Check-in
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {attendancePercent}%
              </h3>
              <span className="text-xs font-medium text-slate-400">
                ({totalCheckedIn} / {analyticsData.totalTicketsSold} hadir)
              </span>
            </div>

            <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Konversi Pesanan:</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                {analyticsData.conversionRate}% Sukses
              </span>
            </div>
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW (Ringkasan Eksekutif) ────────────────────────── */}
        {(activeTab === "overview" || activeTab === "all") && (
          <div className="space-y-6">
            {/* Tren Penjualan Harian */}
            <div className="pdf-card bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              {activeTab === "all" && (
                <div className="pb-3 mb-5 border-b-2 border-slate-900 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" /> Bagian 1: Ringkasan Eksekutif & Tren Penjualan
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-400">BAGIAN 1 / 4</span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    Tren Penjualan Harian
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Grafik akumulasi penjualan harian hingga saat ini.
                  </p>
                </div>

                {/* Metric Selector Toggle */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold self-start sm:self-auto">
                  <button
                    onClick={() => setTrendMetric("revenue")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      trendMetric === "revenue"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Nominal (Rp)
                  </button>
                  <button
                    onClick={() => setTrendMetric("tickets")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      trendMetric === "tickets"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Jumlah Tiket
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                {analyticsData.revenueOverTime && analyticsData.revenueOverTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analyticsData.revenueOverTime}
                      margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(val: string) => {
                          const d = new Date(val);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        tickFormatter={(val: number) =>
                          trendMetric === "revenue" ? formatRupiahCompact(val) : `${val}`
                        }
                      />
                      <Tooltip
                        cursor={{ stroke: "#10b981", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                        contentStyle={{
                          borderRadius: "14px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          padding: "10px 14px",
                        }}
                        formatter={(value: unknown) => {
                          const num = typeof value === "number" ? value : 0;
                          return trendMetric === "revenue"
                            ? [formatRupiah(num), "Pendapatan"]
                            : [`${num} tiket`, "Tiket Terjual"];
                        }}
                        labelFormatter={(label: unknown) =>
                          new Date(String(label)).toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey={trendMetric === "revenue" ? "revenue" : "tickets"}
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorTrend)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <TrendingUp className="w-10 h-10 mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">
                      Belum Ada Data Penjualan
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Split Row: Channel Penjualan & 5 Transaksi Terakhir */}
            <div className="pdf-card grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Channel Penjualan (Donut Chart) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Store className="w-4 h-4 text-blue-600" />
                    Channel Penjualan
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Perbandingan volume tiket Online vs Loket Fisik.
                  </p>
                </div>

                <div className="h-56 relative flex items-center justify-center">
                  {analyticsData.channelData && analyticsData.channelData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.channelData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {analyticsData.channelData.map((entry, index) => (
                            <Cell key={`channel-cell-${index}`} fill={entry.color || "#3b82f6"} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(val: unknown, name: unknown) => [
                            `${val} Tiket`,
                            String(name),
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-400">Belum ada data channel</div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                    <span className="text-[10px] uppercase font-bold text-blue-600 block mb-0.5">
                      Online Web
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {analyticsData.offlineData?.onlineTicketsSold || 0} Tiket
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">
                      Loket Kasir
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {analyticsData.offlineData?.offlineTicketsSold || 0} Tiket
                    </span>
                  </div>
                </div>
              </div>

              {/* 5 Transaksi Terakhir */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      5 Transaksi Terakhir (Lunas)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pesanan paling mutakhir yang telah dikonfirmasi.
                    </p>
                  </div>
                  <Link
                    href={`/admin/transactions?eventId=${event.id}`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Semua Transaksi →
                  </Link>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 text-slate-500 font-bold border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3">Pembeli</th>
                        <th className="px-5 py-3 text-center">Jumlah</th>
                        <th className="px-5 py-3 text-right">Total Bayar</th>
                        <th className="px-5 py-3 text-right">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analyticsData.recentTransactions &&
                      analyticsData.recentTransactions.length > 0 ? (
                        analyticsData.recentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3.5">
                              <p className="font-bold text-slate-900">{tx.buyerName}</p>
                              <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {tx.buyerEmail}
                              </p>
                            </td>
                            <td className="px-5 py-3.5 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                {tx.totalTickets} tiket
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right font-black text-slate-900 text-sm">
                              {formatRupiah(tx.totalPrice)}
                            </td>
                            <td className="px-5 py-3.5 text-right text-slate-400 text-[11px]">
                              {new Date(tx.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">
                            Belum ada transaksi lunas tercatat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: TICKETS & CATEGORIES (Kategori & Kuota) ─────────────────── */}
        {(activeTab === "tickets" || activeTab === "all") && (
          <div className="space-y-6">
            <div className="pdf-card space-y-4">
              {activeTab === "all" && (
                <div className="pt-2 pb-1 border-b-2 border-slate-900 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" /> Bagian 2: Analisis Kategori & Kuota Tiket
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-400">BAGIAN 2 / 4</span>
                </div>
              )}
              {/* Category Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analyticsData.ticketsByCategory.map((cat, idx) => {
                  const totalCatQuota = (cat.terjual || 0) + (cat.sisaNormal || 0) + (cat.sisaPromo || 0);
                  const catPercent =
                    totalCatQuota > 0
                      ? Math.min(100, Math.round(((cat.terjual || 0) / totalCatQuota) * 100))
                      : 0;

                  const isNearFull = catPercent >= 80 && catPercent < 100;
                  const isFull = catPercent >= 100;

                  return (
                    <div
                      key={idx}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-xs">
                              #{idx + 1}
                            </span>
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-sm line-clamp-1">
                                {cat.name}
                              </h4>
                              <span className="text-[11px] font-semibold text-emerald-600">
                                Revenue: {formatRupiah(cat.revenue || 0)}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isFull
                                ? "bg-red-100 text-red-700"
                                : isNearFull
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {isFull ? "Habis" : `${catPercent}% Terjual`}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4 space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-700">
                              {cat.terjual} terjual
                            </span>
                            <span className="text-slate-400">
                              Sisa: {cat.sisaNormal + cat.sisaPromo}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isFull
                                  ? "bg-red-500"
                                  : isNearFull
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${catPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Promo: {cat.terjualPromo || 0}</span>
                        <span>•</span>
                        <span>Normal: {cat.terjualNormal || 0}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-800">
                          Total {totalCatQuota} Kuota
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visual Breakdown Charts (Pendapatan per Kategori & Komposisi Promo) */}
            <div className="pdf-card grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pendapatan per Kategori */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Pendapatan per Kategori
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Distribusi omset uang dari masing-masing tipe tiket.
                </p>

                <div className="h-64">
                  {analyticsData.revenueByCategory && analyticsData.revenueByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.revenueByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {analyticsData.revenueByCategory.map((_, index) => (
                            <Cell
                              key={`rev-cat-${index}`}
                              fill={["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"][index % 5]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: unknown) => [
                            formatRupiah(typeof value === "number" ? value : 0),
                            "Pendapatan",
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      Belum ada data pendapatan per kategori.
                    </div>
                  )}
                </div>
              </div>

              {/* Tipe Promo vs Normal */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  Komposisi Promo vs Harga Normal
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Perbandingan tiket yang terbeli dengan harga diskon vs harga penuh.
                </p>

                <div className="h-64">
                  {analyticsData.promoData && analyticsData.promoData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.promoData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {analyticsData.promoData.map((entry, index) => (
                            <Cell
                              key={`promo-cell-${index}`}
                              fill={entry.color || (index === 0 ? "#10b981" : "#3b82f6")}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(val: unknown, name: unknown) => [
                            `${val} Tiket`,
                            String(name),
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      Belum ada data tiket promo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: AUDIENCE & TIMING (Waktu & Demografi) ──────────────────── */}
        {(activeTab === "audience" || activeTab === "all") && (
          <div className="space-y-6">
            <div className="pdf-card space-y-4">
              {activeTab === "all" && (
                <div className="pt-2 pb-1 border-b-2 border-slate-900 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" /> Bagian 3: Waktu Transaksi & Demografi Peserta
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-400">BAGIAN 3 / 4</span>
                </div>
              )}
              {/* Waktu: Transaksi per Jam & Check-in per Jam */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Puncak Jam Transaksi */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Puncak Jam Transaksi (24 Jam)
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">
                    Waktu tersibuk ketika pembeli melakukan pemesanan tiket.
                  </p>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.txByHour}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="hour"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          interval={3}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: "#f8fafc" }}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: unknown) => [`${value} Transaksi`, "Pesanan"]}
                        />
                        <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Puncak Jam Check-in */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                    Puncak Waktu Check-in Gerbang
                  </h3>
                  <p className="text-xs text-slate-500 mb-6">
                    Pola kedatangan peserta saat melakukan pemindaian tiket di gate.
                  </p>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.checkinByHour}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="hour"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "#64748b" }}
                          interval={3}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={{ fill: "#f8fafc" }}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: unknown) => [`${value} Orang`, "Check-in"]}
                        />
                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Demografi: Usia & Gender */}
            <div className="pdf-card grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Demografi Usia */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Demografi Rentang Usia Peserta
                </h3>
                <p className="text-xs text-slate-500 mb-6">
                  Distribusi umur penonton yang mendaftar.
                </p>

                <div className="h-64">
                  {analyticsData.ageData && analyticsData.ageData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analyticsData.ageData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          allowDecimals={false}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          width={100}
                        />
                        <Tooltip
                          cursor={{ fill: "#f8fafc" }}
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(value: unknown) => [`${value} Orang`, "Jumlah"]}
                        />
                        <Bar dataKey="value" name="Jumlah" radius={[0, 6, 6, 0]}>
                          {analyticsData.ageData.map((_, index) => (
                            <Cell
                              key={`age-cell-${index}`}
                              fill={["#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9", "#94a3b8"][index % 5]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <Users className="w-8 h-8 mb-2 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">
                        Belum Ada Data Usia Terinput
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Demografi Gender */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Demografi Gender
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Komposisi Laki-laki vs Perempuan.
                  </p>
                </div>

                <div className="h-56 relative flex items-center justify-center">
                  {analyticsData.genderData && analyticsData.genderData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.genderData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {analyticsData.genderData.map((entry, index) => (
                            <Cell
                              key={`gender-cell-${index}`}
                              fill={entry.color || (index === 0 ? "#3b82f6" : "#ec4899")}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          }}
                          formatter={(val: unknown, name: unknown) => [
                            `${val} Orang`,
                            String(name),
                          ]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-400">Belum ada data gender</div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-600 font-semibold px-2">
                  <span>Checked-in: {totalCheckedIn}</span>
                  <span>Belum: {Math.max(0, analyticsData.totalTicketsSold - totalCheckedIn)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: OFFLINE TICKET AUDIT (Audit Loket Kasir) ───────────────── */}
        {(activeTab === "offline" || activeTab === "all") && (
          <div className="space-y-6">
            {/* Card 1: Bagian 4 Header + 4 Quick Stat Cards */}
            <div className="pdf-card space-y-4">
              {activeTab === "all" && (
                <div className="pt-2 pb-1 border-b-2 border-slate-900 flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-600" /> Bagian 4: Audit Kasir & Penjualan Loket (Offline)
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-400">BAGIAN 4 / 4</span>
                </div>
              )}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Banner */}
            <div className="p-6 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      Audit Kas & Loket Fisik (OTS)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Direct Cash Audit
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rekonsiliasi setoran kas kasir/panitia, tiket bebas kuota, dan audit fisik uang tunai.
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/offline-tickets?eventId=${event.id}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all self-start sm:self-auto shrink-0"
              >
                <Plus className="w-4 h-4" />
                Entri Tiket Offline
              </Link>
            </div>

            {/* 4 Quick Stat Cards */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-medium text-slate-400 block mb-1">
                  Tiket Offline Terbit
                </span>
                <h4 className="text-2xl font-black text-slate-900">
                  {analyticsData.offlineData?.offlineTicketsSold || 0}
                  <span className="text-xs font-semibold text-slate-400 ml-1">tiket</span>
                </h4>
                <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                  Bebas kuota online
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-medium text-slate-400 block mb-1">
                  Total Uang Tunai Terkumpul
                </span>
                <h4 className="text-2xl font-black text-emerald-600">
                  {formatRupiah(analyticsData.offlineData?.offlineRevenue || 0)}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Fisik kas kasir</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-medium text-slate-400 block mb-1">
                  Kasir / PJ Bertugas
                </span>
                <h4 className="text-2xl font-black text-slate-900">
                  {(analyticsData.offlineData?.offlineByPj || []).length}
                  <span className="text-xs font-semibold text-slate-400 ml-1">personil</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Penerima setoran</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-medium text-slate-400 block mb-1">
                  Rata-rata Harga Tiket
                </span>
                <h4 className="text-2xl font-black text-slate-900">
                  {formatRupiah(
                    analyticsData.offlineData?.offlineTicketsSold > 0
                      ? Math.round(
                          analyticsData.offlineData.offlineRevenue /
                            analyticsData.offlineData.offlineTicketsSold
                        )
                      : 0
                  )}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Termasuk custom price</p>
              </div>
            </div>
          </div>
        </div>

            {/* Offline Content */}
            {!analyticsData.offlineData?.offlineTicketsSold ||
            analyticsData.offlineData.offlineTicketsSold === 0 ? (
              <div className="pdf-card bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Store className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  Belum Ada Penjualan Tiket Offline
                </h4>
                <p className="text-xs text-slate-500 max-w-md mb-5">
                  Semua penjualan tiket offline (OTS/Borongan) akan langsung tercatat dan dapat
                  diaudit setoran kasnya di panel ini secara real-time.
                </p>
                <Link
                  href={`/admin/offline-tickets?eventId=${event.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" /> Terbitkan Tiket Offline Pertama
                </Link>
              </div>
            ) : (
              <>
                {/* Dual Audit Tables: Rekap Kas per PJ & Kategori */}
                <div className="pdf-card grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Table 1: Rekap Setoran per Kasir / PJ */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-emerald-600" />
                        Rekap Setoran Kas per PJ / Kasir
                      </h4>
                      <span className="text-[11px] font-bold text-slate-500">
                        {(analyticsData.offlineData?.offlineByPj || []).length} PJ terdata
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Kasir / PJ</th>
                            <th className="px-4 py-2.5 text-center">Tiket</th>
                            <th className="px-4 py-2.5 text-right">Wajib Setor Kas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(analyticsData.offlineData?.offlineByPj || []).map((pj, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">
                                    {idx + 1}
                                  </span>
                                  {pj.pjName}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-700">
                                  {pj.tickets}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-emerald-600 text-sm">
                                {formatRupiah(pj.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Table 2: Rincian Tiket Offline per Kategori */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-blue-600" />
                        Rincian Kategori Tiket Offline
                      </h4>
                      <span className="text-[11px] font-bold text-slate-500">
                        {(analyticsData.offlineData?.offlineByCategory || []).length} Kategori
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Kategori</th>
                            <th className="px-4 py-2.5 text-center">Tiket Terbit</th>
                            <th className="px-4 py-2.5 text-right">Total Kas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(analyticsData.offlineData?.offlineByCategory || []).map((cat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-900">{cat.name}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                  {cat.tickets}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                                {formatRupiah(cat.revenue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Table 3: 5 Tiket Offline Terakhir Diterbitkan */}
                <div className="pdf-card bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-500" />
                      5 Tiket Offline Terakhir Diterbitkan
                    </h4>
                    <Link
                      href={`/admin/offline-tickets?eventId=${event.id}`}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold"
                    >
                      Buka Menu Loket →
                    </Link>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100 font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">No. Tiket / Barcode</th>
                          <th className="px-4 py-2.5">Nama Peserta</th>
                          <th className="px-4 py-2.5">Kategori</th>
                          <th className="px-4 py-2.5 text-right">Nominal Bayar</th>
                          <th className="px-4 py-2.5">Kasir / PJ</th>
                          <th className="px-4 py-2.5 text-center">Status Masuk</th>
                          <th className="px-4 py-2.5 text-right">Waktu Terbit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(analyticsData.offlineData?.recentOfflineTickets || []).map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                              {t.ticketNumber}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{t.buyerName}</p>
                              <p className="text-[11px] text-slate-400">{t.buyerPhone || "-"}</p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {t.categoryName}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-slate-900 text-sm">
                              {formatRupiah(t.price)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                {t.pjName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {t.isValidated ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle className="w-3 h-3" /> Check-in
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                  Belum
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-400 text-[11px]">
                              {new Date(t.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
    </div>
  </div>
  );
}
