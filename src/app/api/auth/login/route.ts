import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email: String(email) } });
    if (!user || !user.password) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    const valid = await bcrypt.compare(String(password), user.password);
    if (!valid) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    await createSession({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
