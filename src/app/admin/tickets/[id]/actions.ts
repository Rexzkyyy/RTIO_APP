"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function updateTicketConfigAction(eventId: string, formData: FormData) {
  try {
    const ticketConfigStr = formData.get('ticketConfig') as string;
    const ticketConfig = JSON.parse(ticketConfigStr);
    
    let ticketDesignUrl: string | undefined = undefined;

    const file = formData.get('ticketDesignFile') as File;
    if (file && file.size > 0 && file.name !== 'undefined') {
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, filename), buffer);
      ticketDesignUrl = `/uploads/${filename}`;
    }

    const updateData: any = { ticketConfig };
    if (ticketDesignUrl) {
      updateData.ticketDesignUrl = ticketDesignUrl;
    }

    await prisma.event.update({
      where: { id: eventId },
      data: updateData
    });

    revalidatePath(`/admin/tickets/${eventId}`);
    revalidatePath(`/admin/events`);
    revalidatePath(`/event/[slug]`, 'page');
    revalidatePath(`/public/${eventId}/ticket`);

    return { success: true, ticketDesignUrl };
  } catch (error) {
    console.error("Error updating ticket config:", error);
    return { success: false, error: "Gagal menyimpan konfigurasi tiket" };
  }
}
