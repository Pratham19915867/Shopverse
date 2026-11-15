import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { otpChallenges, users } from "@/db/schema";
import { apiError, createSession, hash, sameOrigin, twilioVerify } from "@/lib/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  try {
    const { challengeId, code } = await request.json();
    if (typeof challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(String(code))) return apiError("Enter the 6-digit verification code.");
    const [challenge] = await db.update(otpChallenges).set({ attempts: sql`${otpChallenges.attempts} + 1` })
      .where(and(eq(otpChallenges.id, challengeId), eq(otpChallenges.used, false), lt(otpChallenges.attempts, 5), gt(otpChallenges.expiresAt, new Date()))).returning();
    if (!challenge) return apiError("This code has expired or reached its attempt limit. Request a new one.");
    let approved = false;
    if (challenge.provider === "twilio") {
      try { approved = (await twilioVerify("VerificationCheck", { To: challenge.phone, Code: String(code) })).status === "approved"; }
      catch { return apiError("Verification is unavailable or expired. Please request a new code.", 502); }
    } else {
      approved = challenge.codeHash === hash(`${challenge.id}:${challenge.phone}:${code}`);
    }
    if (!approved) return apiError(`That code doesn't match. ${5 - challenge.attempts} attempts remaining.`);
    const [consumed] = await db.update(otpChallenges).set({ used: true }).where(and(eq(otpChallenges.id, challenge.id), eq(otpChallenges.used, false))).returning();
    if (!consumed) return apiError("This code has already been used. Request a new one.");
    await db.insert(users).values({ phone: challenge.phone }).onConflictDoNothing();
    const [user] = await db.select().from(users).where(eq(users.phone, challenge.phone)).limit(1);
    await createSession(user.id);
    return Response.json({ user });
  } catch (error) {
    console.error("OTP verification failed:", error instanceof Error ? error.message : "unknown error");
    return apiError("We couldn't finish signing you in. Please try again.", 500);
  }
}
