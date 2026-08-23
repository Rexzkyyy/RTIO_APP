import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditEventForm } from "@/components/admin/EditEventForm";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const event = await prisma.event.findUnique({
    where: { id: resolvedParams.id },
    include: { ticketCategories: true },
  });

  if (!event) {
    notFound();
  }

  return <EditEventForm event={event} />;
}
