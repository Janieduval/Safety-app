"use client";
import {
  getPendingLocalAssessments,
  saveLocalAssessment,
  deleteLocalAssessment,
  LocalAssessment,
} from "./offlineStore";

async function patchAutosave(realId: string, section: string, data: any) {
  return fetch(`/api/assessments/${realId}/autosave`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, data }),
  });
}

// Pushes one locally-built assessment to the server by replaying it through
// the same routes the app already uses when online (create, autosave,
// sign, submit) — rather than a separate bulk-upload endpoint — so offline
// and online produce identical results with no duplicated business logic.
async function syncOneAssessment(local: LocalAssessment): Promise<void> {
  const data = local.data;

  // 1. Create the real assessment on the server.
  const createRes = await fetch("/api/assessments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: data.projectId,
      completedByWorkerId: data.completedByWorkerId,
    }),
  });
  if (!createRes.ok) throw new Error("Could not create the assessment on the server.");
  const { assessment: created } = await createRes.json();
  const realId = created.id;

  // 2. Read it back fully populated so we know the real hazardResponse ids
  //    (the server pre-seeds one row per hazard question at creation time)
  //    to attach hazard cards to.
  const getRes = await fetch(`/api/assessments/${realId}`);
  if (!getRes.ok) throw new Error("Could not read back the newly created assessment.");
  const { assessment: full } = await getRes.json();
  const hazardResponseIdByKey: Record<string, string> = {};
  for (const r of full.hazardResponses ?? []) {
    hazardResponseIdByKey[r.questionKey] = r.id;
  }

  // 3. Header
  await patchAutosave(realId, "header", {
    dateTime: data.dateTime,
    teamId: data.teamId,
    otherTeamText: data.otherTeamText,
    location: data.location,
    taskDescription: data.taskDescription,
  });

  // 4. Step 1
  for (const r of data.step1Responses ?? []) {
    await patchAutosave(realId, "step1", {
      questionKey: r.questionKey,
      answer: r.answer,
      noDetails: r.noDetails,
      spokenToSupervisor: r.spokenToSupervisor,
    });
  }

  // 5. SWMS
  await patchAutosave(realId, "swms", {
    swmsOptionIds: (data.swms ?? []).map((s: any) => s.swmsOptionId),
    otherText: data.swmsOtherText,
  });

  // 6. PPE
  await patchAutosave(realId, "ppe", {
    ppeOptionIds: (data.ppe ?? []).map((p: any) => p.ppeOptionId),
    otherText: data.ppeOtherText,
  });

  // 7. Permits
  await patchAutosave(realId, "permits", {
    required: !!data.permitRequired,
    otherText: data.permitOtherText,
    permits: (data.permits ?? []).map((p: any) => ({
      permitTypeId: p.permitTypeId,
      referenceNumber: p.referenceNumber,
      issuedReviewedSigned: p.issuedReviewedSigned,
    })),
  });

  // 8. Access check
  if (data.accessCheck) {
    await patchAutosave(realId, "accessCheck", {
      safe: data.accessCheck.safe,
      details: data.accessCheck.details,
      controlMeasure: data.accessCheck.controlMeasure,
    });
  }

  // 9. Change entries — always created fresh (local IDs were placeholders)
  for (const c of data.changeEntries ?? []) {
    await patchAutosave(realId, "changeEntry", {
      category: c.category,
      details: c.details,
      controls: c.controls,
      photoUrl: c.photoUrl,
      controlled: c.controlled,
    });
  }

  // 10. Hazard responses + their cards
  for (const r of data.hazardResponses ?? []) {
    await patchAutosave(realId, "hazardResponse", {
      questionKey: r.questionKey,
      present: r.present,
    });
    const realHazardResponseId = hazardResponseIdByKey[r.questionKey];
    for (const c of r.cards ?? []) {
      await patchAutosave(realId, "hazardCard", {
        hazardResponseId: realHazardResponseId,
        description: c.description,
        initialRisk: c.initialRisk,
        controls: c.controls,
        responsiblePerson: c.responsiblePerson,
        controlConfirmed: c.controlConfirmed,
        residualRisk: c.residualRisk,
        photoUrl: c.photoUrl,
        comments: c.comments,
      });
    }
  }

  // 11. New hazard flag
  if (data.newHazardFlag) {
    await patchAutosave(realId, "newHazardFlag", {
      present: data.newHazardFlag.present,
      description: data.newHazardFlag.description,
      immediateControls: data.newHazardFlag.immediateControls,
    });
  }

  // 12. Declarations
  for (const d of data.declarations ?? []) {
    await patchAutosave(realId, "declaration", {
      declarationKey: d.declarationKey,
      checked: d.checked,
    });
  }

  // 13. Sign-ons — primary first
  const signOns = [...(data.signOns ?? [])].sort(
    (a: any, b: any) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0)
  );
  for (const s of signOns) {
    const res = await fetch(`/api/assessments/${realId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workerId: s.workerId,
        signatureData: s.signatureData,
        isPrimary: s.isPrimary,
      }),
    });
    // 409 = already signed — safe to ignore if this is a retry.
    if (!res.ok && res.status !== 409) {
      throw new Error("Could not save a signature during sync.");
    }
  }

  // 14. Submit, if the worker hit Submit while offline
  if (local.syncStatus === "pending_submit") {
    const res = await fetch(`/api/assessments/${realId}/submit`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body.errors ?? ["Could not submit this assessment after syncing."]).join(" ")
      );
    }
  }

  // 15. Done — the server now has everything, so the local copy is removed.
  await deleteLocalAssessment(local.id);
}

let syncing = false;

// Call this whenever the app might have a connection again. Safe to call
// often — it no-ops if already offline or already mid-sync, and each
// assessment's failure is isolated so one bad record can't block the rest.
export async function syncPendingAssessments(): Promise<void> {
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  syncing = true;
  try {
    const pending = await getPendingLocalAssessments();
    for (const local of pending) {
      try {
        await syncOneAssessment(local);
      } catch (e: any) {
        await saveLocalAssessment({
          ...local,
          syncStatus: "sync_error",
          syncError: e.message ?? "Sync failed.",
        });
      }
    }
  } finally {
    syncing = false;
  }
}
