import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: text("phone").notNull().unique(),
  username: text("username").notNull().default("New explorer"),
  onboarded: boolean("onboarded").notNull().default(false),
  intent: text("intent").notNull().default("buy"),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  style: text("style").notNull().default("Everyday essentials"),
  budget: text("budget").notNull().default("Any budget"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

export const otpChallenges = pgTable("otp_challenges", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: text("phone").notNull(),
  codeHash: text("code_hash").notNull(),
  provider: text("provider").notNull(),
  attempts: integer("attempts").notNull().default(0),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  sellerId: uuid("seller_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  originalPrice: integer("original_price").notNull(),
  images: jsonb("images").$type<string[]>().notNull(),
  rating: text("rating").notNull().default("New"),
  reviews: integer("reviews").notNull().default(0),
  badge: text("badge"),
  stock: integer("stock").notNull().default(10),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedItems = pgTable("saved_items", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.userId, table.productId] })]);

export const cartItems = pgTable("cart_items", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
}, (table) => [primaryKey({ columns: [table.userId, table.productId] })]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  items: jsonb("items").$type<{ productId: string; name: string; quantity: number; price: number; image: string }[]>().notNull(),
  total: integer("total").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("Placed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
