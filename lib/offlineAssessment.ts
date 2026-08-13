// Builds a fresh assessment object shaped exactly like what the server
// would return, so every wizard step component can read it the same way
// whether the assessment is local (offline) or server-backed (online).
import { getLocalAssessment, saveLocalAssessment } from "./offlineStore";
import { SIGNON_CONFIRMATION_TEXT, STEP1_QUESTIONS, HAZARD_QUESTIONS, FINAL_DECLARATIONS } from "./constants";

export function buildSkeletonAssessment({
  localId,
  projectId,
  worker,
}: {
  localId: string;
  projectId: string;
  worker: { id: string; name: string };
}) {
  const now = new Date().toISOString();
  return {
    id: localId,
    status: "draft",
    version: 1,
    projectId,
    dateTime: now,
    teamId: null,
    otherTeamText: "",
    location: "",
    taskDescription: "",
    completedByWorkerId: worker.id,
    completedByWorker: { id: worker.id, name: worker.name },
    step1Responses: [],
    swms: [],
    swmsOtherText: "",
    ppe: [],
    ppeOtherText: "",
    permitRequired: false,
    permits: [],
    permitOtherText: "",
    accessCheck: null,
    changeEntries: [],
    hazardResponses: [],
    newHazardFlag: null,
    declarations: [],
    signOns: [],
    supervisorReviews: [],
  };
}

function genLocalEntityId() {
  return `local-${crypto.randomUUID()}`;
}

// Applies the same per-section merge logic as the server's autosave route
// (app/api/assessments/[id]/autosave/route.ts), but against a local,
// in-memory assessment object instead of the database. Keeping this in
// lockstep with that route is what makes offline and online behave the
// same way from the wizard's point of view.
export function applyLocalSection(current: any, section: string, data: any): any {
  const next = { ...current };

  switch (section) {
    case "header": {
      next.dateTime = data.dateTime ?? next.dateTime;
      next.teamId = data.teamId ?? next.teamId;
      next.otherTeamText = data.otherTeamText ?? next.otherTeamText;
      next.location = data.location ?? next.location;
      next.taskDescription = data.taskDescription ?? next.taskDescription;
      break;
    }

    case "step1": {
      const list = [...next.step1Responses];
      const idx = list.findIndex((r: any) => r.questionKey === data.questionKey);
      const entry = {
        id: idx >= 0 ? list[idx].id : genLocalEntityId(),
        questionKey: data.questionKey,
        answer: data.answer,
        noDetails: data.noDetails ?? null,
        spokenToSupervisor: data.spokenToSupervisor ?? false,
      };
      if (idx >= 0) list[idx] = entry;
      else list.push(entry);
      next.step1Responses = list;
      break;
    }

    case "swms": {
      next.swms = (data.swmsOptionIds ?? []).map((id: string) => ({ swmsOptionId: id }));
      next.swmsOtherText = data.otherText ?? null;
      break;
    }

    case "ppe": {
      next.ppe = (data.ppeOptionIds ?? []).map((id: string) => ({ ppeOptionId: id }));
      next.ppeOtherText = data.otherText ?? null;
      break;
    }

    case "permits": {
      next.permitRequired = data.required;
      next.permitOtherText = data.otherText ?? null;
      next.permits = data.required
        ? (data.permits ?? []).map((p: any) => ({
            id: genLocalEntityId(),
            permitTypeId: p.permitTypeId,
            referenceNumber: p.referenceNumber ?? null,
            issuedReviewedSigned: !!p.issuedReviewedSigned,
          }))
        : [];
      break;
    }

    case "accessCheck": {
      next.accessCheck = {
        safe: data.safe,
        details: data.details ?? null,
        controlMeasure: data.controlMeasure ?? null,
      };
      break;
    }

    case "changeEntry": {
      const entries = [...next.changeEntries];
      if (data.id) {
        const idx = entries.findIndex((c: any) => c.id === data.id);
        if (idx >= 0) {
          entries[idx] = {
            ...entries[idx],
            category: data.category,
            details: data.details,
            controls: data.controls,
            photoUrl: data.photoUrl ?? null,
            controlled: !!data.controlled,
          };
        }
      } else {
        entries.push({
          id: genLocalEntityId(),
          category: data.category,
          details: data.details,
          controls: data.controls,
          photoUrl: data.photoUrl ?? null,
          controlled: !!data.controlled,
        });
      }
      next.changeEntries = entries;
      break;
    }

    case "deleteChangeEntry": {
      next.changeEntries = next.changeEntries.filter((c: any) => c.id !== data.id);
      break;
    }

    case "hazardResponse": {
      const list = [...next.hazardResponses];
      const idx = list.findIndex((r: any) => r.questionKey === data.questionKey);
      if (idx >= 0) {
        list[idx] = { ...list[idx], present: data.present };
      } else {
        list.push({
          id: genLocalEntityId(),
          questionKey: data.questionKey,
          present: data.present,
          cards: [],
        });
      }
      next.hazardResponses = list;
      break;
    }

    case "hazardCard": {
      next.hazardResponses = next.hazardResponses.map((r: any) => {
        if (r.id !== data.hazardResponseId) return r;
        const cards = [...r.cards];
        if (data.id) {
          const idx = cards.findIndex((c: any) => c.id === data.id);
          if (idx >= 0) {
            cards[idx] = {
              ...cards[idx],
              description: data.description,
              initialRisk: data.initialRisk,
              controls: data.controls,
              responsiblePerson: data.responsiblePerson,
              controlConfirmed: !!data.controlConfirmed,
              residualRisk: data.residualRisk,
              photoUrl: data.photoUrl ?? null,
              comments: data.comments ?? null,
            };
          }
        } else {
          cards.push({
            id: genLocalEntityId(),
            description: data.description ?? "",
            initialRisk: data.initialRisk ?? "low",
            controls: data.controls ?? "",
            responsiblePerson: data.responsiblePerson ?? "",
            controlConfirmed: !!data.controlConfirmed,
            residualRisk: data.residualRisk ?? "low",
            photoUrl: data.photoUrl ?? null,
            comments: data.comments ?? null,
          });
        }
        return { ...r, cards };
      });
      break;
    }

    case "deleteHazardCard": {
      next.hazardResponses = next.hazardResponses.map((r: any) => ({
        ...r,
        cards: r.cards.filter((c: any) => c.id !== data.id),
      }));
      break;
    }

    case "declaration": {
      const list = [...next.declarations];
      const idx = list.findIndex((d: any) => d.declarationKey === data.declarationKey);
      const entry = {
        id: idx >= 0 ? list[idx].id : genLocalEntityId(),
        declarationKey: data.declarationKey,
        checked: !!data.checked,
        checkedAt: data.checked ? new Date().toISOString() : null,
      };
      if (idx >= 0) list[idx] = entry;
      else list.push(entry);
      next.declarations = list;
      break;
    }

    case "newHazardFlag": {
      next.newHazardFlag = {
        present: data.present,
        description: data.description ?? null,
        immediateControls: data.immediateControls ?? null,
      };
      break;
    }

    default:
      break;
  }

  return next;
}

// Mirrors the server's sign route (app/api/assessments/[id]/sign/route.ts):
// rejects a duplicate sign-on for the same worker + version, otherwise
// records a new local sign-on. Reads and writes the local record directly
// since this isn't a "section" the wizard autosaves through — it's called
// straight from the signature capture flow.
export async function signLocalAssessment(
  localId: string,
  args: { workerId: string; workerName: string; signatureData: string; isPrimary?: boolean }
): Promise<{ signOn: any }> {
  const local = await getLocalAssessment(localId);
  if (!local) {
    throw new Error("This offline assessment could not be found on this device.");
  }
  const data = local.data;
  const alreadySigned = (data.signOns ?? []).some(
    (s: any) => s.workerId === args.workerId && s.version === data.version
  );
  if (alreadySigned) {
    throw new Error("This worker has already signed this version of the assessment.");
  }
  const signOn = {
    id: genLocalEntityId(),
    assessmentId: localId,
    workerId: args.workerId,
    worker: { id: args.workerId, name: args.workerName },
    version: data.version,
    signatureData: args.signatureData,
    confirmationText: SIGNON_CONFIRMATION_TEXT,
    isPrimary: !!args.isPrimary,
    signedAt: new Date().toISOString(),
  };
  const next = { ...data, signOns: [...(data.signOns ?? []), signOn] };
  await saveLocalAssessment({ ...local, data: next });
  return { signOn };
}

// Mirrors lib/validation.ts's canSubmitWorkerAssessment, but runs entirely
// against the local, in-memory assessment — so a worker gets the same
// "this can't be submitted yet" feedback offline as they would online,
// rather than only finding out once signal returns and the real sync
// (which still runs the authoritative server-side check) happens.
export function validateLocalAssessmentForSubmit(data: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const q of STEP1_QUESTIONS) {
    const r = (data.step1Responses ?? []).find((x: any) => x.questionKey === q.key);
    if (!r || r.answer === null || r.answer === undefined) {
      errors.push(`Step 1: "${q.label}" has not been answered.`);
      continue;
    }
    if (r.answer === false) {
      if (!r.noDetails || !r.spokenToSupervisor) {
        errors.push(
          `Step 1: "${q.label}" was answered No and must include details and confirmation that a supervisor was spoken to before this can be submitted.`
        );
      }
    }
  }

  if (!data.accessCheck || data.accessCheck.safe === null || data.accessCheck.safe === undefined) {
    errors.push("Access route safety check has not been answered.");
  } else if (data.accessCheck.safe === false) {
    if (!data.accessCheck.details || !data.accessCheck.controlMeasure) {
      errors.push(
        "Unsafe access route requires details and a control/alternative route before submission."
      );
    }
  }

  if ((data.swms ?? []).length === 0) {
    errors.push("At least one SWMS must be selected.");
  }

  if (data.permitRequired) {
    if ((data.permits ?? []).length === 0) {
      errors.push("A permit was marked required but none was selected.");
    }
    for (const p of data.permits ?? []) {
      if (!p.issuedReviewedSigned) {
        errors.push("All selected permits must be confirmed as issued, reviewed and signed.");
      }
    }
  }

  for (const hq of HAZARD_QUESTIONS) {
    const hr = (data.hazardResponses ?? []).find((x: any) => x.questionKey === hq.key);
    if (!hr || hr.present === null || hr.present === undefined) {
      errors.push(`Hazard question "${hq.label}" has not been answered.`);
      continue;
    }
    if (hr.present === true) {
      if ((hr.cards ?? []).length === 0) {
        errors.push(`Hazard question "${hq.label}" was answered Yes but has no hazard detail card.`);
      }
      for (const c of hr.cards ?? []) {
        if (!c.description || !c.controls || !c.responsiblePerson) {
          errors.push(`A hazard card under "${hq.label}" is missing required fields.`);
        }
        if (!c.controlConfirmed) {
          errors.push(`A hazard card under "${hq.label}" has not confirmed its control is implemented.`);
        }
      }
    }
  }

  if (data.newHazardFlag?.present) {
    if (!data.newHazardFlag.description || !data.newHazardFlag.immediateControls) {
      errors.push(
        "A new hazard not covered by SWMS was flagged but is missing description or immediate controls."
      );
    }
  }

  for (const d of FINAL_DECLARATIONS) {
    const rec = (data.declarations ?? []).find((x: any) => x.declarationKey === d.key);
    if (!rec || !rec.checked) {
      errors.push(`Declaration not confirmed: "${d.label}"`);
    }
  }

  const primarySigned = (data.signOns ?? []).some((s: any) => s.isPrimary);
  if (!primarySigned) {
    errors.push("The person completing the assessment has not signed.");
  }

  return { ok: errors.length === 0, errors };
}
