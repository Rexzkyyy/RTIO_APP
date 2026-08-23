"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function uploadPaymentProof(formData: FormData) {
  const transactionId = formData.get("transactionId") as string;
  const file = formData.get("paymentProof") as File;
  
  if (file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'payments');
    
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentProofUrl: `/uploads/payments/${filename}`
      }
    });
  }

  // Revalidate to update the page state
  revalidatePath(`/public/${transactionId}`);
}
