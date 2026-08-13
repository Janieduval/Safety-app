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
