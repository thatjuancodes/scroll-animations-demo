import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./styles/scrollAnimations.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Scroll Animations Demo",
  description: "Advanced scroll animations with velocity-based effects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
} 