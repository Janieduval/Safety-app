import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma singleton so validation logic can be tested against
// in-memory fixtures without a real database connection.
let mockAssessment: any = null;

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assessment: {
      findUnique: vi.fn(async () => mockAssessment),
    },
  },
}));

import { canSubmitWorkerAssessment } from "@/lib/validation";
import { STEP1_QUESTIONS, HAZARD_QUESTIONS, FINAL_DECLARATIONS } from "@/lib/constants";

function baseAssessment(overrides: Partial<any> = {}): any {
  return {
    id: "a1",
    step1Responses: STEP1_QUESTIONS.map((q) => ({
      questionKey: q.key,
      answer: true as boolean | null,
      noDetails: null as string | null,
      spokenToSupervisor: false,
      resolvedAt: null,
    })),
    accessCheck: { safe: true as boolean | null, details: null as string | null, controlMeasure: null as string | null },
    swms: [{ swmsOptionId: "swms1" }] as any[],
    permitRequired: false,
    permits: [] as any[],
    hazardResponses: HAZARD_QUESTIONS.map((q) => ({
      questionKey: q.key,
      present: false as boolean | null,
      cards: [] as any[],
    })),
    newHazardFlag: { present: false } as any,
    declarations: FINAL_DECLARATIONS.map((d) => ({ declarationKey: d.key, checked: true })),
    signOns: [{ isPrimary: true }] as any[],
    ...overrides,
  };
}

beforeEach(() => {
  mockAssessment = null;
});

describe("canSubmitWorkerAssessment", () => {
  it("passes for a fully valid, minimal assessment", async () => {
    mockAssessment = baseAssessment();
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(true);
  });

  it("blocks when a Step 1 question is unanswered", async () => {
    const a = baseAssessment();
    a.step1Responses[0].answer = null;
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("has not been answered"))).toBe(true);
  });

  it("blocks a Step 1 'No' answer without details and supervisor confirmation", async () => {
    const a = baseAssessment();
    a.step1Responses[0].answer = false;
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
  });

  it("allows a Step 1 'No' answer once details and supervisor confirmation are present", async () => {
    const a = baseAssessment();
    a.step1Responses[0].answer = false;
    a.step1Responses[0].noDetails = "Missing PPE item";
    a.step1Responses[0].spokenToSupervisor = true;
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(true);
    // still flagged for supervisor visibility even though not blocking here
  });

  it("blocks when no SWMS is selected", async () => {
    const a = baseAssessment({ swms: [] });
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("SWMS"))).toBe(true);
  });

  it("blocks when a permit is required but none selected", async () => {
    const a = baseAssessment({ permitRequired: true, permits: [] });
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
  });

  it("blocks when a selected permit is not confirmed issued/reviewed/signed", async () => {
    const a = baseAssessment({
      permitRequired: true,
      permits: [{ issuedReviewedSigned: false }],
    });
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
  });

  it("blocks when a hazard marked Yes has no hazard card", async () => {
    const a = baseAssessment();
    a.hazardResponses[0].present = true;
    a.hazardResponses[0].cards = [];
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("no hazard detail card"))).toBe(true);
  });

  it("blocks when a hazard card's control is not confirmed implemented", async () => {
    const a = baseAssessment();
    a.hazardResponses[0].present = true;
    a.hazardResponses[0].cards = [
      {
        description: "Trench nearby",
        controls: "Barricade",
        responsiblePerson: "Foreman",
        controlConfirmed: false,
        residualRisk: "low",
      },
    ];
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
  });

  it("does not block submission on High/Extreme residual risk alone but flags it for supervisor review", async () => {
    const a = baseAssessment();
    a.hazardResponses[0].present = true;
    a.hazardResponses[0].cards = [
      {
        description: "Suspended load",
        controls: "Exclusion zone",
        responsiblePerson: "Rigger",
        controlConfirmed: true,
        residualRisk: "extreme",
      },
    ];
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    // Blocking errors specifically should be empty; the requires-review marker is informational
    const blocking = result.errors.filter((e) => !e.startsWith("__REQUIRES_SUPERVISOR_REVIEW__"));
    expect(blocking.length).toBe(0);
    expect(
      result.errors.some((e) => e.includes("High or Extreme residual risk"))
    ).toBe(true);
  });

  it("blocks when a final declaration is not checked", async () => {
    const a = baseAssessment();
    a.declarations[0].checked = false;
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
  });

  it("blocks when the primary person has not signed", async () => {
    const a = baseAssessment({ signOns: [] });
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("has not signed"))).toBe(true);
  });

  it("blocks unsafe access without details and control measure", async () => {
    const a = baseAssessment({
      accessCheck: { safe: false, details: null, controlMeasure: null },
    });
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    expect(result.ok).toBe(false);
  });

  it("flags a new hazard not covered by SWMS for supervisor review without blocking, given complete fields", async () => {
    const a = baseAssessment({
      newHazardFlag: {
        present: true,
        description: "Unmarked service line",
        immediateControls: "Stopped work, isolated area",
      },
    });
    mockAssessment = a;
    const result = await canSubmitWorkerAssessment("a1");
    const blocking = result.errors.filter((e) => !e.startsWith("__REQUIRES_SUPERVISOR_REVIEW__"));
    expect(blocking.length).toBe(0);
    expect(result.errors.some((e) => e.includes("new hazard"))).toBe(true);
  });
});
