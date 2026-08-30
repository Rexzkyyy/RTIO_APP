"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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
  const eventDateStr = formData.get("eventDate") as string;
  const location = formData.get("location") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const instagram = formData.get("instagram") as string;

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

  // Construct ticket categories data for nested write
  const ticketCategories = ticketNames.map((name, idx) => {
    const quota = parseInt(ticketQuotas[idx]);
    const originalPriceStr = ticketOriginalPrices[idx]?.replace(/\D/g, '');
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

  // Handle Image Upload locally to public/uploads
  let bannerUrl = ""; 
  const file = formData.get("bannerImage") as File;
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // Pastikan folder ada
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    bannerUrl = `/uploads/${filename}`;
  }

  let ticketDesignUrl = ""; 
  const ticketFile = formData.get("ticketDesignImage") as File;
  if (ticketFile && ticketFile.size > 0) {
    const bytes = await ticketFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `ticket-${Date.now()}-${ticketFile.name.replace(/\s+/g, '-')}`;
    
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    ticketDesignUrl = `/uploads/${filename}`;
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
      whatsapp: whatsapp || null,
      instagram: instagram || null,
      bankAccounts: bankAccounts.length > 0 ? (bankAccounts as any) : undefined,
      bannerUrl,
      ticketDesignUrl,
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
