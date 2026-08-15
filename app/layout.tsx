import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import OfflineSyncManager from "@/components/OfflineSyncManager";
import DebugErrorOverlay from "@/components/DebugErrorOverlay";
export const metadata: Metadata = {
  title: "Daily Task Safety Awareness",
  description: "Pre-task risk assessment for site workers",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#047857",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {/* TEMPORARY: self-hosted mobile debug console (eruda), so it
            keeps working while offline too. Shows a small floating button
            bottom-right — tap it to open a full console (Console, Network
            tabs) directly on the phone. Safe to remove once done
            debugging. */}
        <Script src="/eruda.js" strategy="beforeInteractive" />
        <Script id="eruda-init" strategy="afterInteractive">
          {`if (window.eruda) { eruda.init(); }`}
        </Script>
        <OfflineSyncManager />
        <DebugErrorOverlay />
        {children}
      </body>
    </html>
  );
}
