import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Calendar as CalendarIcon, MapPin, Users, Tag, ChevronRight, ArrowLeft } from "lucide-react";
import EventDetailClient from "@/components/EventDetailClient";
import PublicNavbar from "@/components/PublicNavbar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const event = await prisma.event.findUnique({
    where: { slug: resolvedParams.slug },
  });

  if (!event || !event.isActive) {
    return { title: 'Event Tidak Ditemukan' };
  }

  const imageUrl = event.bannerUrl || event.ticketDesignUrl || '/logo.png';
  
  return {
    title: event.title,
    description: event.description.substring(0, 160) + '...',
    openGraph: {
      title: event.title,
      description: event.description.substring(0, 160) + '...',
      images: [{ url: imageUrl as string }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.description.substring(0, 160) + '...',
      images: [imageUrl as string],
    }
  };
}

export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  
  const event = await prisma.event.findUnique({
    where: { slug: resolvedParams.slug },
    include: {
      ticketCategories: true,
    }
  });

  if (!event || !event.isActive) {
    notFound();
  }

  const now = new Date();
  
  let lowestActivePrice = Infinity;
  let originalPriceForLowest: number | null = null;
  let isLowestDiscounted = false;

  if (event.ticketCategories && event.ticketCategories.length > 0) {
    for (const t of event.ticketCategories) {
      const isDiscountActive = t.hasDiscount && t.discountPrice != null && 
        (!t.discountStartDate || now >= new Date(t.discountStartDate)) && 
        (!t.discountEndDate || now <= new Date(t.discountEndDate)) &&
        (t.discountQuota === null || t.discountQuota > 0);
      
      const activePrice = isDiscountActive ? (t.discountPrice as number) : t.price;
      
      if (activePrice < lowestActivePrice) {
        lowestActivePrice = activePrice;
        isLowestDiscounted = isDiscountActive;
        originalPriceForLowest = t.price;
      }
    }
  } else {
    lowestActivePrice = 0;
  }

  const serializableEvent = {
    ...event,
    eventDate: event.eventDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
  };

  return <EventDetailClient event={serializableEvent} lowestPrice={lowestActivePrice} originalPrice={isLowestDiscounted ? originalPriceForLowest : null} navbar={<PublicNavbar />} isLoggedIn={!!session?.user} />;
}
