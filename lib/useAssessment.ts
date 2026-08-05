"use client";

import { useCallback, useEffect, useState } from "react";

export function useAssessmentData(id: string) {
  const [assessment, setAssessment] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${id}`);
      if (!res.ok) throw new Error("Could not load this assessment.");
      const { assessment } = await res.json();
      setAssessment(assessment);

      const projRes = await fetch(`/api/projects/${assessment.project.qrSlug}`);
      if (projRes.ok) {
        const { project, teams } = await projRes.json();
        setProject(project);
        setTeams(teams);
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { assessment, project, teams, loading, error, reload };
}

// Fire-and-forget autosave with basic status tracking for the UI.
export function useAutosave(assessmentId: string) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = useCallback(
    async (section: string, data: any) => {
      setStatus("saving");
      try {
        const res = await fetch(`/api/assessments/${assessmentId}/autosave`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, data }),
        });
        if (!res.ok) throw new Error("save failed");
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    },
    [assessmentId]
  );

  return { save, status };
}
