import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopverse — Your next favourite is here",
  description: "A world of good finds, made a little more you. Discover everyday favourites, shop independent sellers, and share your own products on Shopverse.",
  applicationName: "Shopverse",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
