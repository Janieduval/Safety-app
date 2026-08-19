"use client";
import { useState } from "react";

// Copies a link that opens the assessment read-only but still allows
// adding a team member's signature — for someone who needs to sign on
// after the fact, later the same day, once the assessment has already
// moved past draft status.
export default function CopySignOnLinkButton({ assessmentId }: { assessmentId: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = `${window.location.origin}/assess/${assessmentId}?view=1`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (e.g. permissions) — fall back to a
      // prompt so the link can still be copied manually.
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={copyLink}
      className="text-neutral-500 font-medium hover:underline ml-3"
    >
      {copied ? "Copied!" : "Copy sign-on link"}
    </button>
  );
}
