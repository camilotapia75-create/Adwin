import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error") ?? "unknown";
  return NextResponse.redirect(
    new URL(`/login?error=${error}`, process.env.NEXTAUTH_URL ?? "https://ad-lottery.vercel.app")
  );
}
