// Per-site switches, set as Environment Variables in each Vercel project.
// Leaving one out keeps the usual behaviour, so other sites don't change.

// SUPERVISORS_CAN_CHOOSE_TEAMS=no  → only admins set supervisors' teams
// (on the People page). Supervisors still see their teams and can turn on
// notifications, but can't change them.
export function supervisorsCanChooseTeams(): boolean {
  return (process.env.SUPERVISORS_CAN_CHOOSE_TEAMS ?? "").trim().toLowerCase() !== "no";
}

// OWNER_ADMIN_EMAIL=<your admin login email> → the site owner's admin login
// (the control centre's "Open admin" logs in as this). Left out, every admin
// counts as the owner.
export function isSiteOwner(adminEmail: string | null | undefined): boolean {
  if (!adminEmail) return false;
  const owner = (process.env.OWNER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  return !owner || adminEmail.trim().toLowerCase() === owner;
}

// COMPANY=<company name> → shown with the project name on the login pages and
// at the top of the dashboards (and used by the control centre).
export function siteCompany(): string | null {
  return (process.env.COMPANY ?? "").replace(/\s+/g, " ").trim() || null;
}
