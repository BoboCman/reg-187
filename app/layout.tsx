import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PolicyPlan — Every client deserves a best-interest letter",
  description:
    "Upload the carrier illustration, answer a three-minute client profile, and sign a client-ready best-interest letter built to New York's Reg 187 standard. For every case, in every state.",
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
