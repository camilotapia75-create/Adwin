import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production";
const COOKIE = "ad-session";
const TTL = 60 * 60 * 24 * 30;

export type SessionUser = { id: string; email: string; name: string | null; isAdmin: boolean };
export type AppSession = { user: SessionUser };

function makeToken(user: SessionUser): string {
  const payload = JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + TTL });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function parseToken(token: string): SessionUser | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const encoded = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expectedSig = createHmac("sha256", SECRET).update(encoded).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.id, email: payload.email, name: payload.name ?? null, isAdmin: !!payload.isAdmin };
  } catch {
    return null;
  }
}

export async function auth(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  const user = parseToken(token);
  if (!user) return null;
  return { user };
}

export async function createSession(user: SessionUser): Promise<void> {
  const token = makeToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}
