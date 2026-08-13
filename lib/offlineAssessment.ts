// Builds a fresh assessment object shaped exactly like what the server
// would return, so every wizard step component can read it the same way
// whether the assessment is local (offline) or server-backed (online).
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
