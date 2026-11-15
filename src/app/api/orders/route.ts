import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, orders, products } from "@/db/schema";
import { apiError, getUser, sameOrigin } from "@/lib/auth";

export async function GET() {
  const user = await getUser();
  if (!user) return apiError("Please sign in first.", 401);
  return Response.json({ orders: await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await getUser();
  if (!user) return apiError("Please sign in to check out.", 401);
  try {
    const body = await request.json();
    const address = String(body.address ?? "").trim();
    if (address.length < 15 || address.length > 500) return apiError("Enter your name and a complete delivery address (at least 15 characters).");
    const order = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
      const cart = await tx.select().from(cartItems).where(eq(cartItems.userId, user.id));
      if (!cart.length) throw new Error("Your bag is empty.");
      const selected = await tx.select().from(products).where(inArray(products.id, cart.map((item) => item.productId))).orderBy(products.id).for("update");
      const items = cart.map((item) => {
        const product = selected.find((row) => row.id === item.productId);
        if (!product || product.stock < item.quantity) throw new Error(`${product?.name || "An item"} is no longer available in that quantity.`);
        return { productId: product.id, name: product.name, quantity: item.quantity, price: product.price, image: product.images[0] };
      });
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const [created] = await tx.insert(orders).values({ userId: user.id, items, total, address, status: "Demo order placed" }).returning();
      for (const item of items) await tx.update(products).set({ stock: sql`${products.stock} - ${item.quantity}` }).where(and(eq(products.id, item.productId)));
      await tx.delete(cartItems).where(eq(cartItems.userId, user.id));
      return created;
    });
    return Response.json({ order }, { status: 201 });
  } catch (error) { return apiError(error instanceof Error ? error.message : "Checkout couldn't be completed."); }
}
