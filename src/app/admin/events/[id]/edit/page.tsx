import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditEventForm } from "@/components/admin/EditEventForm";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);

  // @ts-ignore
  if (session?.user?.adminRole === "VALIDATOR") {
    const { redirect } = await import("next/navigation");
    redirect("/admin/events");
  }
  
  const event = await prisma.event.findUnique({
    where: { id: resolvedParams.id },
    include: { ticketCategories: true },
  });

  if (!event) {
    notFound();
  }

  const serializableEvent = {
    ...event,
    eventDate: event.eventDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
  };

  return <EditEventForm event={serializableEvent} />;
}
