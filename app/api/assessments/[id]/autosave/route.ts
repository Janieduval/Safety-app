import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// A single autosave endpoint the client debounces calls to. `section` selects
// which part of the form is being updated so we only touch relevant rows.
// This keeps the client simple (one save function) while server-side writes
// stay scoped and auditable.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const assessment = await prisma.assessment.findUnique({ where: { id: params.id } });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }
  if (assessment.status !== "draft" && assessment.status !== "changes_required") {
    return NextResponse.json(
      { error: "This assessment is no longer editable by the worker." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const { section, data } = body as { section: string; data: any };

  switch (section) {
    case "header": {
      await prisma.assessment.update({
        where: { id: params.id },
        data: {
          dateTime: data.dateTime ? new Date(data.dateTime) : undefined,
          teamId: data.teamId ?? undefined,
          otherTeamText: data.otherTeamText ?? undefined,
          location: data.location ?? undefined,
          taskDescription: data.taskDescription ?? undefined,
        },
      });
      break;
    }

    case "step1": {
      // data: { questionKey, answer, noDetails?, spokenToSupervisor? }
      await prisma.step1Response.update({
        where: { assessmentId_questionKey: { assessmentId: params.id, questionKey: data.questionKey } },
        data: {
          answer: data.answer,
          noDetails: data.noDetails ?? null,
          spokenToSupervisor: data.spokenToSupervisor ?? false,
        },
      });
      break;
    }

    case "swms": {
      // data: { swmsOptionIds: string[], otherText?: string }
      await prisma.assessmentSwms.deleteMany({ where: { assessmentId: params.id } });
      if (data.swmsOptionIds?.length) {
        await prisma.assessmentSwms.createMany({
          data: data.swmsOptionIds.map((id: string) => ({
            assessmentId: params.id,
            swmsOptionId: id,
          })),
        });
      }
      await prisma.assessment.update({
        where: { id: params.id },
        data: { swmsOtherText: data.otherText ?? null },
      });
      break;
    }

    case "ppe": {
      await prisma.assessmentPpe.deleteMany({ where: { assessmentId: params.id } });
      if (data.ppeOptionIds?.length) {
        await prisma.assessmentPpe.createMany({
          data: data.ppeOptionIds.map((id: string) => ({
            assessmentId: params.id,
            ppeOptionId: id,
          })),
        });
      }
      await prisma.assessment.update({
        where: { id: params.id },
        data: { ppeOtherText: data.otherText ?? null },
      });
      break;
    }

    case "permits": {
      // data: { required: boolean, otherText?, permits: [{ permitTypeId, referenceNumber, issuedReviewedSigned, attachmentUrl }] }
      await prisma.assessment.update({
        where: { id: params.id },
        data: { permitRequired: data.required, permitOtherText: data.otherText ?? null },
      });
      await prisma.assessmentPermit.deleteMany({ where: { assessmentId: params.id } });
      if (data.required && data.permits?.length) {
        for (const p of data.permits) {
          await prisma.assessmentPermit.create({
            data: {
              assessmentId: params.id,
              permitTypeId: p.permitTypeId,
              referenceNumber: p.referenceNumber ?? null,
              issuedReviewedSigned: !!p.issuedReviewedSigned,
              attachmentUrl: p.attachmentUrl ?? null,
            },
          });
        }
      }
      break;
    }

    case "accessCheck": {
      await prisma.accessCheck.update({
        where: { assessmentId: params.id },
        data: {
          safe: data.safe,
          details: data.details ?? null,
          controlMeasure: data.controlMeasure ?? null,
          supervisorReviewRequired: data.safe === false,
        },
      });
      break;
    }

    case "changeEntry": {
      // data: { id?: existing id to update, category, details, controls, photoUrl?, controlled }
      if (data.id) {
        await prisma.changeEntry.update({
          where: { id: data.id },
          data: {
            category: data.category,
            details: data.details,
            controls: data.controls,
            photoUrl: data.photoUrl ?? null,
            controlled: !!data.controlled,
          },
        });
      } else {
        await prisma.changeEntry.create({
          data: {
            assessmentId: params.id,
            category: data.category,
            details: data.details,
            controls: data.controls,
            photoUrl: data.photoUrl ?? null,
            controlled: !!data.controlled,
          },
        });
      }
      break;
    }

    case "deleteChangeEntry": {
      await prisma.changeEntry.delete({ where: { id: data.id } });
      break;
    }

    case "hazardResponse": {
      // data: { questionKey, present }
      await prisma.hazardResponse.update({
        where: {
          assessmentId_questionKey: { assessmentId: params.id, questionKey: data.questionKey },
        },
        data: { present: data.present },
      });
      break;
    }

    case "hazardCard": {
      // data: { hazardResponseId, id? (existing card), description, initialRisk, controls,
      //         responsiblePerson, controlConfirmed, residualRisk, photoUrl?, comments? }
      if (data.id) {
        await prisma.hazardCard.update({
          where: { id: data.id },
          data: {
            description: data.description,
            initialRisk: data.initialRisk,
            controls: data.controls,
            responsiblePerson: data.responsiblePerson,
            controlConfirmed: !!data.controlConfirmed,
            residualRisk: data.residualRisk,
            photoUrl: data.photoUrl ?? null,
            comments: data.comments ?? null,
          },
        });
      } else {
        await prisma.hazardCard.create({
          data: {
            hazardResponseId: data.hazardResponseId,
            description: data.description ?? "",
            initialRisk: data.initialRisk ?? "low",
            controls: data.controls ?? "",
            responsiblePerson: data.responsiblePerson ?? "",
            controlConfirmed: !!data.controlConfirmed,
            residualRisk: data.residualRisk ?? "low",
            photoUrl: data.photoUrl ?? null,
            comments: data.comments ?? null,
          },
        });
      }
      break;
    }

    case "deleteHazardCard": {
      await prisma.hazardCard.delete({ where: { id: data.id } });
      break;
    }

    case "declaration": {
      // data: { declarationKey, checked }
      await prisma.declaration.update({
        where: {
          assessmentId_declarationKey: {
            assessmentId: params.id,
            declarationKey: data.declarationKey,
          },
        },
        data: {
          checked: !!data.checked,
          checkedAt: data.checked ? new Date() : null,
        },
      });
      break;
    }

    case "newHazardFlag": {
      await prisma.newHazardFlag.update({
        where: { assessmentId: params.id },
        data: {
          present: data.present,
          description: data.description ?? null,
          immediateControls: data.immediateControls ?? null,
        },
      });
      break;
    }

    default:
      return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  }

  await prisma.assessment.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}
