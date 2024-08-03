import type { ParticipantWithData } from "@/server/api/router";
import { EncounterUtils } from "@/utils/encounters";
import { ParticipantUtils } from "@/utils/participants";
import { test, expect, describe } from "vitest";

// for convenience some properties from creature are included inside the participant
type MockParticipant = {
  is_active: boolean;
  hp: number;
  id: string;
  initiative: number;
  created_at: Date;
  is_player: boolean;
  has_surprise: boolean;
  minion_count: number;
  max_hp: number;
};

function createParticipant({
  id,
  is_active = true,
  initiative = 1,
  is_player = true,
  has_surprise = false,
  hp = 10,
  minion_count = 0,
  max_hp = 10,
}: Partial<MockParticipant> & { id: string }): ParticipantWithData {
  return ParticipantUtils.placeholderParticipantWithData(
    {
      id,
      encounter_id: "testing",
      is_active,
      initiative,
      has_surprise,
      hp,
      creature_id: "testing",
      minion_count: minion_count ?? 0,
    },
    {
      id,
      is_player,
      name: "testing",
      user_id: "testing",
      max_hp,
    },
  );
}

describe("Participant turn order tests", () => {
  test("updates turn order to next participant", () => {
    const participants = [
      createParticipant({ id: "1", initiative: 1 }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
    ];
    const result = EncounterUtils.cycleNextTurn({
      current_round: 1,
      participants,
    });
    expect(result.newlyActiveParticipant.id).toBe("2");
    expect(result.updatedRoundNumber).toBe(2);
  });

  test("updates turn order to previous participant", () => {
    const participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({ id: "2", is_active: true, initiative: 2 }),
    ];

    const result = EncounterUtils.cyclePreviousTurn({
      current_round: 1,
      participants,
    });
    expect(result.newlyActiveParticipant.id).toBe("1");
    expect(result.updatedRoundNumber).toBe(0);
  });

  test("updates turn order to last surprise participant when wrapping back from first participant", () => {
    const participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({
        id: "2",
        is_active: false,
        initiative: 2,
        has_surprise: true,
      }),
      createParticipant({ id: "3", is_active: true, initiative: 3 }),
    ];

    const result = EncounterUtils.cyclePreviousTurn({
      current_round: 1,
      participants,
    });
    expect(result.newlyActiveParticipant.id).toBe("2");
    expect(result.updatedRoundNumber).toBe(0);
  });

  test("updates turn order to last participant when wrapping back from first participant", () => {
    const participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
      createParticipant({ id: "3", is_active: true, initiative: 3 }),
    ];

    const result = EncounterUtils.cyclePreviousTurn({
      current_round: 1,
      participants,
    });
    expect(result.newlyActiveParticipant.id).toBe("1");
    expect(result.updatedRoundNumber).toBe(0);
  });

  test("updates turn order to first participant when wrapping back from last participant", () => {
    const participants = [
      createParticipant({ id: "1", is_active: true }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
      createParticipant({ id: "3", is_active: false, initiative: 3 }),
    ];

    const result = EncounterUtils.cycleNextTurn({
      current_round: 1,
      participants,
    });
    expect(result.newlyActiveParticipant.id).toBe("3");
    expect(result.updatedRoundNumber).toBe(2);
  });

  test("does nothing if user tries to cycle previous from last participant on round 0", () => {
    const participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
      createParticipant({ id: "3", is_active: true, initiative: 3 }),
    ];

    const result = EncounterUtils.cyclePreviousTurn({
      current_round: 0,
      participants,
    });
    expect(result.newlyActiveParticipant.id).toBe("3");
    expect(result.updatedRoundNumber).toBe(0);
  });
});

test("skip non-surprise participants when cycling next on surprise round", () => {
  const participants = [
    createParticipant({ id: "1", is_active: false, initiative: 4 }),
    createParticipant({
      id: "2",
      is_active: true,
      has_surprise: true,
      initiative: 3,
    }),
    createParticipant({ id: "3", is_active: false, initiative: 2 }),
    createParticipant({
      id: "4",
      is_active: false,
      has_surprise: true,
      initiative: 1,
    }),
    createParticipant({
      id: "5",
      is_active: false,
      has_surprise: true,
      initiative: 0,
    }),
  ];

  const result = EncounterUtils.cycleNextTurn({
    current_round: 0,
    participants,
  });

  expect(result.updatedRoundNumber).toBe(0);
  expect(result.newlyActiveParticipant.id).toBe("4");
  const result2 = EncounterUtils.cyclePreviousTurn({
    current_round: 0,
    participants,
  });

  expect(result2.updatedRoundNumber).toBe(0);
  expect(result2.newlyActiveParticipant.id).toBe("2");
});

describe("Overkill minions", () => {
  test("overkill damage kills the right number of minions", () => {
    const participant = createParticipant({
      id: "1",
      minion_count: 3,
      max_hp: 6,
    });

    // should be able to infer from createParticipant args. this is faster
    if (!ParticipantUtils.isMinion(participant)) {
      throw new Error("not a minion");
    }

    expect(ParticipantUtils.updateMinionCount(participant, 2, 4)).toBe(2);
    expect(ParticipantUtils.updateMinionCount(participant, 2, 13)).toBe(0);

    const p2 = createParticipant({
      id: "2",
      minion_count: 10,
      max_hp: 22,
    });

    if (!ParticipantUtils.isMinion(p2)) {
      throw new Error("not a minion");
    }

    expect(ParticipantUtils.updateMinionCount(p2, 5, 80)).toBe(6);
    expect(ParticipantUtils.updateMinionCount(p2, 5, 0)).toBe(10);
    expect(ParticipantUtils.updateMinionCount(p2, 0, 1)).toBe(9);
  });
});
