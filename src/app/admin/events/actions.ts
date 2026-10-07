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

export async function toggleEventLock(id: string, isLocked: boolean) {
  try {
    await prisma.event.update({
      where: { id },
      data: { isLocked },
    });
    revalidatePath("/admin/events");
    // Also revalidate the public event page if needed
    // The public catalog will also be updated because it's dynamically fetched or revalidated
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to toggle event lock:", error);
    return { success: false, error: error.message || "Gagal mengunci/membuka event" };
  }
}
