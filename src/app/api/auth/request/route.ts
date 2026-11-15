import { randomInt, randomUUID } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { otpChallenges } from "@/db/schema";
import { apiError, hash, sameOrigin, smsConfigured, twilioVerify } from "@/lib/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  try {
    const body = await request.json();
    const phone = String(body.phone ?? "").replace(/[\s()-]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return apiError("Enter a valid phone number with country code.");
    const live = smsConfigured() && process.env.AUTH_MODE !== "demo";
    if (process.env.AUTH_MODE === "live" && !live) return apiError("SMS sign-in is not configured yet. Please contact support.", 503);
    const id = randomUUID();
    const code = randomInt(100000, 1000000).toString();
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${phone}))`);
      const recent = await tx.select().from(otpChallenges).where(and(eq(otpChallenges.phone, phone), gt(otpChallenges.createdAt, new Date(Date.now() - 3600000))));
      if (recent.length >= 5) return "Please wait an hour before requesting another code.";
      if (recent.some((row) => Date.now() - row.createdAt.getTime() < 60000)) return "Please wait 60 seconds before requesting another code.";
      await tx.insert(otpChallenges).values({ id, phone, codeHash: live ? "provider-managed" : hash(`${id}:${phone}:${code}`), provider: live ? "twilio" : "demo", expiresAt: new Date(Date.now() + 300000) });
      return null;
    });
    if (result) return apiError(result, 429);
    if (live) {
      try { await twilioVerify("Verifications", { To: phone, Channel: "sms" }); }
      catch { await db.update(otpChallenges).set({ used: true }).where(eq(otpChallenges.id, id)); return apiError("We couldn't send the SMS. Check your number and try again in a minute.", 502); }
    }
    return Response.json({ challengeId: id, demo: !live, ...(live ? {} : { demoCode: code }), expiresIn: 300 });
  } catch (error) {
    console.error("OTP request failed:", error instanceof Error ? error.message : "unknown error");
    return apiError("We couldn't start verification. Please try again.", 500);
  }
}
