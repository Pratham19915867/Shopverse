import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products, savedItems } from "@/db/schema";
import { apiError, getUser, sameOrigin } from "@/lib/auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await getUser();
  if (!user) return apiError("Please sign in first.", 401);
  try {
    const { type, productId, saved, quantity } = await request.json();
    if (typeof productId !== "string") return apiError("Choose a product.");
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return apiError("This product is no longer available.", 404);
    if (type === "save") {
      if (saved === true) await db.insert(savedItems).values({ userId: user.id, productId }).onConflictDoNothing();
      else await db.delete(savedItems).where(and(eq(savedItems.userId, user.id), eq(savedItems.productId, productId)));
    } else if (type === "cart") {
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10 || quantity > product.stock) return apiError("Choose an available quantity, up to 10 per item.");
      if (quantity === 0) await db.delete(cartItems).where(and(eq(cartItems.userId, user.id), eq(cartItems.productId, productId)));
      else await db.insert(cartItems).values({ userId: user.id, productId, quantity }).onConflictDoUpdate({ target: [cartItems.userId, cartItems.productId], set: { quantity } });
    } else return apiError("Unknown collection action.");
    return Response.json({ ok: true });
  } catch { return apiError("We couldn't save that change. Please try again.", 500); }
}

export async function PUT(request: Request) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await getUser();
  if (!user) return apiError("Please sign in first.", 401);
  try {
    const body = await request.json();
    if (!Array.isArray(body.saved) || !Array.isArray(body.cart) || body.saved.length > 100 || body.cart.length > 100) return apiError("Invalid collection.");
    const ids = [...new Set<string>([...body.saved.filter((id: unknown) => typeof id === "string"), ...body.cart.map((item: { productId: string }) => item?.productId).filter((id: unknown) => typeof id === "string")])];
    const available = ids.length ? await db.select().from(products).where(inArray(products.id, ids)) : [];
    await db.transaction(async (tx) => {
      for (const product of available) {
        if (body.saved.includes(product.id)) await tx.insert(savedItems).values({ userId: user.id, productId: product.id }).onConflictDoNothing();
        const item = body.cart.find((row: { productId: string }) => row?.productId === product.id);
        if (item && Number.isInteger(item.quantity) && item.quantity > 0 && product.stock > 0) {
          const quantity = Math.min(item.quantity, product.stock, 10);
          await tx.insert(cartItems).values({ userId: user.id, productId: product.id, quantity }).onConflictDoUpdate({ target: [cartItems.userId, cartItems.productId], set: { quantity } });
        }
      }
    });
    return Response.json({ ok: true });
  } catch { return apiError("We couldn't sync your collection.", 500); }
}
