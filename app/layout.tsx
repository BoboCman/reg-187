import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PolicyPlan — Best-interest documentation for life insurance recommendations",
  description:
    "PolicyPlan is a structured workspace for life insurance intake, recommendation rationale, advisor approval, and carrier-ready documentation, built around the New York Reg 187 best-interest process.",
};

export const viewport: Viewport = {
  themeColor: "#1a56db",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased bg-white`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
