import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import TicketDesignEditor from "@/components/admin/TicketDesignEditor";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>
}

export default async function TicketDesignPage({ params }: Props) {
  const { id } = await params;
  
  const event = await prisma.event.findUnique({
    where: { id }
  });

  if (!event) {
    notFound();
  }

  // Convert JSON to object if needed for the component
  const eventWithConfig = {
    ...event,
    ticketConfig: event.ticketConfig ? (typeof event.ticketConfig === 'string' ? JSON.parse(event.ticketConfig) : event.ticketConfig) : null,
    eventDate: event.eventDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/admin/tickets" 
          className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Edit Desain Tiket</h1>
          <p className="text-slate-500 mt-1">Mengubah tampilan tiket untuk event <span className="font-semibold text-slate-700">{event.title}</span></p>
        </div>
      </div>

      <TicketDesignEditor event={eventWithConfig} />
    </div>
  );
}
