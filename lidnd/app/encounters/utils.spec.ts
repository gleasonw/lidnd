import { test, expect, describe } from "vitest";
import { updateMinionCount, cycleNextTurn, cyclePreviousTurn } from "./utils";

type Participant = {
  is_active: boolean;
  hp: number;
  id: string;
  initiative: number;
  created_at: Date;
  is_player: boolean;
  has_surprise: boolean;
};

function createParticipant({
  id,
  is_active = true,
  initiative = 1,
  is_player = true,
  has_surprise = false,
  hp = 10,
}: Partial<Participant> & { id: string }): Participant {
  return {
    id,
    is_active,
    initiative,
    is_player,
    has_surprise,
    hp,
    created_at: new Date(),
  };
}

describe("Participant turn order tests", () => {
  test("updates turn order to next participant", () => {
    let participants = [
      createParticipant({ id: "1", initiative: 1 }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
    ];
    participants = participants.sort((a, b) => b.initiative - a.initiative);
    const encounter = { current_round: 1 };
    const result = cycleNextTurn(participants, encounter);
    expect(result.newlyActiveParticipant.id).toBe("2");
    expect(result.updatedRoundNumber).toBe(2);
  });

  test("updates turn order to previous participant", () => {
    let participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({ id: "2", is_active: true, initiative: 2 }),
    ];
    participants = participants.sort((a, b) => b.initiative - a.initiative);
    const encounter = { current_round: 1 };

    const result = cyclePreviousTurn(participants, encounter);
    expect(result.newlyActiveParticipant.id).toBe("1");
    expect(result.updatedRoundNumber).toBe(0);
  });

  test("updates turn order to last surprise participant when wrapping back from first participant", () => {
    let participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({
        id: "2",
        is_active: false,
        initiative: 2,
        has_surprise: true,
      }),
      createParticipant({ id: "3", is_active: true, initiative: 3 }),
    ];
    participants = participants.sort((a, b) => b.initiative - a.initiative);
    const encounter = { current_round: 1 };

    const result = cyclePreviousTurn(participants, encounter);
    expect(result.newlyActiveParticipant.id).toBe("2");
    expect(result.updatedRoundNumber).toBe(0);
  });

  test("updates turn order to last participant when wrapping back from first participant", () => {
    let participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
      createParticipant({ id: "3", is_active: true, initiative: 3 }),
    ];
    participants = participants.sort((a, b) => b.initiative - a.initiative);
    const encounter = { current_round: 1 };

    const result = cyclePreviousTurn(participants, encounter);
    expect(result.newlyActiveParticipant.id).toBe("1");
    expect(result.updatedRoundNumber).toBe(0);
  });

  test("updates turn order to first participant when wrapping back from last participant", () => {
    let participants = [
      createParticipant({ id: "1", is_active: true }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
      createParticipant({ id: "3", is_active: false, initiative: 3 }),
    ];
    participants = participants.sort((a, b) => b.initiative - a.initiative);
    const encounter = { current_round: 1 };

    const result = cycleNextTurn(participants, encounter);
    expect(result.newlyActiveParticipant.id).toBe("3");
    expect(result.updatedRoundNumber).toBe(2);
  });

  test("does nothing if user tries to cycle previous from last participant on round 0", () => {
    let participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
      createParticipant({ id: "3", is_active: true, initiative: 3 }),
    ];
    participants = participants.sort((a, b) => b.initiative - a.initiative);
    const encounter = { current_round: 0 };

    const result = cyclePreviousTurn(participants, encounter);
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

  const result = cycleNextTurn(participants, {
    current_round: 0,
  });

  expect(result.updatedRoundNumber).toBe(0);
  expect(result.newlyActiveParticipant.id).toBe("4");
  const result2 = cyclePreviousTurn(result.updatedParticipants, {
    current_round: 0,
  });

  expect(result2.updatedRoundNumber).toBe(0);
  expect(result2.newlyActiveParticipant.id).toBe("2");
});

describe("Overkill minions", () => {
  test("overkill damage kills the right number of minions", () => {
    const participant = {
      minion_count: 3,
      max_hp: 6,
    };
    expect(updateMinionCount(participant, 2, 4)).toBe(2);
    expect(updateMinionCount(participant, 2, 13)).toBe(0);
    expect(updateMinionCount({ max_hp: 22, minion_count: 10 }, 5, 80)).toBe(6);
    expect(updateMinionCount({ max_hp: 22, minion_count: 10 }, 5, 0)).toBe(10);
    expect(updateMinionCount({ max_hp: 22, minion_count: 10 }, 0, 1)).toBe(9);
  });
});
