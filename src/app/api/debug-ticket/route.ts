import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const t = await prisma.ticketCategory.findUnique({
    where: { id: "7f1145dc-c984-4dc0-9114-1c1de0a5de7b" }
  });
  return NextResponse.json(t);
}
