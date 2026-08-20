import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "./BottomNav";
import ProfileMenu from "./ProfileMenu";
import CoinPop from "./CoinPop";
import NotificationCenter from "./NotificationCenter";
import OfflineBanner from "@/components/OfflineBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DAILY GOAL",
  description: "Your productivity dashboard for study, gym and habits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
  <head>
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <meta name="theme-color" content="#020617" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased pb-16 md:pb-0`}
      >
        <OfflineBanner />
        {children}
        <BottomNav />
        <NotificationCenter />
        <ProfileMenu />
        <CoinPop />
      </body>
    </html>
  );
}