import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      referralCode: true,
      _count: { select: { referralsMade: true } },
    },
  });

  return NextResponse.json({
    referralCode: user?.referralCode ?? null,
    referralsCount: user?._count.referralsMade ?? 0,
    bonusEntries: (user?._count.referralsMade ?? 0) * 5,
  });
}
