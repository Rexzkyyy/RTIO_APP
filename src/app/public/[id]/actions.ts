"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

export async function uploadPaymentProof(formData: FormData) {
  const transactionId = formData.get("transactionId") as string;
  const senderAccountName = formData.get("senderAccountName") as string;
  const file = formData.get("paymentProof") as File;
  
  if (file && file.size > 0) {
    const filename = `payments/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // Konversi File ke Buffer untuk menghindari file korup (bug umum Next.js Server Action ke Blob)
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const blob = await put(filename, buffer, { 
      access: "public",
      contentType: file.type || "image/jpeg",
    });
    
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentProofUrl: blob.url,
        senderAccountName: senderAccountName || null,
        status: "PENDING",
      }
    });
  }

  // Revalidate and return URL for client navigation
  revalidatePath(`/public/${transactionId}`);
  return { success: true, url: `/public/${transactionId}/verify` };
}
