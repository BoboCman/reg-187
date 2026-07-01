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
    "Seven-step best-interest life insurance intake for advisors. Needs-first order per Reg 187, NAIC Model 275, and CFP Board. Design emphasis inferred from the client profile.",
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
    <html lang="en" className={`${inter.variable} bg-[var(--color-background)]`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
