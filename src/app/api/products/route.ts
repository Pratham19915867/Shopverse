import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { products } from "@/db/schema";
import { apiError, getUser, sameOrigin } from "@/lib/auth";
import { CATEGORIES } from "@/lib/types";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return apiError("Invalid request origin.", 403);
  const user = await getUser();
  if (!user) return apiError("Sign in to publish your first listing.", 401);
  if (!user.onboarded) return apiError("Finish setting up your profile first.", 403);
  if (Number(request.headers.get("content-length") || 0) > 6500000) return apiError("Your photos are too large. Please choose smaller images.", 413);
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const brand = String(body.brand ?? "").trim() || user.username;
    const price = Number(body.price);
    const originalPrice = body.originalPrice ? Number(body.originalPrice) : price;
    const stock = Number(body.stock || 1);
    if (name.length < 3 || name.length > 100) return apiError("Use a product name between 3 and 100 characters.");
    if (brand.length > 50) return apiError("Brand names must be shorter than 50 characters.");
    if (description.length < 15 || description.length > 2000) return apiError("Write a description between 15 and 2,000 characters.");
    if (!CATEGORIES.includes(body.category)) return apiError("Choose a product category.");
    if (!Number.isInteger(price) || price < 1 || price > 10000000 || !Number.isInteger(originalPrice) || originalPrice < price || originalPrice > 10000000) return apiError("Enter a valid price. The original price cannot be lower than the selling price.");
    if (!Number.isInteger(stock) || stock < 1 || stock > 1000) return apiError("Stock must be between 1 and 1,000.");
    if (!Array.isArray(body.images) || body.images.length < 1 || body.images.length > 4 || body.images.some((image: unknown) => typeof image !== "string" || image.length > 1500000 || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image))) return apiError("Upload 1–4 JPG, PNG, or WebP photos (up to 1 MB each).");
    const [product] = await db.insert(products).values({ id: randomUUID(), sellerId: user.id, name, description, brand, category: body.category, price, originalPrice, stock, images: body.images, badge: "Community find", isDemo: false }).returning();
    return Response.json({ product }, { status: 201 });
  } catch { return apiError("Your listing couldn't be published. Please try again.", 500); }
}
