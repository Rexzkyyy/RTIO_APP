import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ChevronLeft, CheckCircle2, XCircle, Search, ExternalLink, ImageIcon, Clock, ChevronRight, Receipt } from "lucide-react";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminTransactionsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const isValidator = session?.user?.adminRole === 'VALIDATOR';
  // @ts-ignore
  const adminId = session?.user?.adminId;

  const params = await searchParams;
  const eventId = typeof params.eventId === 'string' ? params.eventId : undefined;
  const q = typeof params.q === 'string' ? params.q : '';
  const statusParam = typeof params.status === 'string' ? params.status : 'PENDING';
  
  const pageStr = typeof params.page === 'string' ? params.page : '1';
  const page = parseInt(pageStr, 10) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Validator access check
  let allowedEventIds: string[] = [];
  if (isValidator && adminId) {
    const access = await prisma.adminEventAccess.findMany({
      where: { adminId },
      select: { eventId: true }
    });
    allowedEventIds = access.map(a => a.eventId);
  }

  async function updateTransactionStatus(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const status = formData.get("status") as "APPROVED" | "REJECTED";
    
    if (id && status) {
      await prisma.transaction.update({
        where: { id },
        data: { status }
      });
      revalidatePath("/admin/transactions");
    }
  }

  if (!eventId) {
    const eventsWhere = isValidator ? { id: { in: allowedEventIds } } : {};
    const events = await prisma.event.findMany({
      where: eventsWhere,
      select: { id: true, title: true, _count: { select: { transactions: { where: { status: 'PENDING' } } } } },
      orderBy: { createdAt: 'desc' }
    });

    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pilih Event</h1>
            <p className="text-slate-500 mt-1">Pilih event untuk memvalidasi transaksinya.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(event => (
            <Link prefetch={false} key={event.id} href={`/admin/transactions?eventId=${event.id}&status=PENDING`} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all group">
              <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{event.title}</h3>
              <div className="mt-4 flex items-center text-sm font-medium text-slate-500">
                <span className={`px-2 py-0.5 rounded-md mr-2 ${event._count.transactions > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                  {event._count.transactions} Pending
                </span>
                Cek Transaksi <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
          {events.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              Tidak ada event yang dapat diakses.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isValidator && eventId && !allowedEventIds.includes(eventId)) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 shadow-sm font-medium flex items-center">
          <XCircle className="w-6 h-6 mr-3 shrink-0" />
          Anda tidak memiliki akses ke event ini.
        </div>
        <Link prefetch={false} href="/admin/transactions" className="inline-flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium">
          <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
        </Link>
      </div>
    );
  }

  const selectedEvent = await prisma.event.findUnique({
    where: { id: eventId },
    select: { title: true }
  });

  const where: any = { eventId };
  if (statusParam !== 'ALL') {
    where.status = statusParam;
  }
  
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
          answers: { include: { field: true } }
        }
      }
    }
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <Link prefetch={false} href="/admin/events" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 mb-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Kembali ke Event
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Validasi Pembayaran</h1>
          <p className="text-slate-500 mt-1">Event: <span className="font-semibold text-emerald-700">{selectedEvent?.title}</span></p>
        </div>

        <form className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="status" value={statusParam} />
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
          <button type="submit" className="px-4 py-2 bg-slate-800 text-white font-medium rounded-lg text-sm hover:bg-slate-900 transition-colors whitespace-nowrap">Cari</button>
        </form>
      </div>

      {/* Tabs Filter */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl overflow-x-auto">
        {[
          { id: 'PENDING', label: 'Menunggu Validasi', icon: Clock },
          { id: 'APPROVED', label: 'Lunas', icon: CheckCircle2 },
          { id: 'REJECTED', label: 'Ditolak', icon: XCircle },
          { id: 'ALL', label: 'Semua', icon: Search }
        ].map(tab => (
          <Link 
            prefetch={false}
            key={tab.id}
            href={`/admin/transactions?eventId=${eventId}&q=${encodeURIComponent(q)}&status=${tab.id}`}
            className={`flex items-center px-4 py-2.5 text-sm font-bold rounded-lg whitespace-nowrap transition-colors flex-1 justify-center ${
              statusParam === tab.id 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.label}
          </Link>
        ))}
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
            <Search className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Tidak ada data</h3>
          <p className="text-slate-500">Belum ada transaksi dengan status {statusParam} untuk saat ini.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="min-w-full divide-y-2 divide-slate-300">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider w-16">No</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Pembeli</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Pesanan & Tagihan</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Bukti Bayar</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Aksi Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200">
                {transactions.map((tx, index) => (
                  <tr key={tx.id} className="hover:bg-bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 align-top text-sm font-bold text-slate-400">
                      {skip + index + 1}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-slate-900 text-base">{tx.buyerName}</div>
                      <div className="text-sm text-slate-500 mb-2">{tx.buyerEmail}</div>
                      
                      {/* Info Tambahan */}
                      <details className="mt-1 text-xs group">
                        <summary className="text-emerald-600 cursor-pointer hover:underline font-semibold list-none flex items-center select-none w-max">
                          Info Tambahan <ChevronRight className="w-3 h-3 ml-1 group-open:rotate-90 transition-transform" />
                        </summary>
                        <div className="mt-2 space-y-2 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                          {tx.tickets[0]?.answers?.map((ans: any) => (
                            <div key={ans.id} className="flex flex-col gap-0.5">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{ans.field.name}</span>
                              {ans.field.type === 'FILE' ? (
                                <a href={ans.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lihat Lampiran</a>
                              ) : (
                                <span className="font-medium text-slate-700">{ans.value}</span>
                              )}
                            </div>
                          ))}
                          <div className="pt-2 mt-2 border-t border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">WhatsApp</span>
                            <a href={`https://wa.me/${tx.buyerPhone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600 hover:underline">{tx.buyerPhone}</a>
                          </div>
                          <div className="pt-2">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Waktu Transaksi</span>
                            <span className="font-medium text-xs text-slate-600">
                              {new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          </div>
                        </div>
                      </details>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="text-lg font-black text-slate-800">Rp {tx.totalPrice.toLocaleString('id-ID')}</div>
                      <div className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md inline-block mt-1">
                        {tx.totalTickets}x {tx.tickets[0]?.ticketCategory?.name || 'Tiket'}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        {tx.paymentProofUrl ? (
                          <a 
                            href={tx.paymentProofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm font-bold bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 px-4 py-2 rounded-xl transition-all shadow-sm w-max"
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Cek Bukti
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block w-max">Belum ada</span>
                        )}
                        
                        
                        {tx.senderAccountName && (
                          <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 shadow-sm w-max min-w-[120px] flex items-start gap-2">
                            <Receipt className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider mb-0.5">Rekening Pengirim</span>
                              <span className="font-bold text-slate-700">{tx.senderAccountName}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <div className="flex flex-col gap-2 items-end">
                        {tx.status === "PENDING" && (
                          <div className="flex gap-2">
                            <form action={updateTransactionStatus}>
                              <input type="hidden" name="id" value={tx.id} />
                              <input type="hidden" name="status" value="REJECTED" />
                              <button type="submit" className="px-4 py-2 bg-white border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 hover:border-red-200 rounded-xl transition-all shadow-sm" title="Tolak">
                                Tolak
                              </button>
                            </form>
                            <form action={updateTransactionStatus}>
                              <input type="hidden" name="id" value={tx.id} />
                              <input type="hidden" name="status" value="APPROVED" />
                              <button type="submit" className="flex items-center px-5 py-2 bg-emerald-500 text-white font-bold hover:bg-emerald-600 rounded-xl transition-all shadow-sm">
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Setujui
                              </button>
                            </form>
                          </div>
                        )}
                        {tx.status === "APPROVED" && (
                          <div className="flex gap-2">
                            <a
                              href={`/public/${tx.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-emerald-700 bg-emerald-100 hover:bg-emerald-200 shadow-sm transition-colors"
                            >
                              Lihat Tiket
                            </a>
                            <a
                              href={`https://wa.me/${tx.buyerPhone.replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${tx.buyerName},\n\nPembayaran Anda untuk event *${tx.event.title}* telah dikonfirmasi!\n\nBerikut adalah tiket Anda:\n${tx.tickets.map((t: any) => `- ${t.ticketCategory.name}: ${t.barcodeString}`).join('\n')}\n\nTerima kasih,\nPanitia Event`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-green-500 hover:bg-green-600 shadow-sm transition-colors"
                            >
                              Kirim WA
                            </a>
                          </div>
                        )}
                        {tx.status === "REJECTED" && (
                          <span className="px-4 py-2 text-sm font-bold text-red-400">Ditolak</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {transactions.map((tx, index) => (
              <div key={tx.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-start gap-3">
                  <div className="flex gap-3">
                    <span className="text-slate-400 font-bold text-sm shrink-0">#{skip + index + 1}</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{tx.buyerName}</h3>
                      <p className="text-xs text-slate-500">{tx.buyerEmail}</p>
                      <div className="mt-2 text-lg font-black text-slate-800">Rp {tx.totalPrice.toLocaleString('id-ID')}</div>
                      <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded inline-block mt-1">
                        {tx.totalTickets}x {tx.tickets[0]?.ticketCategory?.name}
                      </div>
                    </div>
                  </div>
                  {tx.paymentProofUrl && (
                    <div className="flex flex-col items-end gap-2">
                      <a href={tx.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 shadow-sm border border-indigo-100">
                        <ImageIcon className="w-5 h-5" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50/50 flex flex-col gap-3">
                  {tx.senderAccountName && (
                    <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">Rekening Pengirim</span>
                        <span className="font-bold text-slate-800 text-sm">{tx.senderAccountName}</span>
                      </div>
                    </div>
                  )}
                  <details className="text-xs group">
                    <summary className="text-emerald-600 cursor-pointer hover:underline font-semibold list-none flex items-center select-none w-max">
                      Info Tambahan <ChevronRight className="w-3 h-3 ml-1 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="mt-2 space-y-2 p-3 bg-white rounded-xl border border-slate-200">
                      {tx.tickets[0]?.answers?.map((ans: any) => (
                        <div key={ans.id} className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">{ans.field.name}</span>
                          <span className="font-medium text-slate-700">{ans.value}</span>
                        </div>
                      ))}
                      <div className="pt-1 mt-1 border-t border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">WhatsApp</span>
                        <a href={`https://wa.me/${tx.buyerPhone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600">{tx.buyerPhone}</a>
                      </div>
                    </div>
                  </details>

                  {tx.status === "PENDING" && (
                    <div className="flex gap-2 w-full pt-2">
                      <form action={updateTransactionStatus} className="flex-1">
                        <input type="hidden" name="id" value={tx.id} />
                        <input type="hidden" name="status" value="REJECTED" />
                        <button type="submit" className="w-full py-2.5 bg-white border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all">Tolak</button>
                      </form>
                      <form action={updateTransactionStatus} className="flex-1">
                        <input type="hidden" name="id" value={tx.id} />
                        <input type="hidden" name="status" value="APPROVED" />
                        <button type="submit" className="w-full py-2.5 bg-emerald-500 text-white font-bold hover:bg-emerald-600 rounded-xl transition-all">Setujui</button>
                      </form>
                    </div>
                  )}
                  {tx.status === "APPROVED" && (
                    <a href={`https://wa.me/${tx.buyerPhone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="w-full text-center py-2.5 text-sm font-bold rounded-xl text-white bg-green-500">Kirim WA</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          {page > 1 ? (
            <Link prefetch={false} href={`/admin/transactions?eventId=${eventId}&q=${encodeURIComponent(q)}&status=${statusParam}&page=${page - 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
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
            <Link prefetch={false} href={`/admin/transactions?eventId=${eventId}&q=${encodeURIComponent(q)}&status=${statusParam}&page=${page + 1}`} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-sm">
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
