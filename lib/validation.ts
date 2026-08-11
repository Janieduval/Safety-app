import { prisma } from "./prisma";
import { STEP1_QUESTIONS, HAZARD_QUESTIONS, FINAL_DECLARATIONS } from "./constants";

export type ValidationResult = { ok: boolean; errors: string[] };

/**
 * Full server-side re-check before an assessment can move to worker_completed.
 * Mirrors client-side validation but must never be bypassed by client state.
 */
export async function canSubmitWorkerAssessment(
  assessmentId: string
): Promise<ValidationResult> {
  const errors: string[] = [];

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      step1Responses: true,
      accessCheck: true,
      hazardResponses: { include: { cards: true } },
      declarations: true,
      signOns: true,
      swms: true,
      permits: true,
      newHazardFlag: true,
    },
  });

  if (!assessment) return { ok: false, errors: ["Assessment not found."] };

  // Step 1 — every question answered; "No" requires details + supervisor confirmation
  for (const q of STEP1_QUESTIONS) {
    const r = assessment.step1Responses.find((x) => x.questionKey === q.key);
    if (!r || r.answer === null || r.answer === undefined) {
      errors.push(`Step 1: "${q.label}" has not been answered.`);
      continue;
    }
    if (r.answer === false && !r.resolvedAt) {
      if (!r.noDetails || !r.spokenToSupervisor) {
        errors.push(
          `Step 1: "${q.label}" was answered No and must include details and confirmation that a supervisor was spoken to before this can be submitted.`
        );
      }
    }
  }

  // Access check
  if (!assessment.accessCheck || assessment.accessCheck.safe === null) {
    errors.push("Access route safety check has not been answered.");
  } else if (assessment.accessCheck.safe === false) {
    if (!assessment.accessCheck.details || !assessment.accessCheck.controlMeasure) {
      errors.push(
        "Unsafe access route requires details and a control/alternative route before submission."
      );
    }
    // Access issues always require supervisor review regardless of controls entered
    errors.push(
      "__REQUIRES_SUPERVISOR_REVIEW__:Unsafe access route must be reviewed by a supervisor."
    );
  }

  // SWMS — at least one selection
  if (assessment.swms.length === 0) {
    errors.push("At least one SWMS must be selected.");
  }

  // Permits
  if (assessment.permitRequired) {
    if (assessment.permits.length === 0) {
      errors.push("A permit was marked required but none was selected.");
    }
    for (const p of assessment.permits) {
      if (!p.issuedReviewedSigned) {
        errors.push(
          "All selected permits must be confirmed as issued, reviewed and signed."
        );
      }
    }
  }

  // Hazards
  let hasHighOrExtremeResidual = false;
  for (const hq of HAZARD_QUESTIONS) {
    const hr = assessment.hazardResponses.find((x) => x.questionKey === hq.key);
    if (!hr || hr.present === null || hr.present === undefined) {
      errors.push(`Hazard question "${hq.label}" has not been answered.`);
      continue;
    }
    if (hr.present === true) {
      if (hr.cards.length === 0) {
        errors.push(
          `Hazard question "${hq.label}" was answered Yes but has no hazard detail card.`
        );
      }
      for (const c of hr.cards) {
        if (!c.description || !c.controls || !c.responsiblePerson) {
          errors.push(`A hazard card under "${hq.label}" is missing required fields.`);
        }
        if (!c.controlConfirmed) {
          errors.push(
            `A hazard card under "${hq.label}" has not confirmed its control is implemented.`
          );
        }
        if (c.residualRisk === "high" || c.residualRisk === "extreme") {
          hasHighOrExtremeResidual = true;
        }
      }
    }
  }
  if (hasHighOrExtremeResidual) {
    errors.push(
      "__REQUIRES_SUPERVISOR_REVIEW__:A hazard has a High or Extreme residual risk rating and requires supervisor intervention before this task can proceed."
    );
  }

  // New hazard not covered by SWMS
  if (assessment.newHazardFlag?.present) {
    if (!assessment.newHazardFlag.description || !assessment.newHazardFlag.immediateControls) {
      errors.push(
        "A new hazard not covered by SWMS was flagged but is missing description or immediate controls."
      );
    }
    errors.push(
      "__REQUIRES_SUPERVISOR_REVIEW__:A new hazard not covered by an existing SWMS was identified and must be reviewed by a supervisor."
    );
  }

  // Declarations — all four must be actively checked
  for (const d of FINAL_DECLARATIONS) {
    const rec = assessment.declarations.find((x) => x.declarationKey === d.key);
    if (!rec || !rec.checked) {
      errors.push(`Declaration not confirmed: "${d.label}"`);
    }
  }

  // Primary signature
  const primarySigned = assessment.signOns.some((s) => s.isPrimary);
  if (!primarySigned) {
    errors.push("The person completing the assessment has not signed.");
  }

  const blockingErrors = errors.filter((e) => !e.startsWith("__REQUIRES_SUPERVISOR_REVIEW__"));

  return { ok: blockingErrors.length === 0, errors };
}

/**
 * Checks whether an assessment can move to "approved" — requires a completed
 * SupervisorReview with decision "approved", and that no unresolved stop-work
 * or new-SWMS-gap issues remain.
 */
export async function canApproveAssessment(assessmentId: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { supervisorReviews: true, newHazardFlag: true },
  });
  if (!assessment) return { ok: false, errors: ["Assessment not found."] };

  const latestReview =
    assessment.supervisorReviews.length > 0
      ? assessment.supervisorReviews.reduce((latest, r) =>
          r.version > latest.version ? r : latest
        )
      : null;

  if (!latestReview || latestReview.decision !== "approved") {
    errors.push("A completed supervisor review with an approval decision is required.");
  }
  if (assessment.newHazardFlag?.present && !assessment.newHazardFlag.resolved) {
    errors.push("A flagged new hazard outside current SWMS has not been resolved.");
  }

  return { ok: errors.length === 0, errors };
}
