import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiError, getUser, sameOrigin } from "@/lib/auth";
import { BUDGETS, CATEGORIES, STYLES } from "@/lib/types";

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await getUser();
  if (!user) return apiError("Please sign in first.", 401);
  try {
    const { username, intent, interests, style, budget } = await request.json();
    if (typeof username !== "string" || !/^[a-zA-Z0-9 _.-]{2,24}$/.test(username.trim())) return apiError("Choose a name with 2–24 letters, numbers, spaces, dots, or underscores.");
    if (!["buy", "sell", "both"].includes(intent)) return apiError("Choose how you'd like to use Shopverse.");
    if (!Array.isArray(interests) || interests.length < 1 || interests.length > 5 || interests.some((item) => !CATEGORIES.includes(item))) return apiError("Select at least one shopping interest.");
    if (!STYLES.includes(style) || !BUDGETS.includes(budget)) return apiError("Choose a style and a budget.");
    const [updated] = await db.update(users).set({ username: username.trim(), intent, interests: [...new Set<string>(interests)], style, budget, onboarded: true }).where(eq(users.id, user.id)).returning();
    return Response.json({ user: updated });
  } catch { return apiError("We couldn't save your preferences. Please try again.", 500); }
}
