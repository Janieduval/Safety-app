// Who has signed which version of a Take 5.
//
// When a supervisor asks for changes and the worker updates it, the Take 5
// goes up a version (1 → 2). Everyone who signed the old version has to read
// it again and sign the new one. These helpers work out:
// - current:   sign-ons for the version it's on now
// - needAgain: people who signed an older version but not this one yet
// - older:     every sign-on for older versions (for the record and PDF)

export type SignOnLike = {
  id: string;
  workerId: string;
  version?: number | null;
  isPrimary?: boolean;
  signedAt: string | Date;
  worker?: { id?: string; name: string } | null;
};

export type ChangeAckLike = { workerId: string; versionAtAck: number; acknowledgedAt: string | Date };

export function signOnVersions(assessment: any) {
  const version: number = assessment?.version ?? 1;
  const signOns: SignOnLike[] = assessment?.signOns ?? [];
  const acks: ChangeAckLike[] = assessment?.changeAcknowledgments ?? [];

  const current = signOns.filter((s) => (s.version ?? 1) === version);
  const currentIds = new Set(current.map((s) => s.workerId));

  // The person who completed it signs the new version when they send it back
  // ("Changes acknowledged"), so they count as signed for this version.
  const primaryAck = acks.find(
    (a) => a.versionAtAck === version && a.workerId === assessment?.completedByWorkerId
  );
  if (primaryAck) currentIds.add(primaryAck.workerId);

  const older = signOns.filter((s) => (s.version ?? 1) < version);

  // Latest older sign-on per person who hasn't signed this version yet.
  const latest = new Map<string, SignOnLike>();
  for (const s of older) {
    if (currentIds.has(s.workerId)) continue;
    const prev = latest.get(s.workerId);
    if (!prev || (s.version ?? 1) > (prev.version ?? 1)) latest.set(s.workerId, s);
  }
  const needAgain = Array.from(latest.values()).sort((a, b) =>
    (a.worker?.name ?? "").localeCompare(b.worker?.name ?? "")
  );

  return { version, current, currentIds, primaryAck: primaryAck ?? null, older, needAgain };
}
