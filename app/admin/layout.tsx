import type { Metadata } from "next";

// Makes the admin pages install as their own home-screen app ("JSAFE Admin"),
// separate from the workers' "JSAFE App", which opens the project page.
export const metadata: Metadata = {
  title: "JSAFE Admin",
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    title: "JSAFE Admin",
    statusBarStyle: "default",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
