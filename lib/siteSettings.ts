// Per-site switches, set as Environment Variables in each Vercel project.
// Leaving one out keeps the usual behaviour, so other sites don't change.

// SUPERVISORS_CAN_CHOOSE_TEAMS=no  → only admins set supervisors' teams
// (on the People page). Supervisors still see their teams and can turn on
// notifications, but can't change them.
export function supervisorsCanChooseTeams(): boolean {
  return (process.env.SUPERVISORS_CAN_CHOOSE_TEAMS ?? "").trim().toLowerCase() !== "no";
}

// OWNER_ADMIN_EMAIL=<your admin login email> → only that admin login sees the
// Suggestions page. Left out, every admin sees it.
export function isSiteOwner(adminEmail: string | null | undefined): boolean {
  if (!adminEmail) return false;
  const owner = (process.env.OWNER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  return !owner || adminEmail.trim().toLowerCase() === owner;
}
