"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ArchiveButton({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

  const archive = async () => {
    if (!confirm("Archive this assessment? It will be moved out of the active list.")) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/archive`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Could not archive this assessment. Try again.");
      }
    } finally {
      setArchiving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={archive}
      disabled={archiving}
      className="text-neutral-500 font-medium hover:underline ml-3 disabled:opacity-50"
    >
      {archiving ? "Archiving..." : "Archive"}
    </button>
  );
}
