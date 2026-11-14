import { headers } from "next/headers";
import NewProjectSetup from "@/components/control/NewProjectSetup";
import { PageTop } from "@/components/control/ui";
import { controlKey, ownerEmail } from "@/lib/control/core";
import { listCompanies } from "@/lib/control/data";

// Set up a new project: the checklist with every setting ready to copy.
export const dynamic = "force-dynamic";

export default async function NewProjectPage({ searchParams }: { searchParams: { company?: string } }) {
  const companies = await listCompanies();
  const h = headers();
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const ccUrl = host ? `https://${host.replace(/^https?:\/\//, "")}` : "";

  return (
    <>
      <PageTop
        crumbs={[{ href: "/control", label: "Control centre" }, { label: "Set up a new project" }]}
        title="Set up a new project"
        sub="Follow the steps. When the site is ready, it connects to the control centre by itself."
      />
      <NewProjectSetup
        companies={companies.map((c) => c.name)}
        defaultCompany={searchParams.company ?? companies[0]?.name ?? ""}
        ccUrl={ccUrl}
        ccKey={controlKey()}
        ownerEmail={ownerEmail()}
      />
    </>
  );
}
