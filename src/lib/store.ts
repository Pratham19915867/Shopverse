import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, products, savedItems } from "@/db/schema";
import { getUser } from "@/lib/auth";
import { ensureCatalog } from "@/lib/catalog";
import type { StoreData } from "@/lib/types";

export async function getStore(): Promise<StoreData> {
  await ensureCatalog();
  const user = await getUser();
  const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
  const saved = user ? await db.select().from(savedItems).where(eq(savedItems.userId, user.id)) : [];
  const cart = user ? await db.select().from(cartItems).where(eq(cartItems.userId, user.id)) : [];
  return { user, products: allProducts.map(({ createdAt: _createdAt, ...product }) => product), saved: saved.map((item) => item.productId), cart: cart.map(({ productId, quantity }) => ({ productId, quantity })) };
}
