"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

export async function updateEvent(id: string, formData: FormData) {
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.adminRole === "VALIDATOR") {
    return { error: "Anda tidak memiliki izin untuk mengedit event." };
  }

  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const eventDateStr = formData.get("eventDate") as string;
  const location = formData.get("location") as string;
  const waGroupLink = formData.get("waGroupLink") as string | null;

  // Check Slug format and uniqueness
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)." };
  }
  const existingEvent = await prisma.event.findFirst({ where: { slug, NOT: { id } } });
  if (existingEvent) {
    return { error: "Slug URL sudah digunakan. Silakan pilih slug lain." };
  }

  const artistsRaw = formData.get("artists") as string;
  const sponsorsRaw = formData.get("sponsors") as string;
  const artists = artistsRaw ? artistsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
  const sponsors = sponsorsRaw ? sponsorsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

  const ticketIds = formData.getAll("ticketId[]") as string[];
  const ticketNames = formData.getAll("ticketName[]") as string[];
  const ticketPrices = formData.getAll("ticketPrice[]") as string[];
  const ticketOriginalPrices = formData.getAll("ticketOriginalPrice[]") as string[];
  const ticketQuotas = formData.getAll("ticketQuota[]") as string[];
  const hasDiscounts = formData.getAll("hasDiscount[]") as string[];
  const discountPrices = formData.getAll("discountPrice[]") as string[];
  const discountStartDates = formData.getAll("discountStartDate[]") as string[];
  const discountEndDates = formData.getAll("discountEndDate[]") as string[];
  const discountQuotas = formData.getAll("discountQuota[]") as string[];
  const hasBenefits = formData.getAll("hasBenefits[]") as string[];
  const ticketIndices = formData.getAll("ticketIndex[]") as string[];

  const bankNames = formData.getAll("bankName[]") as string[];
  const bankNumbers = formData.getAll("bankNumber[]") as string[];
  const bankAccountNames = formData.getAll("bankAccountName[]") as string[];

  const bankAccounts = bankNames.map((bank, idx) => ({
    bank,
    number: bankNumbers[idx],
    name: bankAccountNames[idx],
  }));

  const socialPlatforms = formData.getAll("socialPlatform[]") as string[];
  const socialLinks = formData.getAll("socialLink[]") as string[];

  const socialMedias = socialPlatforms.map((platform, idx) => {
    let link = socialLinks[idx];
    if (platform === 'WhatsApp' && link) {
      let cleaned = link.toString().replace(/\D/g, '');
      if (cleaned.startsWith('62')) link = '+' + cleaned;
      else if (cleaned.startsWith('0')) link = '+62' + cleaned.substring(1);
      else link = '+62' + cleaned;
    }
    return {
      platform,
      link,
    };
  }).filter(s => s.link.trim() !== "");

  // Prepare ticket updates: we will delete all old ones and recreate to keep it simple,
  // OR we can update existing and create new.
  // Simplest approach: Delete existing ticket categories for this event and create new ones.
  // WARNING: In production with real bought tickets, deleting TicketCategory would fail due to constraints or cascade delete tickets.
  // A better way is to update existing ones.
  
  // Actually, since we have Cascade delete or Restrict, let's just update existing and create new.
  const existingIds = ticketIds.filter(id => id !== "NEW");
  
  // We'll update the event first
  const dataToUpdate: any = {
    title,
    slug,
    description,
    eventDate: new Date(eventDateStr),
    location,
    artists,
    sponsors,
    waGroupLink,
    socialMedias: socialMedias.length > 0 ? (socialMedias as any) : null,
    bankAccounts: bankAccounts.length > 0 ? (bankAccounts as any) : undefined,
  };

  // Handle Image Upload using Vercel Blob if new image is provided
  const file = formData.get("bannerImage") as File;
  if (file && file.size > 0) {
    const filename = `banners/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const blob = await put(filename, file, { access: 'public' });
    dataToUpdate.bannerUrl = blob.url;
  }

  // Handle Ticket Design Upload if provided
  const ticketFile = formData.get("ticketDesignImage") as File;
  if (ticketFile && ticketFile.size > 0) {
    const filename = `tickets/${Date.now()}-${ticketFile.name.replace(/\s+/g, '-')}`;
    const blob = await put(filename, ticketFile, { access: 'public' });
    dataToUpdate.ticketDesignUrl = blob.url;
  }

  await prisma.event.update({
    where: { id },
    data: dataToUpdate,
  });

  // Handle Tickets
  // 1. Delete tickets that are no longer in the form
  await prisma.ticketCategory.deleteMany({
    where: {
      eventId: id,
      id: { notIn: existingIds.length > 0 ? existingIds : ["DUMMY"] }
    }
  });

  // 2. Upsert tickets
  for (let i = 0; i < ticketIds.length; i++) {
    const tId = ticketIds[i];
    const quota = parseInt(ticketQuotas[i]);
    const originalPriceStr = ticketOriginalPrices[i]?.replace(/\D/g, '');
    const hasBenefit = hasBenefits[i] === "true";
    const benefits = hasBenefit ? (formData.getAll(`benefit_${ticketIndices[i]}[]`) as string[]).filter(b => b.trim() !== "") : [];
    
    const baseData: any = {
      name: ticketNames[i],
      price: parseInt(ticketPrices[i].replace(/\D/g, '') || "0"),
      originalPrice: originalPriceStr ? parseInt(originalPriceStr) : null,
      quota: quota,
      hasDiscount: hasDiscounts[i] === "true",
      discountPrice: discountPrices[i] ? parseInt(discountPrices[i].replace(/\D/g, '')) : null,
      discountStartDate: discountStartDates[i] ? new Date(discountStartDates[i]) : null,
      discountEndDate: discountEndDates[i] ? new Date(discountEndDates[i]) : null,
      discountQuota: discountQuotas[i] ? parseInt(discountQuotas[i]) : null,
      hasBenefits: hasBenefit,
      benefits: benefits,
    };

    if (tId === "NEW") {
      await prisma.ticketCategory.create({ 
        data: {
          ...baseData,
          initialQuota: quota,
          eventId: id,
        }
      });
    } else {
      // Don't update initialQuota for existing tickets unless we specifically want to
      await prisma.ticketCategory.update({
        where: { id: tId },
        data: baseData,
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath(`/event/${slug}`);
  
  redirect("/admin/events");
}
