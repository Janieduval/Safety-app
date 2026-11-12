import type { Metadata } from "next";

// Makes the supervisor pages install as their own home-screen app
// ("JSAFE Supervisor"), which opens the supervisor dashboard — not the
// workers' "JSAFE App", which opens the project's worker page.
export const metadata: Metadata = {
  title: "JSAFE Supervisor",
  manifest: "/supervisor-manifest.json",
  appleWebApp: {
    capable: true,
    title: "JSAFE Supervisor",
    statusBarStyle: "default",
  },
};

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
