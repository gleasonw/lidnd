// D&D 5e turn order (spec §11.4). 2024 difficulty is not defined yet.

export type InitiativeParticipant = {
  id: string;
  initiative: number;
  createdAt: number;
  defeated: boolean;
};

/** Descending initiative; ties by creation time, then id. */
export function compareInitiative(
  a: InitiativeParticipant,
  b: InitiativeParticipant,
) {
  return (
    b.initiative - a.initiative ||
    a.createdAt - b.createdAt ||
    a.id.localeCompare(b.id)
  );
}

export function initiativeOrder<P extends InitiativeParticipant>(
  participants: P[],
) {
  return [...participants].sort(compareInitiative);
}

type Turn = { currentId: string | undefined; round: number };

// Defeated participants are skipped unless they are the current one.
function eligible<P extends InitiativeParticipant>(
  participants: P[],
  currentId: string | undefined,
) {
  return initiativeOrder(participants).filter(
    (p) => !p.defeated || p.id === currentId,
  );
}

export function nextTurn(
  participants: InitiativeParticipant[],
  { currentId, round }: Turn,
): Turn {
  const order = eligible(participants, currentId);
  if (order.length === 0) return { currentId, round };
  const index = order.findIndex((p) => p.id === currentId);
  if (index === -1) return { currentId: order[0].id, round };
  if (index === order.length - 1) {
    return { currentId: order[0].id, round: round + 1 };
  }
  return { currentId: order[index + 1].id, round };
}

/** Going back from the first turn of round 1 does nothing. */
export function previousTurn(
  participants: InitiativeParticipant[],
  { currentId, round }: Turn,
): Turn {
  const order = eligible(participants, currentId);
  if (order.length === 0) return { currentId, round };
  const index = order.findIndex((p) => p.id === currentId);
  if (index === -1) return { currentId: order[0].id, round };
  if (index === 0) {
    if (round <= 1) return { currentId, round };
    return { currentId: order[order.length - 1].id, round: round - 1 };
  }
  return { currentId: order[index - 1].id, round };
}
