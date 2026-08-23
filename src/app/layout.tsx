import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "RTIO TIX - Platform Ticketing Modern",
    template: "%s | RTIO TIX",
  },
  description: "Platform Ticketing Modern & Mudah oleh Ruang Tenang",
  manifest: "/manifest.json",
  themeColor: "#10b981",
  openGraph: {
    title: "RTIO TIX",
    description: "Platform Ticketing Modern & Mudah oleh Ruang Tenang",
    url: "/",
    siteName: "RTIO TIX",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "RTIO TIX Logo",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RTIO TIX",
    description: "Platform Ticketing Modern & Mudah oleh Ruang Tenang",
    images: ["/logo.png"],
  },
};

import MobileBottomNav from "@/components/MobileBottomNav";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
