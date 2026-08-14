"use client";
import { useCallback, useEffect, useState } from "react";
import {
  getLocalAssessment,
  saveLocalAssessment,
  getProjectReference,
  isLocalId,
} from "./offlineStore";
import { applyLocalSection } from "./offlineAssessment";

export function useAssessmentData(id: string) {
  const [assessment, setAssessment] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Lightweight refresh used after most in-session actions (answering a
  // question, adding a hazard card, etc). Only re-fetches the assessment
  // itself — not the project's worker/SWMS/PPE lists, which don't change
  // from these actions — and crucially does NOT toggle the page-level
  // loading flag, so the screen doesn't flash back to a full loading state
  // on every click.
  const reloadAssessment = useCallback(async () => {
    if (isLocalId(id)) {
      try {
        const local = await getLocalAssessment(id);
        if (!local) throw new Error("This offline assessment could not be found on this device.");
        setAssessment(local.data);
      } catch (e: any) {
        setError(
          e.message === "This offline assessment could not be found on this device."
            ? e.message
            : "Couldn't load this offline assessment from your device. Try reopening the app."
        );
      }
      return;
    }
    try {
      const res = await fetch(`/api/assessments/${id}`);
      if (!res.ok) throw new Error("Could not load this assessment.");
      const { assessment } = await res.json();
      setAssessment(assessment);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong.");
    }
  }, [id]);
  // Full reload: assessment + project + teams, with the loading flag.
  // Used only for the initial page load.
  const reload = useCallback(async () => {
    setLoading(true);
    if (isLocalId(id)) {
      try {
        const local = await getLocalAssessment(id);
        if (!local) throw new Error("This offline assessment could not be found on this device.");
        setAssessment(local.data);
        const ref = await getProjectReference(local.data.projectId);
        if (ref) {
          setProject(ref.project);
          setTeams(ref.teams ?? []);
        } else {
          setError(
            "This project's details weren't found on this device, so some options may be missing."
          );
        }
      } catch (e: any) {
        setError(
          e.message === "This offline assessment could not be found on this device."
            ? e.message
            : "Couldn't load this offline assessment from your device. Try reopening the app."
        );
      } finally {
        setLoading(false);
      }
      return;
    }
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
  return { assessment, project, teams, loading, error, reload, reloadAssessment };
}

// Fire-and-forget autosave with basic status tracking for the UI.
export function useAutosave(assessmentId: string) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = useCallback(
    async (section: string, data: any) => {
      setStatus("saving");
      if (isLocalId(assessmentId)) {
        try {
          const local = await getLocalAssessment(assessmentId);
          if (!local) throw new Error("not found");
          const updatedData = applyLocalSection(local.data, section, data);
          await saveLocalAssessment({ ...local, data: updatedData });
          setStatus("saved");
        } catch {
          setStatus("error");
        }
        return;
      }
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
