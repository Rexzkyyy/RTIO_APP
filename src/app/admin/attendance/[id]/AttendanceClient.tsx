"use client";

import { useState, useMemo } from "react";
import { Search, Download, CheckCircle2, FileText, User, Filter, Crown, Sparkles, Ticket } from "lucide-react";

interface TicketData {
  id: string;
  barcodeString: string;
  holderName: string | null;
  holderPhone: string | null;
  holderGender: string | null;
  categoryName: string;
  checkedInAt: string | null;
  answers: { fieldName: string; value: string }[];
}

interface CategoryTotal {
  name: string;
  totalSold: number;
}

interface AttendanceClientProps {
  tickets: TicketData[];
  eventTitle: string;
  categoryTotals?: CategoryTotal[];
}

function getCategoryTheme(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("diamond")) {
    return {
      text: "text-purple-700",
      border: "border-purple-200",
      badge: "bg-purple-100 text-purple-800",
      activeBg: "bg-purple-600",
      activeBorder: "border-purple-600",
      ring: "ring-purple-400",
      hoverBg: "hover:bg-purple-50/50",
      icon: <Crown className="w-3.5 h-3.5 text-purple-600" />,
    };
  }
  if (lower.includes("gold")) {
    return {
      text: "text-amber-700",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-800",
      activeBg: "bg-amber-500",
      activeBorder: "border-amber-500",
      ring: "ring-amber-400",
      hoverBg: "hover:bg-amber-50/50",
      icon: <Sparkles className="w-3.5 h-3.5 text-amber-600" />,
    };
  }
  if (lower.includes("silver")) {
    return {
      text: "text-slate-700",
      border: "border-slate-300",
      badge: "bg-slate-200 text-slate-800",
      activeBg: "bg-slate-700",
      activeBorder: "border-slate-700",
      ring: "ring-slate-400",
      hoverBg: "hover:bg-slate-100",
      icon: <Ticket className="w-3.5 h-3.5 text-slate-600" />,
    };
  }
  if (lower.includes("reguler") || lower.includes("regular")) {
    return {
      text: "text-blue-700",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-800",
      activeBg: "bg-blue-600",
      activeBorder: "border-blue-600",
      ring: "ring-blue-400",
      hoverBg: "hover:bg-blue-50/50",
      icon: <Ticket className="w-3.5 h-3.5 text-blue-600" />,
    };
  }
  return {
    text: "text-emerald-700",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    activeBg: "bg-emerald-600",
    activeBorder: "border-emerald-600",
    ring: "ring-emerald-400",
    hoverBg: "hover:bg-emerald-50/50",
    icon: <Ticket className="w-3.5 h-3.5 text-emerald-600" />,
  };
}

export default function AttendanceClient({
  tickets,
  eventTitle,
  categoryTotals = [],
}: AttendanceClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Hitung jumlah yang sudah hadir per kategori
  const checkedStats = useMemo(() => {
    const stats: Record<string, number> = {};
    tickets.forEach((t) => {
      const cat = t.categoryName || "Lainnya";
      stats[cat] = (stats[cat] || 0) + 1;
    });
    return stats;
  }, [tickets]);

  // Gabungkan daftar kategori dari categoryTotals dan checkedStats
  const categoriesList = useMemo(() => {
    const map = new Map<string, { name: string; totalSold: number; checkedIn: number }>();

    // Masukkan dari categoryTotals terlebih dahulu
    categoryTotals.forEach((c) => {
      map.set(c.name, {
        name: c.name,
        totalSold: c.totalSold,
        checkedIn: checkedStats[c.name] || 0,
      });
    });

    // Masukkan jika ada kategori yang ada di tiket hadir tapi belum ada di categoryTotals
    Object.keys(checkedStats).forEach((catName) => {
      if (!map.has(catName)) {
        map.set(catName, {
          name: catName,
          totalSold: checkedStats[catName],
          checkedIn: checkedStats[catName],
        });
      }
    });

    // Urutkan Diamond -> Gold -> Silver -> Reguler
    const sortOrder = ["diamond", "gold", "silver", "reguler"];
    return Array.from(map.values()).sort((a, b) => {
      const idxA = sortOrder.findIndex((s) => a.name.toLowerCase().includes(s));
      const idxB = sortOrder.findIndex((s) => b.name.toLowerCase().includes(s));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [categoryTotals, checkedStats]);

  const grandTotalSold = useMemo(() => {
    if (categoryTotals.length > 0) {
      return categoryTotals.reduce((sum, c) => sum + c.totalSold, 0);
    }
    return tickets.length;
  }, [categoryTotals, tickets.length]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const search = searchTerm.toLowerCase();
      const nameMatch = (t.holderName || "").toLowerCase().includes(search);
      const barcodeMatch = t.barcodeString.toLowerCase().includes(search);
      const categoryMatch = t.categoryName.toLowerCase().includes(search);
      const phoneMatch = (t.holderPhone || "").toLowerCase().includes(search);
      const matchesSearch = nameMatch || barcodeMatch || categoryMatch || phoneMatch;

      const matchesCategory =
        selectedCategory === "ALL" ||
        t.categoryName.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [tickets, searchTerm, selectedCategory]);

  const exportToCSV = () => {
    if (filteredTickets.length === 0) return;

    // Kumpulkan semua custom fields unik dari hasil yang difilter
    const customFieldNames = new Set<string>();
    filteredTickets.forEach((t) => {
      t.answers.forEach((a) => customFieldNames.add(a.fieldName));
    });
    const customFieldsArray = Array.from(customFieldNames);

    const headers = [
      "Waktu Check-in",
      "Kode Tiket",
      "Kategori",
      "Nama Peserta",
      "No. HP",
      "Gender",
      ...customFieldsArray,
    ];

    const rows = filteredTickets.map((t) => {
      const dateStr = t.checkedInAt
        ? new Date(t.checkedInAt).toLocaleString("id-ID", { timeZone: "Asia/Makassar" })
        : "";
      const baseData = [
        `"${dateStr}"`,
        `"${t.barcodeString}"`,
        `"${t.categoryName}"`,
        `"${t.holderName || ""}"`,
        `"${t.holderPhone || ""}"`,
        `"${t.holderGender || ""}"`,
      ];

      const customData = customFieldsArray.map((field) => {
        const answer = t.answers.find((a) => a.fieldName === field);
        return `"${answer ? answer.value.replace(/"/g, '""') : ""}"`;
      });

      return [...baseData, ...customData].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    // Format nama file: Kehadiran - [Kategori] - [Nama Event] - [Tanggal].csv
    const dateStr = new Date().toISOString().split("T")[0];
    const safeEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, "_");
    const catSuffix = selectedCategory === "ALL" ? "Semua" : selectedCategory.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("download", `Kehadiran_${catSuffix}_${safeEventTitle}_${dateStr}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* ── Rekap Kehadiran Per Kategori Tiket ── */}
      <div className="p-4 sm:p-6 bg-slate-50/70 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Rekap Hadir Per Kategori Tiket
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Klik kategori di bawah untuk memfilter daftar peserta)
            </span>
          </div>
          {selectedCategory !== "ALL" && (
            <button
              onClick={() => setSelectedCategory("ALL")}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 w-fit"
            >
              <Filter className="w-3 h-3" />
              Reset Filter (Tampilkan Semua: {tickets.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card: Semua Kategori */}
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/50"
                : "bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  selectedCategory === "ALL" ? "text-emerald-100" : "text-slate-500"
                }`}
              >
                Semua Kategori
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  selectedCategory === "ALL"
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {grandTotalSold > 0
                  ? `${Math.round((tickets.length / grandTotalSold) * 100)}%`
                  : "100%"}
              </span>
            </div>
            <div className="mt-1.5 text-2xl font-black tracking-tight">
              {tickets.length}
              {grandTotalSold > 0 ? (
                <span
                  className={`text-xs font-medium ml-1.5 ${
                    selectedCategory === "ALL" ? "text-emerald-100" : "text-slate-400"
                  }`}
                >
                  / {grandTotalSold} Tiket
                </span>
              ) : (
                <span
                  className={`text-xs font-medium ml-1.5 ${
                    selectedCategory === "ALL" ? "text-emerald-100" : "text-slate-400"
                  }`}
                >
                  Hadir
                </span>
              )}
            </div>
          </button>

          {/* Card: Per Kategori Tiket */}
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory.toLowerCase() === cat.name.toLowerCase();
            const checkedCount = cat.checkedIn;
            const total = cat.totalSold || checkedCount;
            const pct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
            const theme = getCategoryTheme(cat.name);

            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? "ALL" : cat.name)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? `${theme.activeBg} text-white ${theme.activeBorder} shadow-md ring-2 ${theme.ring}`
                    : `bg-white text-slate-800 ${theme.border} ${theme.hoverBg}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider truncate mr-1 flex items-center gap-1 ${
                      isSelected ? "text-white/95" : theme.text
                    }`}
                  >
                    {!isSelected && theme.icon}
                    {cat.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                      isSelected ? "bg-white/20 text-white" : theme.badge
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="mt-1.5 text-2xl font-black tracking-tight">
                  {checkedCount}
                  {cat.totalSold > 0 ? (
                    <span
                      className={`text-xs font-medium ml-1.5 ${
                        isSelected ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      / {cat.totalSold} Tiket
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-medium ml-1.5 ${
                        isSelected ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      Hadir
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search Input & Export Action ── */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
            placeholder={
              selectedCategory === "ALL"
                ? "Cari nama, no. HP, kode tiket..."
                : `Cari di kategori ${selectedCategory}...`
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedCategory !== "ALL" && (
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Filter: <strong className="text-emerald-700">{selectedCategory}</strong> ({filteredTickets.length})
            </span>
          )}

          <button
            onClick={exportToCSV}
            disabled={filteredTickets.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV ({filteredTickets.length})</span>
          </button>
        </div>
      </div>

      {/* ── Table Peserta Hadir ── */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
              >
                Peserta
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
              >
                Kategori & Tiket
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
              >
                Waktu Check-in
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
              >
                Data Tambahan
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <User className="w-12 h-12 text-slate-200 mb-3" />
                    <p className="text-base font-medium text-slate-600">Tidak ada data ditemukan</p>
                    <p className="text-sm">
                      {selectedCategory !== "ALL"
                        ? `Belum ada peserta check-in untuk kategori ${selectedCategory}.`
                        : "Belum ada peserta yang check-in atau pencarian tidak cocok."}
                    </p>
                    {selectedCategory !== "ALL" && (
                      <button
                        onClick={() => setSelectedCategory("ALL")}
                        className="mt-3 text-xs font-bold text-emerald-600 hover:underline"
                      >
                        Tampilkan Semua Kategori
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg">
                        {ticket.holderName ? ticket.holderName.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-slate-900">
                          {ticket.holderName || "-"}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                          {ticket.holderPhone || "-"}
                          {ticket.holderGender && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              {ticket.holderGender === "L"
                                ? "Laki-laki"
                                : ticket.holderGender === "P"
                                ? "Perempuan"
                                : ticket.holderGender}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-800">{ticket.categoryName}</div>
                    <div className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                      {ticket.barcodeString}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        {ticket.checkedInAt ? (
                          <>
                            <div className="text-sm font-bold text-slate-700">
                              {new Date(ticket.checkedInAt).toLocaleTimeString("id-ID", {
                                timeZone: "Asia/Makassar",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(ticket.checkedInAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                timeZone: "Asia/Makassar",
                              })}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-slate-500">-</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-[200px]">
                    {ticket.answers.length > 0 ? (
                      <div className="space-y-1.5">
                        {ticket.answers.map((answer, idx) => (
                          <div key={idx} className="text-xs flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-slate-600">
                                {answer.fieldName}:{" "}
                              </span>
                              {answer.value.startsWith("http") ? (
                                <a
                                  href={answer.value}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:underline"
                                >
                                  Lihat File
                                </a>
                              ) : (
                                <span className="text-slate-800 whitespace-pre-wrap">
                                  {answer.value}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Tidak ada data tambahan
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
