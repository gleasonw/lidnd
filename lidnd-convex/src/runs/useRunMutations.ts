import { useMutation } from "convex/react";
import { OptimisticLocalStore } from "convex/browser";
import * as drawSteel from "../../rules/drawSteel";
import * as dnd5e from "../../rules/dnd5e";
import {
  applyDamage,
  applyHealing,
  gainTemporary,
  isDefeated,
  isWinded,
} from "../../rules/hp";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { RunData, RunParticipant } from "./types";

// Optimistic versions of the frequent combat mutations, so the combat screen
// responds instantly. They apply the same rules as the server, which then
// confirms or corrects the result.

function updateRuns(
  store: OptimisticLocalStore,
  matches: (data: RunData) => boolean,
  update: (data: RunData) => RunData,
) {
  for (const { args, value } of store.getAllQueries(api.runs.get)) {
    if (value && matches(value)) {
      store.setQuery(api.runs.get, args, update(value));
    }
  }
}

function updateParticipant(
  store: OptimisticLocalStore,
  participantId: Id<"runParticipants">,
  update: (p: RunParticipant) => Partial<RunParticipant>,
) {
  updateRuns(
    store,
    (data) => data.participants.some((p) => p._id === participantId),
    (data) => ({
      ...data,
      participants: data.participants.map((p) => {
        if (p._id !== participantId) return p;
        const next = { ...p, ...update(p) };
        return {
          ...next,
          defeated: isDefeated(next),
          winded: isWinded(next),
          minionsAlive:
            next.kind === "minion"
              ? drawSteel.minionsAlive(next.hp, next.maxHp)
              : undefined,
        };
      }),
    }),
  );
}

const byRun = (runId: Id<"runs">) => (data: RunData) => data.run._id === runId;

export function useDamage() {
  return useMutation(api.runs.damage).withOptimisticUpdate(
    (store, { participantId, amount, minionsInArea }) =>
      updateParticipant(store, participantId, (p) =>
        p.kind === "minion"
          ? {
              hp: drawSteel.damageSquad({
                pool: p.hp,
                staminaPerMinion: p.maxHp,
                damage: amount,
                minionsInArea,
              }),
            }
          : applyDamage(p, amount),
      ),
  );
}

export function useHeal() {
  return useMutation(api.runs.heal).withOptimisticUpdate(
    (store, { participantId, amount }) =>
      updateParticipant(store, participantId, (p) => ({
        hp: applyHealing(p.hp, p.maxHp, amount),
      })),
  );
}

export function useGainTempHp() {
  return useMutation(api.runs.gainTempHp).withOptimisticUpdate(
    (store, { participantId, amount }) =>
      updateParticipant(store, participantId, (p) => ({
        tempHp: gainTemporary(p.tempHp, amount),
      })),
  );
}

export function useSetHealth() {
  return useMutation(api.runs.setHealth).withOptimisticUpdate(
    (store, { participantId, hp, tempHp, minionCount }) =>
      updateParticipant(store, participantId, (p) => {
        const isMinion = p.kind === "minion";
        const maxPool = drawSteel.squadPool(drawSteel.MAX_SQUAD_SIZE, p.maxHp);
        return {
          ...(hp !== undefined && {
            hp: Math.min(hp, isMinion ? maxPool : p.maxHp),
          }),
          ...(tempHp !== undefined && { tempHp }),
          ...(isMinion &&
            minionCount !== undefined && {
              hp: drawSteel.squadPool(
                Math.min(minionCount, drawSteel.MAX_SQUAD_SIZE),
                p.maxHp,
              ),
            }),
        };
      }),
  );
}

export function useSetInitiative() {
  return useMutation(api.runs.setInitiative).withOptimisticUpdate(
    (store, { participantId, initiative }) =>
      updateParticipant(store, participantId, () => ({ initiative })),
  );
}

export function useRemoveEffect() {
  return useMutation(api.runs.removeEffect).withOptimisticUpdate(
    (store, { effectId }) =>
      updateRuns(
        store,
        (data) =>
          data.participants.some((p) =>
            p.effects.some((e) => e._id === effectId),
          ),
        (data) => ({
          ...data,
          participants: data.participants.map((p) => ({
            ...p,
            effects: p.effects.filter((e) => e._id !== effectId),
          })),
        }),
      ),
  );
}

/** Mirrors runs.toggleActed, including the round advance and malice award. */
export function useToggleActed() {
  return useMutation(api.runs.toggleActed).withOptimisticUpdate(
    (store, { participantId }) =>
      updateRuns(
        store,
        (data) => data.participants.some((p) => p._id === participantId),
        (data) => {
          const participant = data.participants.find(
            (p) => p._id === participantId,
          )!;
          const group = data.turnGroups.find(
            (g) => g._id === participant.turnGroupId,
          );
          const acted = !(group ? group.acted : participant.acted);
          let participants = data.participants.map((p) =>
            !group && p._id === participantId ? { ...p, acted } : p,
          );
          let turnGroups = data.turnGroups.map((g) =>
            group && g._id === group._id ? { ...g, acted } : g,
          );
          const roundOver = drawSteel.allActed(
            participants.map((p) => ({
              id: p._id,
              acted: p.acted,
              turnGroupId: p.turnGroupId,
              defeated: p.defeated,
            })),
            turnGroups.map((g) => ({ id: g._id, acted: g.acted })),
          );
          if (!acted || !roundOver)
            return { ...data, participants, turnGroups };

          const round = data.run.round + 1;
          participants = participants.map((p) => ({ ...p, acted: false }));
          turnGroups = turnGroups.map((g) => ({ ...g, acted: false }));
          const heroes = participants.filter((p) => p.kind === "hero").length;
          const malice = data.run.malice + drawSteel.roundMalice(heroes, round);
          return {
            ...data,
            participants,
            turnGroups,
            run: { ...data.run, round, malice },
          };
        },
      ),
  );
}

export function useAdjustMalice() {
  return useMutation(api.runs.adjustMalice).withOptimisticUpdate(
    (store, { runId, delta }) =>
      updateRuns(store, byRun(runId), (data) => ({
        ...data,
        run: { ...data.run, malice: Math.max(0, data.run.malice + delta) },
      })),
  );
}

export function useSetVictories() {
  return useMutation(api.runs.setVictories).withOptimisticUpdate(
    (store, { runId, victories }) =>
      updateRuns(store, byRun(runId), (data) => ({
        ...data,
        session: data.session && { ...data.session, victories },
      })),
  );
}

function moveTurn(data: RunData, direction: "next" | "previous"): RunData {
  if (data.run.round === 0) return data;
  const move = direction === "next" ? dnd5e.nextTurn : dnd5e.previousTurn;
  const turn = move(
    data.participants.map((p) => ({
      id: p._id,
      initiative: p.initiative,
      createdAt: p._creationTime,
      defeated: p.defeated,
    })),
    { currentId: data.run.currentParticipantId, round: data.run.round },
  );
  return {
    ...data,
    run: {
      ...data.run,
      round: turn.round,
      currentParticipantId: turn.currentId as Id<"runParticipants"> | undefined,
    },
  };
}

export function useNextTurn() {
  return useMutation(api.runs.nextTurn).withOptimisticUpdate(
    (store, { runId }) =>
      updateRuns(store, byRun(runId), (data) => moveTurn(data, "next")),
  );
}

export function usePreviousTurn() {
  return useMutation(api.runs.previousTurn).withOptimisticUpdate(
    (store, { runId }) =>
      updateRuns(store, byRun(runId), (data) => moveTurn(data, "previous")),
  );
}

export function useDismissReminder() {
  return useMutation(api.runs.dismissReminder).withOptimisticUpdate(
    (store, { reminderId }) =>
      updateRuns(
        store,
        (data) => data.reminders.some((r) => r._id === reminderId),
        (data) => ({
          ...data,
          reminders: data.reminders.map((r) =>
            r._id === reminderId ? { ...r, dismissedRound: data.run.round } : r,
          ),
        }),
      ),
  );
}

export function useSetFirstSide() {
  return useMutation(api.runs.setFirstSide).withOptimisticUpdate(
    (store, { runId, side, roll }) =>
      updateRuns(store, byRun(runId), (data) => ({
        ...data,
        run: { ...data.run, firstSide: side, firstSideRoll: roll },
      })),
  );
}
