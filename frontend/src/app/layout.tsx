import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/processes/app-store/provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400"]
});

const geistMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400"]
});

export const metadata: Metadata = {
  title: "PoolWise — Prediction Market",
  description: "Parimutuel prediction market with rake and guaranteed payouts"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body className="bg-canvas font-display text-ink antialiased">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
