"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { redirect } from "next/navigation";

export async function uploadPaymentProof(formData: FormData) {
  const transactionId = formData.get("transactionId") as string;
  const file = formData.get("paymentProof") as File;
  
  if (file && file.size > 0) {
    const filename = `payments/${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const blob = await put(filename, file, { access: "public" });
    
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentProofUrl: blob.url,
      }
    });
  }

  // Revalidate and redirect to verify page
  revalidatePath(`/public/${transactionId}`);
  redirect(`/public/${transactionId}/verify`);
}
