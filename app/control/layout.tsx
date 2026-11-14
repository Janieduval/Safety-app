import { notFound, redirect } from "next/navigation";
import ControlShell from "@/components/control/ControlShell";
import { isControlCentre, isControlOwner } from "@/lib/control/core";
import { listCompanies } from "@/lib/control/data";

// Only on the control centre site (SITE_MODE=control-centre), only for the owner.
export const dynamic = "force-dynamic";

export const metadata = { title: "JSAFE Control centre" };

export default async function ControlLayout({ children }: { children: React.ReactNode }) {
  if (!isControlCentre()) notFound();
  if (!(await isControlOwner())) redirect("/control-login");
  const companies = await listCompanies();
  return <ControlShell companies={companies.map((c) => ({ id: c.id, name: c.name, color: c.color }))}>{children}</ControlShell>;
}
