import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ParcelPilot Support AI",
  description: "AI-powered customer support for ParcelPilot B2B logistics platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: "var(--bg-primary)" }}>
        {children}
      </body>
    </html>
  );
}
