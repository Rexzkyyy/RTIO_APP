"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

export async function createEvent(formData: FormData) {
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/lib/auth");
  const session = await getServerSession(authOptions);
  // @ts-ignore
  if (session?.user?.adminRole === "VALIDATOR") {
    return { error: "Anda tidak memiliki izin untuk membuat event." };
  }

  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const location = formData.get("location") as string;
  const eventDateStr = formData.get("eventDate") as string;
  const waGroupLink = formData.get("waGroupLink") as string | null;

  // Validate Slug Format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { error: "Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)." };
  }

  // Check Slug uniqueness
  const existingEvent = await prisma.event.findUnique({ where: { slug } });
  if (existingEvent) {
    return { error: "Slug URL sudah digunakan. Silakan pilih slug lain." };
  }
  
  // Parse comma-separated artists and sponsors
  const artistsRaw = formData.get("artists") as string;
  const sponsorsRaw = formData.get("sponsors") as string;
  const artists = artistsRaw ? artistsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
  const sponsors = sponsorsRaw ? sponsorsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

  // Parse arrays of ticket categories
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

  // Construct ticket categories data for nested write
  const ticketCategories = ticketNames.map((name, idx) => {
    const quota = parseInt(ticketQuotas[idx]);
    const originalPriceStr = ticketOriginalPrices[idx]?.replace(/\D/g, '');
    const hasBenefit = hasBenefits[idx] === "true";
    const benefits = hasBenefit ? (formData.getAll(`benefit_${ticketIndices[idx]}[]`) as string[]).filter(b => b.trim() !== "") : [];
    return {
      name: ticketNames[idx],
      price: parseInt(ticketPrices[idx].replace(/\D/g, '') || "0"),
      originalPrice: originalPriceStr ? parseInt(originalPriceStr) : null,
      quota: quota,
      initialQuota: quota,
      hasDiscount: hasDiscounts[idx] === "true",
      discountPrice: discountPrices[idx] ? parseInt(discountPrices[idx].replace(/\D/g, '')) : null,
      discountStartDate: discountStartDates[idx] ? new Date(discountStartDates[idx]) : null,
      discountEndDate: discountEndDates[idx] ? new Date(discountEndDates[idx]) : null,
      discountQuota: discountQuotas[idx] ? parseInt(discountQuotas[idx]) : null,
      hasBenefits: hasBenefit,
      benefits: benefits,
    };
  });

  // Parse arrays of bank accounts
  const bankNames = formData.getAll("bankName[]") as string[];
  const bankNumbers = formData.getAll("bankNumber[]") as string[];
  const bankAccountNames = formData.getAll("bankAccountName[]") as string[];

  // Construct bank accounts JSON array
  const bankAccounts = bankNames.map((bank, idx) => ({
    bank,
    number: bankNumbers[idx],
    name: bankAccountNames[idx],
  }));

  // Parse arrays of social medias
  const socialPlatforms = formData.getAll("socialPlatform[]") as string[];
  const socialLinks = formData.getAll("socialLink[]") as string[];

  // Construct social medias JSON array
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

  // Handle Image Upload using Vercel Blob
  let bannerUrl = ""; 
  const file = formData.get("bannerImage") as File;
  if (file && file.size > 0) {
    const filename = `banners/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const blob = await put(filename, file, { access: 'public' });
    bannerUrl = blob.url;
  }

  let ticketDesignUrl = ""; 
  const ticketFile = formData.get("ticketDesignImage") as File;
  if (ticketFile && ticketFile.size > 0) {
    const filename = `tickets/${Date.now()}-${ticketFile.name.replace(/\s+/g, '-')}`;
    const blob = await put(filename, ticketFile, { access: 'public' });
    ticketDesignUrl = blob.url;
  }

  await prisma.event.create({
    data: {
      title,
      slug,
      description,
      eventDate: new Date(eventDateStr),
      location,
      artists,
      sponsors,
      socialMedias: socialMedias.length > 0 ? (socialMedias as any) : undefined,
      bankAccounts: bankAccounts.length > 0 ? (bankAccounts as any) : undefined,
      bannerUrl,
      ticketDesignUrl,
      waGroupLink,
      isActive: true,
      ticketCategories: {
        create: ticketCategories
      }
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/events");

  redirect("/admin/events");
}
