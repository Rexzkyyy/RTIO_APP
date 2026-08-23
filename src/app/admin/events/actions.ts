"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteEvent(id: string) {
  try {
    // Delete transactions first to bypass Prisma's RESTRICT constraints on Ticket -> TicketCategory
    // and Transaction -> Event
    await prisma.transaction.deleteMany({
      where: { eventId: id }
    });

    await prisma.event.delete({
      where: { id }
    });
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete event:", error);
    return { success: false, error: error.message || "Gagal menghapus event" };
  }
}
