"use client";

import { useState } from "react";

// Logs the admin out, then goes to the login page.
export default function AdminLogoutButton({ className = "" }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" });
      // If this route only accepts GET, try that instead.
      if (res.status === 405) {
        await fetch("/api/admin/logout");
      }
    } catch {
      // Even if the request fails, still send them to the login page.
    }
    window.location.href = "/admin/login";
  };

  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      {busy ? "Logging out..." : "Log out"}
    </button>
  );
}
