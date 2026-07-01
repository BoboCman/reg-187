import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LIDQ — Life Insurance Design Questionnaire",
  description:
    "Valmark Life Insurance Design Questionnaire digital intake — collect insured information, financial profile, objectives, and Reg 187 attestation in a structured 8-step wizard.",
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
