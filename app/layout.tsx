import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PolicyPlan · Illustration Companion",
  description:
    "Upload the carrier's sales illustration, capture the client's main objective, and prepare a concise, evidence-backed companion that the producer reviews before sharing.",
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
