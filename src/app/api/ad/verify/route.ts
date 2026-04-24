import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getTodayDate, hasWatchedAdToday, addToPool } from "@/lib/lottery";

const ADSCEND_API_KEY = process.env.ADSCEND_API_KEY ?? "";
const AD_REVENUE_PER_VIEW = parseFloat(process.env.AD_REVENUE_PER_VIEW ?? "0.025");

// Adscend calls this URL when a user completes a video ad.
// Format: /api/ad/verify?subid=USER_ID&oid=OFFER_ID&security=HASH
// Security hash: MD5(API_KEY + OID)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("subid");
  const oid = searchParams.get("oid") ?? "";
  const security = searchParams.get("security") ?? "";

  if (!userId || !oid || !security) return new Response("0");

  // Verify Adscend's security hash to prevent fraudulent credits
  if (ADSCEND_API_KEY) {
    const expected = createHash("md5").update(ADSCEND_API_KEY + oid).digest("hex");
    if (security !== expected) return new Response("0");
  }

  const today = getTodayDate();
  try {
    const alreadyWatched = await hasWatchedAdToday(userId, today);
    if (alreadyWatched) return new Response("1"); // idempotent

    const adView = await prisma.adView.create({ data: { userId, date: today, adRevenue: AD_REVENUE_PER_VIEW } });
    await prisma.lotteryEntry.create({ data: { userId, adViewId: adView.id, date: today } });
    await addToPool(today, AD_REVENUE_PER_VIEW);

    return new Response("1"); // Adscend expects "1" for success
  } catch (error) {
    console.error("Ad verify error:", error);
    return new Response("0");
  }
}
