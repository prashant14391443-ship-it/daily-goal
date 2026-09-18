import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./BottomNav";
import CoinPop from "./CoinPop";
import CountdownChip from "@/app/components/CountdownChip";
import TopBar from "./TopBar";
import ScrollMemory from "./ScrollMemory";
import AiGuard from "@/app/components/AiGuard";
import OfflineSync from "./offline-sync";

export const metadata: Metadata = {
  title: "DAILY GOAL",
  description: "Your productivity dashboard for study, gym and habits.",
};

const themeScript = `
(function(){try{
  var t = localStorage.getItem("dg-theme");
  var h = document.documentElement;
  h.classList.remove("light","bronze");
  if(t === "light") h.classList.add("light");
  if(t === "bronze") h.classList.add("bronze");
  var m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = (t === "light") ? "#f8fafc" : (t === "bronze") ? "#080605" : "#020617";
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  window.addEventListener("load", function(){
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      var type = nav ? nav.type : "navigate";
      if (type === "back_forward") {
        var s = Number(sessionStorage.getItem("scroll:" + location.pathname) || 0);
        if (s > 0) {
          var t0 = Date.now();
          (function attempt(){
            window.scrollTo(0, s);
            if (Math.abs(window.scrollY - s) < 5 || Date.now() - t0 > 5000) return;
            setTimeout(attempt, 120);
          })();
          return;
        }
      }
      window.scrollTo(0, 0);
    } catch(e) { window.scrollTo(0, 0); }
  });
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#020617" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full antialiased pb-20 md:pb-0 bg-slate-950">
        <CountdownChip />
        <TopBar />
        <AiGuard />
        <OfflineSync />
        {children}
        <BottomNav />
        <CoinPop />
        <ScrollMemory />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}