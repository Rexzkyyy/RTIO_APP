import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json([]);
  }

  const transactions = await prisma.transaction.findMany({
    where: { buyerEmail: session.user.email },
    select: {
      id: true,
      status: true,
      paymentProofUrl: true,
      event: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(transactions);
}
