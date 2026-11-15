export type User = {
  id: string;
  phone: string;
  username: string;
  onboarded: boolean;
  intent: string;
  interests: string[];
  style: string;
  budget: string;
};

export type Product = {
  id: string;
  sellerId: string | null;
  name: string;
  brand: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number;
  images: string[];
  rating: string;
  reviews: number;
  badge: string | null;
  stock: number;
  isDemo: boolean;
};

export type CartItem = { productId: string; quantity: number };
export type StoreData = { user: User | null; products: Product[]; saved: string[]; cart: CartItem[] };
export type Order = {
  id: string;
  items: { productId: string; name: string; quantity: number; price: number; image: string }[];
  total: number;
  address: string;
  status: string;
  createdAt: string;
};

export const CATEGORIES = ["Electronics", "Fashion", "Home & living", "Beauty", "Sports"];
export const STYLES = ["Everyday essentials", "Minimal & modern", "Bold & expressive", "A little of everything"];
export const BUDGETS = ["Under ₹1,000", "₹1,000 – ₹3,000", "₹3,000 – ₹5,000", "Any budget"];
export const money = (amount: number) => `₹${new Intl.NumberFormat("en-IN").format(amount)}`;
