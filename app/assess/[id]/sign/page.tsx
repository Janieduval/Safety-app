"use client";

import { useMemo, useState } from "react";
import { useAssessmentData } from "@/lib/useAssessment";
import SignaturePad from "@/components/SignaturePad";
import { SIGNON_CONFIRMATION_TEXT } from "@/lib/constants";

export default function TeamSignOnPage({ params }: { params: { id: string } }) {
  const { assessment, project, loading, error, reload } = useAssessmentData(params.id);
  const [query, setQuery] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const alreadySignedIds = useMemo(
    () => new Set(assessment?.signOns?.map((s: any) => s.workerId) ?? []),
    [assessment]
  );

  const availableWorkers = useMemo(() => {
    if (!project) return [];
    const list = project.workers.filter((w: any) => !alreadySignedIds.has(w.id));
    if (!query.trim()) return list;
    return list.filter((w: any) => w.name.toLowerCase().includes(query.toLowerCase()));
  }, [project, query, alreadySignedIds]);

  if (loading) return <p className="p-6 text-center text-neutral-500">Loading...</p>;
  if (error || !assessment || !project)
    return <p className="p-6 text-center text-red-700">{error ?? "Not found."}</p>;

  const capture = async (dataUrl: string) => {
    if (!selectedWorkerId) return;
    setSaving(true);
    setSignError(null);
    try {
      const res = await fetch(`/api/assessments/${params.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: selectedWorkerId, signatureData: dataUrl }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Could not sign.");
      }
      setSelectedWorkerId(null);
      setQuery("");
      setConfirmed(false);
      reload();
    } catch (e: any) {
      setSignError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-dvh bg-neutral-50 px-4 py-6 max-w-md mx-auto">
      <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide">
        {project.name}
      </p>
      <h1 className="text-xl font-bold text-neutral-900 mt-1">Team sign-on</h1>
      <p className="text-neutral-600 text-sm mt-1">
        {assessment.signOns.length} team member{assessment.signOns.length === 1 ? "" : "s"}{" "}
        signed on
      </p>

      <div className="mt-4 space-y-2">
        {assessment.signOns.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between border border-neutral-200 rounded-lg p-3 bg-white">
            <span className="font-medium text-neutral-800">
              {s.worker.name}
              {s.isPrimary && <span className="ml-2 text-xs text-emerald-700 font-semibold">PRIMARY</span>}
            </span>
            <span className="text-xs text-neutral-500">
              {new Date(s.signedAt).toLocaleTimeString("en-AU")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-neutral-200 pt-5">
        <h2 className="font-semibold text-neutral-900 mb-2">Add your signature</h2>
        <input
          type="text"
          placeholder="Search your name..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedWorkerId(null);
          }}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3"
        />
        {query && !selectedWorkerId && (
          <div className="mt-1 border border-neutral-200 rounded-lg divide-y bg-white max-h-48 overflow-y-auto">
            {availableWorkers.map((w: any) => (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setSelectedWorkerId(w.id);
                  setQuery(w.name);
                }}
                className="w-full text-left px-4 py-3 active:bg-neutral-100"
              >
                {w.name}
              </button>
            ))}
            {availableWorkers.length === 0 && (
              <p className="p-3 text-sm text-neutral-500">No matching worker found.</p>
            )}
          </div>
        )}

        {selectedWorkerId && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-neutral-700">{SIGNON_CONFIRMATION_TEXT}</p>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-5 h-5"
              />
              I confirm I have reviewed and understood this assessment
            </label>
            {confirmed && <SignaturePad onCapture={capture} disabled={saving} />}
            {signError && <p className="text-red-700 text-sm font-medium">{signError}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
