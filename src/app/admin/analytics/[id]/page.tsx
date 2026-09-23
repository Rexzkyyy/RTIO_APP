import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import AnalyticsDashboardClient from "./AnalyticsDashboardClient";

export const dynamic = "force-dynamic";

export default async function EventAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const event = await prisma.event.findUnique({
    where: { id: resolvedParams.id },
    include: {
      ticketCategories: true,
      transactions: true,
    }
  });

  if (!event) notFound();

  // Hitung Data Analitik
  const approvedTx = event.transactions.filter(t => t.status === "APPROVED");
  const pendingTx = event.transactions.filter(t => t.status === "PENDING");
  const expiredTx = event.transactions.filter(t => t.status === "EXPIRED");
  const rejectedTx = event.transactions.filter(t => t.status === "REJECTED");

  const totalRevenue = approvedTx.reduce((sum, tx) => sum + tx.totalPrice, 0);
  const totalTicketsSold = approvedTx.reduce((sum, tx) => sum + tx.totalTickets, 0);
  
  const conversionRate = event.transactions.length > 0 
    ? Math.round((approvedTx.length / event.transactions.length) * 100) 
    : 0;

  // Pie Chart Data
  const transactionStatus = [
    { name: 'Lunas', value: approvedTx.length, color: '#10b981' }, // emerald-500
    { name: 'Menunggu', value: pendingTx.length, color: '#f59e0b' }, // amber-500
    { name: 'Kadaluarsa', value: expiredTx.length, color: '#94a3b8' }, // slate-400
    { name: 'Ditolak', value: rejectedTx.length, color: '#ef4444' }, // red-500
  ].filter(s => s.value > 0);

  // Bar Chart Data (Tiket Terjual per Kategori)
  // Untuk menghitung ini, kita butuh detail tiket yang terjual.
  // Tapi di model Transaction kita tidak menyimpan ID Kategori, hanya totalTickets.
  // Untuk mendapatkan ini, kita ambil semua record Ticket yang related ke transaksi APPROVED
  const tickets = await prisma.ticket.findMany({
    where: {
      transaction: {
        eventId: event.id,
        status: "APPROVED"
      }
    },
    include: {
      ticketCategory: true,
      transaction: true
    }
  });

  const now = new Date();
  const ticketsMap = new Map();
  event.ticketCategories.forEach(cat => {
    const discountStart = cat.discountStartDate ? new Date(cat.discountStartDate) : null;
    const discountEnd = cat.discountEndDate ? new Date(cat.discountEndDate) : null;
    const isDiscountActive = cat.hasDiscount && cat.discountPrice != null && 
      (!discountStart || now >= discountStart) && 
      (!discountEnd || now <= discountEnd);
    
    const activePromoQuota = isDiscountActive ? (cat.discountQuota || 0) : 0;

    ticketsMap.set(cat.id, {
      name: cat.name,
      terjual: 0,
      terjualPromo: 0,
      terjualNormal: 0,
      sisaPromo: activePromoQuota,
      sisaNormal: cat.quota - activePromoQuota,
    });
  });

  // Revenue Over Time & Transaksi per Jam
  const revenueByDate = new Map<string, { date: string, revenue: number, tickets: number }>();
  const txByHour = new Array(24).fill(0).map((_, i) => ({ hour: `${i.toString().padStart(2, '0')}:00`, total: 0 }));
  
  approvedTx.forEach(tx => {
    // By Date
    const date = tx.createdAt.toISOString().split('T')[0];
    if (!revenueByDate.has(date)) {
      revenueByDate.set(date, { date, revenue: 0, tickets: 0 });
    }
    const current = revenueByDate.get(date)!;
    current.revenue += tx.totalPrice;
    current.tickets += tx.totalTickets;

    // By Hour
    const hour = tx.createdAt.getHours();
    txByHour[hour].total += 1;
  });
  const revenueOverTime = Array.from(revenueByDate.values()).sort((a, b) => a.date.localeCompare(b.date));

  let totalPromo = 0;
  let totalNormal = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let checkedIn = 0;
  let notCheckedIn = 0;

  const ageGroups = {
    '< 18': 0,
    '18-24': 0,
    '25-34': 0,
    '35+': 0,
    'Tidak Diketahui': 0
  };

  const checkinByHour = new Array(24).fill(0).map((_, i) => ({ hour: `${i.toString().padStart(2, '0')}:00`, total: 0 }));

  tickets.forEach(ticket => {
    const catData = ticketsMap.get(ticket.ticketCategoryId);
    if (catData) {
      catData.terjual += 1;
      
      const activePrice = ticket.transaction.totalTickets > 0 
        ? ticket.transaction.totalPrice / ticket.transaction.totalTickets 
        : 0;
      
      if (ticket.ticketCategory.hasDiscount && ticket.ticketCategory.discountPrice !== null && activePrice === ticket.ticketCategory.discountPrice) {
        catData.terjualPromo += 1;
        totalPromo += 1;
        catData.revenue += ticket.ticketCategory.discountPrice;
      } else {
        catData.terjualNormal += 1;
        totalNormal += 1;
        catData.revenue += ticket.ticketCategory.price;
      }
    }
    
    // Demografi Gender
    if (ticket.holderGender === 'L' || ticket.holderGender === 'Laki-laki') {
      maleCount += 1;
    } else if (ticket.holderGender === 'P' || ticket.holderGender === 'Perempuan') {
      femaleCount += 1;
    }

    // Demografi Umur
    if (ticket.holderAge) {
      if (ticket.holderAge < 18) ageGroups['< 18']++;
      else if (ticket.holderAge <= 24) ageGroups['18-24']++;
      else if (ticket.holderAge <= 34) ageGroups['25-34']++;
      else ageGroups['35+']++;
    } else {
      ageGroups['Tidak Diketahui']++;
    }

    // Check-in
    if (ticket.isValidated) {
      checkedIn++;
      if (ticket.checkedInAt) {
        const hour = ticket.checkedInAt.getHours();
        checkinByHour[hour].total += 1;
      }
    } else {
      notCheckedIn++;
    }
  });

  const ticketsByCategory = Array.from(ticketsMap.values());
  const revenueByCategory = ticketsByCategory.map(cat => ({ name: cat.name, value: cat.revenue || 0 })).filter(c => c.value > 0);

  const ageData = Object.entries(ageGroups)
    .map(([name, value]) => ({ name, value }))
    .filter(g => g.value > 0);

  const checkinData = [
    { name: 'Sudah Check-in', value: checkedIn, color: '#10b981' }, // emerald-500
    { name: 'Belum Check-in', value: notCheckedIn, color: '#94a3b8' }, // slate-400
  ].filter(c => c.value > 0);

  const promoData = [
    { name: 'Harga Promo', value: totalPromo, color: '#10b981' }, // emerald-500
    { name: 'Harga Normal', value: totalNormal, color: '#3b82f6' }, // blue-500
  ].filter(p => p.value > 0);

  // Recent Transactions (5 Latest Approved)
  const recentTransactions = approvedTx
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map(tx => ({
      id: tx.id,
      buyerName: tx.buyerName,
      buyerEmail: tx.buyerEmail,
      totalTickets: tx.totalTickets,
      totalPrice: tx.totalPrice,
      updatedAt: tx.createdAt.toISOString(), // Fallback to createdAt
    }));

  const analyticsData = {
    totalRevenue,
    totalTicketsSold,
    totalTransactions: approvedTx.length,
    conversionRate,
    transactionStatus,
    ticketsByCategory,
    revenueByCategory,
    recentTransactions,
    totalPromo,
    totalNormal,
    promoData,
    revenueOverTime,
    txByHour,
    checkinByHour,
    checkinData,
    ageData,
    genderData: [
      { name: 'Laki-laki', value: maleCount, color: '#3b82f6' }, // blue-500
      { name: 'Perempuan', value: femaleCount, color: '#ec4899' }, // pink-500
    ].filter(g => g.value > 0),
  };

  // Kita tidak perlu mengirim object rumit dari Prisma, jadi serialize seperlunya
  const serializableEvent = {
    id: event.id,
    title: event.title,
    slug: event.slug,
    eventDate: event.eventDate.toISOString(),
  };

  return (
    <AnalyticsDashboardClient 
      event={serializableEvent} 
      analyticsData={analyticsData} 
    />
  );
}
