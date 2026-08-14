"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AssessmentWizardCore } from "../AssessmentWizardCore";

// This route's address never changes (unlike /assess/[id], where every
// offline-started assessment gets a brand-new, never-seen-before address).
// That's what makes it possible to cache in advance and actually open with
// zero signal — the specific local assessment to load is passed as a
// query string instead of being part of the address itself.
function OfflineAssessmentInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <p className="text-center text-neutral-600">
          No offline assessment selected. Go back to the project page and start a new
          assessment.
        </p>
      </div>
    );
  }

  return <AssessmentWizardCore id={id} />;
}

export default function OfflineAssessmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center px-6">
          <p className="text-center text-neutral-600">Loading...</p>
        </div>
      }
    >
      <OfflineAssessmentInner />
    </Suspense>
  );
}
