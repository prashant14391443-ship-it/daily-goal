import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./BottomNav";
import ProfileMenu from "./ProfileMenu";
import CoinPop from "./CoinPop";
import NotificationCenter from "./NotificationCenter";
import OfflineBanner from "@/app/components/OfflineBanner";
import CountdownChip from "@/app/components/CountdownChip";

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
      <body className="h-full antialiased pb-20 md:pb-0 bg-slate-950">
        <OfflineBanner />
        <CountdownChip />
        {children}
        <BottomNav />
        <NotificationCenter />
        <ProfileMenu />
        <CoinPop />
      </body>
    </html>
  );
}