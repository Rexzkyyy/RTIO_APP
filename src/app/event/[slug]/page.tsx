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

  // Find lowest price
  const lowestPrice = event.ticketCategories.length > 0 
    ? Math.min(...event.ticketCategories.map(t => t.price))
    : 0;

  return <EventDetailClient event={event} lowestPrice={lowestPrice} navbar={<PublicNavbar />} isLoggedIn={!!session?.user} />;
}
