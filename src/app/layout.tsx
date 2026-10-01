import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthGate } from "@/components/AuthGate";
import "./globals.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "IPIN — Arc's distribution layer",
  description: "Create a pool. Fund it. Pay many people once. USDC settles on Arc.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${body.className} ${mono.variable} antialiased`}>
        <Providers>
          <SiteHeader />
          <AuthGate>{children}</AuthGate>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
