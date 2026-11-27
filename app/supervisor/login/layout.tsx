import { SiteInfoProvider } from "@/components/SiteNameBadge";
import { getSiteInfo } from "@/lib/siteInfo";

// Looks up the project and company on the server, so they show on the login
// page straight away instead of popping in a second later. Refreshed every
// 5 minutes, so a renamed project shows up soon after.
export const revalidate = 300;

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const info = await getSiteInfo();
  return <SiteInfoProvider value={info}>{children}</SiteInfoProvider>;
}
