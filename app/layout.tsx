import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineSyncManager from "@/components/OfflineSyncManager";
import DebugToolsLoader from "@/components/DebugToolsLoader";
import PullToRefresh from "@/components/PullToRefresh";
import InstallGuide from "@/components/InstallGuide";

export const metadata: Metadata = {
  title: "JSAFE App – Daily Task Safety Awareness",
  description: "Pre-task risk assessment for site workers",
  applicationName: "JSAFE App",
  manifest: "/api/manifest",
  appleWebApp: {
    capable: true,
    title: "JSAFE App",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192_2.png",
    apple: "/icon-192_2.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#047857",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The control centre site (SITE_MODE=control-centre) doesn't need the
  // worker app's extras: offline sync, pull to refresh, the home screen guide.
  const controlCentre = (process.env.SITE_MODE ?? "").trim().toLowerCase() === "control-centre";
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        {!controlCentre && (
          <>
            <OfflineSyncManager />
            <DebugToolsLoader />
            <PullToRefresh />
            <InstallGuide />
          </>
        )}
        {children}
      </body>
    </html>
  );
}
