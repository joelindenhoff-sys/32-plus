import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "32+ | Seasonal Rentals",
  description: "Furnished homes for genuine temporary stays. 32+ Seasonal Rentals, starting in the Canary Islands.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
