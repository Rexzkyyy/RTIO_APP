import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function TransactionRouterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const transaction = await prisma.transaction.findUnique({
    where: { id: resolvedParams.id },
  });

  if (!transaction) {
    notFound();
  }

  const isFree = transaction.totalPrice === 0;

  if (isFree || transaction.status === "APPROVED") {
    redirect(`/public/${transaction.id}/ticket`);
  } else if (transaction.paymentProofUrl) {
    redirect(`/public/${transaction.id}/verify`);
  } else {
    redirect(`/public/${transaction.id}/pay`);
  }
}
