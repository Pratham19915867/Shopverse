import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import type { User } from "@/lib/types";

export const SESSION_COOKIE = "shopverse_session";
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db.select({ user: users }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hash(token)), gt(sessions.expiresAt, new Date()))).limit(1);
  if (!row) return null;
  const { id, phone, username, onboarded, intent, interests, style, budget } = row.user;
  return { id, phone, username, onboarded, intent, interests, style, budget };
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ tokenHash: hash(token), userId, expiresAt: expires });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires,
  });
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return host === request.headers.get("host") || host === request.headers.get("x-forwarded-host") || host === new URL(request.url).host;
  } catch { return false; }
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function smsConfigured() {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
}

export async function twilioVerify(action: "Verifications" | "VerificationCheck", params: Record<string, string>) {
  const response = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${action}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("The verification service is unavailable. Please try again shortly.");
  return response.json() as Promise<{ status: string }>;
}
