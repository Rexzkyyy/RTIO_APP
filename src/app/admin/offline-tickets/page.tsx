import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import OfflineTicketForm, { EventData } from "./OfflineTicketForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Input Tiket Offline — Admin RTIO TIX",
  description: "Entri dan pencatatan tiket fisik offline.",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminOfflineTicketsPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const bypassRole = process.env.NODE_ENV !== "production"
    ? cookieStore.get("dev-admin-bypass")?.value
    : null;

  if (!session?.user && !bypassRole) {
    redirect("/login");
  }

  const sessionUser = session?.user as { adminRole?: string; adminId?: string; name?: string | null; email?: string | null } | undefined;
  const isValidator = sessionUser?.adminRole === "VALIDATOR" || bypassRole === "VALIDATOR";
  const adminId = sessionUser?.adminId;

  // Validator access check
  let allowedEventIds: string[] = [];
  if (isValidator && adminId) {
    const access = await prisma.adminEventAccess.findMany({
      where: { adminId },
      select: { eventId: true }
    });
    allowedEventIds = access.map((a) => a.eventId);
  }

  const whereEvent: { isActive: boolean; id?: { in: string[] } } = { isActive: true };
  if (isValidator) {
    whereEvent.id = { in: allowedEventIds };
  }

  const events = await prisma.event.findMany({
    where: whereEvent,
    include: {
      ticketCategories: {
        orderBy: { price: "asc" }
      },
      fields: true,
      _count: {
        select: {
          transactions: true,
        }
      }
    },
    orderBy: { eventDate: "desc" }
  });

  // Convert Date objects to strings for serialization
  const serializableEvents: EventData[] = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    location: ev.location,
    eventDate: ev.eventDate.toISOString(),
    bannerUrl: ev.bannerUrl,
    waGroupLink: ev.waGroupLink,
    totalIssuedTickets: ev._count.transactions,
    ticketCategories: ev.ticketCategories.map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      quota: c.quota,
      hasDiscount: c.hasDiscount,
      discountPrice: c.discountPrice,
      discountStartDate: c.discountStartDate ? c.discountStartDate.toISOString() : null,
      discountEndDate: c.discountEndDate ? c.discountEndDate.toISOString() : null,
      discountQuota: c.discountQuota,
    })),
    fields: ev.fields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      options: f.options,
      isRequired: f.isRequired,
    })),
  }));

  const defaultPjName = session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "Panitia");

  const params = await searchParams;
  const initialEventId = typeof params?.eventId === "string" ? params.eventId : undefined;

  return (
    <div className="w-full space-y-6">
      <OfflineTicketForm 
        events={serializableEvents} 
        defaultPjName={defaultPjName} 
        initialEventId={initialEventId}
      />
    </div>
  );
}
