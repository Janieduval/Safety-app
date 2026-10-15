import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineSyncManager from "@/components/OfflineSyncManager";
import DebugToolsLoader from "@/components/DebugToolsLoader";
export const metadata: Metadata = {
  title: "JSAFE App – Daily Task Safety Awareness",
  description: "Pre-task risk assessment for site workers",
  applicationName: "JSAFE App",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "JSAFE App",
    statusBarStyle: "default",
  },
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
        <OfflineSyncManager />
        <DebugToolsLoader />
        {children}
      </body>
    </html>
  );
}
