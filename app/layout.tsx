import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PolicyPlan — Best-Interest Life Insurance Intake",
  description:
    "PolicyPlan is a 7-step best-interest life insurance intake that captures every Reg 187, NAIC Model 275, and CFP Board suitability signal — and infers design emphasis automatically from the client profile.",
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
