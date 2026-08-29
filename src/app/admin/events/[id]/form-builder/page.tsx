import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/admin/FormBuilder";

export default async function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const event = await prisma.event.findUnique({
    where: { id: resolvedParams.id },
    include: {
      fields: true,
    }
  });

  if (!event) {
    notFound();
  }

  const serializableEvent = {
    ...event,
    eventDate: event.eventDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
  };

  return <FormBuilder event={serializableEvent} initialFields={event.fields} />;
}
