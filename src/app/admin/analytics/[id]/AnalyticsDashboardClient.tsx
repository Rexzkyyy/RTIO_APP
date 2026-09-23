"use client";

import { useState, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, AreaChart, Area, LineChart, Line } from "recharts";
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

        {/* Row 1: Tren Penjualan Harian & Demografi Usia */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tren Penjualan Harian */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">1. Tren Pendapatan Harian</h3>
            <div className="h-72">
              {analyticsData.revenueOverTime && analyticsData.revenueOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.revenueOverTime} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth()+1}`; }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `Rp${(val / 1000000).toFixed(0)}M`} />
                    <Tooltip cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any, name: any) => { if (name === "revenue") return [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"]; return [value, "Tiket Terjual"]; }} labelFormatter={(label: any) => new Date(label).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} />
                    <Area type="monotone" dataKey="revenue" name="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <TrendingUp className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">Belum Ada Data Penjualan</p>
                </div>
              )}
            </div>
          </div>

          {/* Demografi Usia */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">2. Demografi Usia</h3>
            <div className="h-72">
              {analyticsData.ageData && analyticsData.ageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.ageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [value, "Jumlah Orang"]} />
                    <Bar dataKey="value" name="Jumlah" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                      {analyticsData.ageData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#94a3b8'][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">Belum Ada Data Usia</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Waktu (Jam) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Puncak Waktu Transaksi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">3. Puncak Waktu Transaksi</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.txByHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval={3} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [value, "Transaksi"]} />
                  <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Puncak Waktu Check-in */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">4. Puncak Waktu Check-in</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.checkinByHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} interval={3} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [value, "Orang Check-in"]} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Row 3: Kategori */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Penjualan per Kategori */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">5. Tiket Terjual per Kategori</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.ticketsByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="terjualPromo" name="Terjual (Promo)" stackId="a" fill="#10b981" />
                  <Bar dataKey="terjualNormal" name="Terjual (Normal)" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="sisaPromo" name="Sisa (Promo)" stackId="a" fill="#a7f3d0" />
                  <Bar dataKey="sisaNormal" name="Sisa (Normal)" stackId="a" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pendapatan per Kategori */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">6. Pendapatan per Kategori</h3>
            <div className="h-64">
              {analyticsData.revenueByCategory && analyticsData.revenueByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analyticsData.revenueByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" labelLine={false} label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                      {analyticsData.revenueByCategory.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [`Rp ${value.toLocaleString("id-ID")}`, "Pendapatan"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <DollarSign className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-500">Belum Ada Data Pendapatan</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 4: Grid of 4 Pie Charts (Status & Demografi) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Status Transaksi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 text-center">7. Status Transaksi</h3>
            <div className="flex-1 min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analyticsData.transactionStatus} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value">
                    {analyticsData.transactionStatus.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Check-in */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 text-center">8. Status Check-in</h3>
            <div className="flex-1 min-h-[180px]">
              {analyticsData.checkinData && analyticsData.checkinData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analyticsData.checkinData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value">
                      {analyticsData.checkinData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Belum ada data</div>
              )}
            </div>
          </div>

          {/* Proporsi Harga */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 text-center">9. Tipe Harga (Promo)</h3>
            <div className="flex-1 min-h-[180px]">
              {analyticsData.promoData && analyticsData.promoData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analyticsData.promoData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value">
                      {analyticsData.promoData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Belum ada data</div>
              )}
            </div>
          </div>

          {/* Demografi Gender */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 text-center">10. Demografi Gender</h3>
            <div className="flex-1 min-h-[180px]">
              {analyticsData.genderData && analyticsData.genderData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analyticsData.genderData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value">
                      {analyticsData.genderData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Belum ada data</div>
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
