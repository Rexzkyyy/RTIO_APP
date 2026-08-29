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
      ticketCategory: true
    }
  });

  // Kelompokkan tiket yang terjual berdasarkan nama kategori
  const ticketsMap = new Map();
  event.ticketCategories.forEach(cat => {
    ticketsMap.set(cat.id, {
      name: cat.name,
      terjual: 0
    });
  });

  tickets.forEach(ticket => {
    const catData = ticketsMap.get(ticket.ticketCategoryId);
    if (catData) {
      catData.terjual += 1;
    }
  });

  const ticketsByCategory = Array.from(ticketsMap.values());

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
    recentTransactions,
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
