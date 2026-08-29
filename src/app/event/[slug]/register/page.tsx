import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import RegisterFormClient from "./RegisterFormClient";
import PublicNavbar from "@/components/PublicNavbar";

export default async function RegisterPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const initialTicketId = resolvedSearchParams.ticketId as string | undefined;
  
  const event = await prisma.event.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      ticketCategories: true,
      fields: true,
    }
  });

  if (!event || !event.isActive) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative z-0">
      <PublicNavbar />
      
      <div className="flex-1 w-full max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link href={`/event/${event.slug}`} className="p-2 bg-white text-slate-500 rounded-full hover:bg-slate-100 shadow-sm transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pendaftaran Event</h1>
            <p className="text-slate-500">{event.title}</p>
          </div>
        </div>

        <RegisterFormClient 
          event={{
            ...event,
            eventDate: event.eventDate.toISOString(),
            createdAt: event.createdAt.toISOString(),
          } as any} 
          initialTicketId={initialTicketId} 
        />
      </div>
    </div>
  );
}
