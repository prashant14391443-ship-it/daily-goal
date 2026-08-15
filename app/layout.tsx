import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BottomNav from "./BottomNav";
import ProfileMenu from "./ProfileMenu";
import CoinPop from "./CoinPop";
import NotificationCenter from "./NotificationCenter";

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased pb-16 md:pb-0`}
      >
        {children}
        <BottomNav />
        <NotificationCenter />
        <ProfileMenu />
        <CoinPop />
      </body>
    </html>
  );
}