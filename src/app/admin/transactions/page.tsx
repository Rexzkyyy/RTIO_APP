import prisma from "@/lib/prisma";
import { CheckCircle2, XCircle, Search, Clock, ExternalLink, Image as ImageIcon, ChevronLeft, ChevronRight, Filter, Calendar, MapPin, Receipt } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// Server action to approve or reject
async function updateTransactionStatus(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const status = formData.get("status") as "APPROVED" | "REJECTED";
  
  await prisma.transaction.update({
    where: { id },
    data: { status }
  });

  revalidatePath("/admin/transactions");
}

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TransactionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';
  const q = typeof params.q === 'string' ? params.q : '';
  const pageStr = typeof params.page === 'string' ? params.page : '1';
  const page = parseInt(pageStr, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  if (!eventId) {
    const whereEvent: any = {};
    if (q) {
      whereEvent.OR = [
        { title: { contains: q, mode: 'insensitive' as const } },
        { location: { contains: q, mode: 'insensitive' as const } },
      ];
    }
    
    const totalEvents = await prisma.event.count({ where: whereEvent });
    const totalPagesEvent = Math.ceil(totalEvents / limit);

    const events = await prisma.event.findMany({
      where: whereEvent,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pilih Event</h1>
            <p className="text-slate-500 mt-1">Silakan pilih event untuk mengelola dan memvalidasi transaksi pembayarannya.</p>
          </div>
          
          <form className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder="Cari event atau lokasi..." 
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input type="hidden" name="page" value="1" />
          </form>
        </div>
        
        {events.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
            Belum ada event terdaftar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => (
              <Link 
                key={ev.id} 
                href={`/admin/transactions?eventId=${ev.id}`}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{ev.title}</h3>
                  <div className="text-xs text-slate-400 font-mono mt-1 mb-4">ID: {ev.id.split('-')[0]}</div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-slate-600">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      {new Date(ev.eventDate).toLocaleDateString('id-ID')}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                      {ev.location}
                    </div>
                  </div>
                </div>
                
                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center">
                    <Receipt className="w-3.5 h-3.5 mr-1.5" />
                    {ev._count.transactions} Transaksi
                  </span>
                  
                  <div className="text-emerald-600 group-hover:translate-x-1 transition-transform">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination for Events */}
        {totalPagesEvent > 1 && (
          <div className="flex justify-center items-center gap-2 pt-4">
            {page > 1 ? (
              <Link href={`/admin/transactions?q=${encodeURIComponent(q)}&page=${page - 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
                <ChevronLeft className="w-5 h-5" />
              </Link>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
                <ChevronLeft className="w-5 h-5" />
              </div>
            )}
            
            <span className="text-sm font-medium text-slate-600 mx-2">
              Hal {page} dari {totalPagesEvent}
            </span>

            {page < totalPagesEvent ? (
              <Link href={`/admin/transactions?q=${encodeURIComponent(q)}&page=${page + 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
                <ChevronRight className="w-5 h-5" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fetch the selected event
  const selectedEvent = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true }
  });

  // Build where clause
  const where: any = { eventId };
  if (q) {
    where.OR = [
      { buyerName: { contains: q, mode: 'insensitive' as const } },
      { buyerEmail: { contains: q, mode: 'insensitive' as const } },
      { id: { contains: q, mode: 'insensitive' as const } }
    ];
  }

  const totalTransactions = await prisma.transaction.count({ where });
  const totalPages = Math.ceil(totalTransactions / limit);

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      event: true,
      tickets: {
        include: {
          ticketCategory: true,
          answers: {
            include: { field: true }
          }
        }
      }
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <Link href="/admin/events" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Kembali ke Event
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Validasi Transaksi</h1>
          <p className="text-slate-500 mt-1">Event: <span className="font-semibold text-emerald-700">{selectedEvent?.title}</span></p>
        </div>

        {/* Filter & Search Form */}
        <form className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder="Cari Nama/Email/ID..." 
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <input type="hidden" name="page" value="1" />
          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg text-sm hover:bg-emerald-700 transition-colors shadow-sm whitespace-nowrap">Terapkan</button>
        </form>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          Belum ada transaksi ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              {/* Card Header: Buyer Info */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{tx.buyerName}</h3>
                  <p className="text-sm text-slate-500 mt-1">{tx.buyerEmail}</p>
                  <p className="text-sm text-slate-500">{tx.buyerPhone}</p>
                </div>
                {/* Status Badge */}
                <div>
                  {tx.status === "PENDING" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3 mr-1" /> PENDING
                    </span>
                  )}
                  {tx.status === "APPROVED" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> LUNAS
                    </span>
                  )}
                  {tx.status === "REJECTED" && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                      <XCircle className="w-3 h-3 mr-1" /> DITOLAK
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body: Order Info */}
              <div className="p-5 flex-1 flex flex-col gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Pesanan</p>
                  <div className="flex justify-between items-end">
                    <div className="text-2xl font-black text-slate-800">Rp {tx.totalPrice.toLocaleString('id-ID')}</div>
                    <div className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                      {tx.totalTickets}x {tx.tickets[0]?.ticketCategory.name}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center justify-between">
                    <span>ID: {tx.id.split('-')[0]}</span>
                    <a href={`/public/${tx.id}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center">
                      Halaman Tiket <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>

                {/* Additional Info Toggle */}
                {tx.tickets[0]?.answers.length > 0 && (
                  <details className="text-xs group bg-slate-50 rounded-lg border border-slate-100">
                    <summary className="p-3 cursor-pointer text-slate-600 font-medium select-none group-open:border-b group-open:border-slate-100">
                      Lihat Informasi Tambahan Peserta
                    </summary>
                    <div className="p-3 space-y-2 bg-white">
                    {tx.tickets[0].answers.map((ans: any) => (
                      <div key={ans.id} className="flex flex-col gap-0.5">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{ans.field.name}</span>
                        {ans.field.type === 'FILE' ? (
                          <a href={ans.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">
                            <ExternalLink className="w-3 h-3 mr-1" /> Buka File Lampiran
                          </a>
                        ) : (
                          <span className="text-slate-700 font-medium break-words">{ans.value}</span>
                        )}
                      </div>
                    ))}
                    </div>
                  </details>
                )}
              </div>

              {/* Card Footer: Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                {/* Left side: Payment Proof */}
                <div>
                  {tx.paymentProofUrl ? (
                    <a 
                      href={tx.paymentProofUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs font-medium bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                      Bukti Bayar
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 italic px-2 py-1.5">Tanpa Bukti</span>
                  )}
                </div>

                {/* Right side: Actions */}
                <div className="flex gap-2">
                  {tx.status === "PENDING" && (
                    <>
                      <form action={updateTransactionStatus}>
                        <input type="hidden" name="id" value={tx.id} />
                        <input type="hidden" name="status" value="REJECTED" />
                        <button type="submit" className="p-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-lg transition-colors shadow-sm" title="Tolak">
                          <XCircle className="w-5 h-5" />
                        </button>
                      </form>
                      <form action={updateTransactionStatus}>
                        <input type="hidden" name="id" value={tx.id} />
                        <input type="hidden" name="status" value="APPROVED" />
                        <button type="submit" className="flex items-center p-1.5 px-3 bg-emerald-600 border border-transparent text-white hover:bg-emerald-700 rounded-lg transition-colors shadow-sm" title="Setujui & Lunas">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          <span className="text-xs font-semibold">Setujui</span>
                        </button>
                      </form>
                    </>
                  )}
                  {tx.status === "APPROVED" && (
                    <a
                      href={`https://wa.me/${tx.buyerPhone.replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${tx.buyerName},\n\nPembayaran Anda untuk event *${tx.event.title}* telah dikonfirmasi!\n\nBerikut adalah tiket Anda:\n${tx.tickets.map((t: any) => `- ${t.ticketCategory.name}: ${t.barcodeString}`).join('\n')}\n\nTerima kasih,\nPanitia Event`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-green-500 hover:bg-green-600 shadow-sm transition-colors"
                    >
                      Kirim Tiket WA
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          {page > 1 ? (
            <Link href={`/admin/transactions?eventId=${eventId}&q=${encodeURIComponent(q)}&page=${page - 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          ) : (
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
              <ChevronLeft className="w-5 h-5" />
            </div>
          )}
          
          <span className="text-sm font-medium text-slate-600 mx-2">
            Hal {page} dari {totalPages}
          </span>

          {page < totalPages ? (
            <Link href={`/admin/transactions?eventId=${eventId}&q=${encodeURIComponent(q)}&page=${page + 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
              <ChevronRight className="w-5 h-5" />
            </Link>
          ) : (
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-300 cursor-not-allowed">
              <ChevronRight className="w-5 h-5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
