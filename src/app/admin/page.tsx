import { Calendar, Users, QrCode, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  
  // @ts-ignore
  const isValidator = session?.user?.adminRole === "VALIDATOR";
  // @ts-ignore
  const adminId = session?.user?.adminId;

  let eventWhere: any = {};
  let transactionWhere: any = { status: "APPROVED" };
  let pendingWhere: any = { status: "PENDING" };

  if (isValidator && adminId) {
    const assignedEvents = await prisma.adminEventAccess.findMany({
      where: { adminId },
      select: { eventId: true }
    });
    const eventIds = assignedEvents.map(a => a.eventId);
    eventWhere = { id: { in: eventIds } };
    transactionWhere = { status: "APPROVED", eventId: { in: eventIds } };
    pendingWhere = { status: "PENDING", eventId: { in: eventIds } };
  }

  // Fetch real global aggregate data
  const totalEvents = await prisma.event.count({ where: eventWhere });
  const totalPeserta = await prisma.ticket.count({
    where: { transaction: transactionWhere }
  });
  const revenueResult = await prisma.transaction.aggregate({
    _sum: { totalPrice: true },
    where: transactionWhere
  });
  const pendapatan = revenueResult._sum.totalPrice || 0;

  // Format currency
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  });

  const stats = [
    { title: "Total Event", value: totalEvents.toString(), icon: Calendar, color: "text-blue-500", bg: "bg-blue-50" },
    { title: "Total Peserta", value: totalPeserta.toLocaleString('id-ID'), icon: Users, color: "text-emerald-500", bg: "bg-emerald-50" },
    { title: "Tiket Terjual", value: totalPeserta.toLocaleString('id-ID'), icon: QrCode, color: "text-purple-500", bg: "bg-purple-50" },
    { title: "Pendapatan", value: formatter.format(pendapatan), icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50" },
  ];

  // Fetch recent pending transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: pendingWhere,
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { event: { select: { title: true } } }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Ringkasan statistik keseluruhan sistem Anda.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="relative bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col justify-between h-full">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${stat.bg} mb-3 sm:mb-0 sm:absolute sm:top-6 sm:right-6`}>
                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-lg sm:text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-8 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-800">Pendaftaran Terbaru (Menunggu Validasi)</h3>
        </div>
        <div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p>Belum ada data pendaftaran terbaru yang menunggu validasi.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800">{tx.buyerName}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Membeli <span className="font-bold">{tx.totalTickets} tiket</span> untuk <span className="text-emerald-600 font-semibold">{tx.event.title}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-800">{formatter.format(tx.totalPrice)}</p>
                    <span className="inline-block mt-1 px-2.5 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-black rounded-md uppercase tracking-wider">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
