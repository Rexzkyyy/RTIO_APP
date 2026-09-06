"use client";

import { useState, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { ArrowLeft, Download, Users, CreditCard, Ticket, DollarSign, TrendingUp, Calendar } from "lucide-react";
import Link from "next/link";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

export default function AnalyticsDashboardClient({ event, analyticsData }: { event: any, analyticsData: any }) {
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const exportPDF = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);
    
    try {
      // Small delay to allow UI to update if needed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(dashboardRef.current, { quality: 1, backgroundColor: '#ffffff', pixelRatio: 2 });
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (dashboardRef.current.offsetHeight * pdfWidth) / dashboardRef.current.offsetWidth;
      
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Laporan-Penjualan-${event.slug}.pdf`);
    } catch (error) {
      console.error("Gagal export PDF:", error);
      alert("Terjadi kesalahan saat mengekspor ke PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/admin/analytics" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Daftar
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">{event.title}</h1>
          <p className="text-slate-500 text-sm flex items-center mt-1">
            <Calendar className="w-4 h-4 mr-1" /> {new Date(event.eventDate).toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={exportPDF} 
          disabled={isExporting}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm flex items-center hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isExporting ? "Mengekspor..." : "Export PDF"}
        </button>
      </div>

      {/* Printable Area */}
      <div ref={dashboardRef} className="space-y-6 bg-slate-50 p-2 sm:p-4 rounded-xl">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Total</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1 line-clamp-1">Total Pendapatan</p>
            <h3 className="text-sm sm:text-2xl font-black text-slate-800 truncate">Rp {analyticsData.totalRevenue.toLocaleString("id-ID")}</h3>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1 line-clamp-1">Tiket Terjual</p>
            <h3 className="text-lg sm:text-2xl font-black text-slate-800 truncate">{analyticsData.totalTicketsSold} <span className="text-[10px] sm:text-sm font-medium text-slate-400">tiket</span></h3>
            <div className="mt-2 text-xs font-medium text-slate-500 flex justify-between items-center bg-slate-50 p-2 rounded-lg">
              <span className="text-emerald-600"><span className="w-2 h-2 inline-block bg-emerald-500 rounded-full mr-1"></span>{analyticsData.totalPromo} Promo</span>
              <span className="text-blue-600"><span className="w-2 h-2 inline-block bg-blue-500 rounded-full mr-1"></span>{analyticsData.totalNormal} Normal</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1 line-clamp-1">Transaksi Sukses</p>
            <h3 className="text-lg sm:text-2xl font-black text-slate-800 truncate">{analyticsData.totalTransactions} <span className="text-[10px] sm:text-sm font-medium text-slate-400">pesanan</span></h3>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1 line-clamp-1">Tingkat Konversi</p>
            <h3 className="text-lg sm:text-2xl font-black text-slate-800 truncate">{analyticsData.conversionRate}%</h3>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart - Tickets Sold by Category */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Penjualan per Kategori</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.ticketsByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="terjualPromo" name="Terjual (Promo)" stackId="a" fill="#10b981" />
                  <Bar dataKey="terjualNormal" name="Terjual (Normal)" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="sisaPromo" name="Sisa Stok (Promo)" stackId="a" fill="#a7f3d0" />
                  <Bar dataKey="sisaNormal" name="Sisa Stok (Normal)" stackId="a" fill="#bfdbfe" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart - Status Transaksi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Status Transaksi</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.transactionStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analyticsData.transactionStatus.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart - Demografi Gender */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Demografi Pembeli</h3>
            <div className="h-72">
              {analyticsData.genderData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analyticsData.genderData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">Belum Ada Data Gender</p>
                  <p className="text-xs text-slate-400 text-center mt-1 px-4 leading-relaxed">Grafik akan otomatis muncul setelah ada pembeli yang menyelesaikan pesanan.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">5 Transaksi Terakhir (Lunas)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4">Pembeli</th>
                  <th className="px-6 py-4">Tiket</th>
                  <th className="px-6 py-4">Total Harga</th>
                  <th className="px-6 py-4">Waktu Lunas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analyticsData.recentTransactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{tx.buyerName}</div>
                      <div className="text-xs text-slate-500">{tx.buyerEmail}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{tx.totalTickets} tiket</td>
                    <td className="px-6 py-4 font-bold text-slate-800">Rp {tx.totalPrice.toLocaleString("id-ID")}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(tx.updatedAt).toLocaleDateString("id-ID", {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
                {analyticsData.recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      Belum ada transaksi lunas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
