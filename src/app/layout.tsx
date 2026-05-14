import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const dmSans = DM_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TuskForm — Decentralized AI-Powered Forms & Feedback",
  description:
    "Build secure forms, collect smarter feedback, and own your data. The decentralized AI-powered form platform built on Walrus storage and Seal encryption.",
  keywords: ["forms", "feedback", "decentralized", "Web3", "AI", "Walrus", "Seal", "encryption"],
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "TuskForm — Decentralized AI-Powered Forms",
    description: "Build secure forms, collect smarter feedback, own your data.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-body)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
