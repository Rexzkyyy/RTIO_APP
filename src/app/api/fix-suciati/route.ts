import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const imageUrl = "https://xrjbgjy4nzqj5es1.public.blob.vercel-storage.com/payments/suciati-1788750435113.png";
    
    // Find transaction
    const transactions = await prisma.transaction.findMany({
      where: { buyerName: { contains: "SUCIATI", mode: "insensitive" } },
      orderBy: { createdAt: 'desc' }
    });

    if (transactions.length === 0) {
      return NextResponse.json({ success: false, message: "Transaction not found" });
    }

    const tx = transactions[0];
    
    // Update it
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { paymentProofUrl: imageUrl }
    });
    
    return NextResponse.json({ success: true, transactionId: tx.id, message: "Successfully updated payment proof." });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
