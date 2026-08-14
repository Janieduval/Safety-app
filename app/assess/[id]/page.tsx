"use client";

import { AssessmentWizardCore } from "../AssessmentWizardCore";

export default function AssessmentWizard({ params }: { params: { id: string } }) {
  return <AssessmentWizardCore id={params.id} />;
}
