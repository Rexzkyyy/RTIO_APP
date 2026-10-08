"use client";

import { useState } from "react";
import { Search, Download, CheckCircle2, FileText, User } from "lucide-react";

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

export default function AttendanceClient({ tickets, eventTitle }: { tickets: TicketData[], eventTitle: string }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTickets = tickets.filter(t => {
    const search = searchTerm.toLowerCase();
    const nameMatch = (t.holderName || "").toLowerCase().includes(search);
    const barcodeMatch = t.barcodeString.toLowerCase().includes(search);
    const categoryMatch = t.categoryName.toLowerCase().includes(search);
    return nameMatch || barcodeMatch || categoryMatch;
  });

  const exportToCSV = () => {
    if (filteredTickets.length === 0) return;

    // Kumpulkan semua custom fields unik dari hasil yang difilter
    const customFieldNames = new Set<string>();
    filteredTickets.forEach(t => {
      t.answers.forEach(a => customFieldNames.add(a.fieldName));
    });
    const customFieldsArray = Array.from(customFieldNames);

    const headers = [
      "Waktu Check-in",
      "Kode Tiket",
      "Kategori",
      "Nama Peserta",
      "No. HP",
      "Gender",
      ...customFieldsArray
    ];

    const rows = filteredTickets.map(t => {
      const dateStr = t.checkedInAt ? new Date(t.checkedInAt).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) : "";
      const baseData = [
        `"${dateStr}"`,
        `"${t.barcodeString}"`,
        `"${t.categoryName}"`,
        `"${t.holderName || ""}"`,
        `"${t.holderPhone || ""}"`,
        `"${t.holderGender || ""}"`
      ];

      const customData = customFieldsArray.map(field => {
        const answer = t.answers.find(a => a.fieldName === field);
        return `"${answer ? answer.value.replace(/"/g, '""') : ""}"`;
      });

      return [...baseData, ...customData].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // Format nama file: Kehadiran - [Nama Event] - [Tanggal].csv
    const dateStr = new Date().toISOString().split('T')[0];
    const safeEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute("download", `Kehadiran_${safeEventTitle}_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
            placeholder="Cari nama, kode tiket, atau kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          onClick={exportToCSV}
          disabled={filteredTickets.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Peserta
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Kategori & Tiket
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Waktu Check-in
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
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
                    <p className="text-sm">Belum ada peserta yang check-in atau pencarian tidak cocok.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-lg">
                        {ticket.holderName ? ticket.holderName.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-slate-900">{ticket.holderName || '-'}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                          {ticket.holderPhone || '-'}
                          {ticket.holderGender && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              {ticket.holderGender === 'L' ? 'Laki-laki' : ticket.holderGender === 'P' ? 'Perempuan' : ticket.holderGender}
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
                              {new Date(ticket.checkedInAt).toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs text-slate-500">
                              {new Date(ticket.checkedInAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' })}
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
                              <span className="font-semibold text-slate-600">{answer.fieldName}: </span>
                              {answer.value.startsWith('http') ? (
                                <a href={answer.value} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">Lihat File</a>
                              ) : (
                                <span className="text-slate-800 whitespace-pre-wrap">{answer.value}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Tidak ada data tambahan</span>
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
