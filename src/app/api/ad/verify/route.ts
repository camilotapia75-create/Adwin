import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getTodayDate, hasReachedDailyLimit, addToPool } from "@/lib/lottery";

const ADSCEND_API_KEY = process.env.ADSCEND_API_KEY ?? "";
const AD_REVENUE_PER_VIEW = parseFloat(process.env.AD_REVENUE_PER_VIEW ?? "0.025");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("subid");
  const oid = searchParams.get("oid") ?? "";
  const security = searchParams.get("security") ?? "";

  if (!userId || !oid || !security) return new Response("0");

  if (ADSCEND_API_KEY) {
    const expected = createHash("md5").update(ADSCEND_API_KEY + oid).digest("hex");
    if (security !== expected) return new Response("0");
  }

  const today = getTodayDate();
  try {
    const reachedLimit = await hasReachedDailyLimit(userId, today);
    if (reachedLimit) return new Response("1"); // already at limit, idempotent

    const adView = await prisma.adView.create({ data: { userId, date: today, adRevenue: AD_REVENUE_PER_VIEW } });
    await prisma.lotteryEntry.create({ data: { userId, adViewId: adView.id, date: today } });
    await addToPool(today, AD_REVENUE_PER_VIEW);

    return new Response("1");
  } catch (error) {
    console.error("Ad verify error:", error);
    return new Response("0");
  }
}
