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
  minion_count: number;
  max_hp: number;
};

function createParticipant({
  id,
  is_active = true,
  initiative = 1,
  is_player = true,
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
    }
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
      turn_groups: [],
    });
    expect(result.newlyActiveParticipant.id).toBe("2");
    expect(result.updatedEncounter.current_round).toBe(2);
  });

  test("updates turn order to previous participant", () => {
    const participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({ id: "2", is_active: true, initiative: 2 }),
    ];

    const result = EncounterUtils.cyclePreviousTurn({
      current_round: 1,
      participants,
      turn_groups: [],
    });
    expect(result.newlyActiveParticipant.id).toBe("1");
    expect(result.updatedEncounter.current_round).toBe(0);
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
      turn_groups: [],
    });
    expect(result.newlyActiveParticipant.id).toBe("1");
    expect(result.updatedEncounter.current_round).toBe(0);
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
      turn_groups: [],
    });
    expect(result.newlyActiveParticipant.id).toBe("3");
    expect(result.updatedEncounter.current_round).toBe(2);
  });

  test("cyles back around without changing round number if user tries to cycle previous from last participant on round 0", () => {
    const participants = [
      createParticipant({ id: "1", is_active: false }),
      createParticipant({ id: "2", is_active: false, initiative: 2 }),
      createParticipant({ id: "3", is_active: true, initiative: 3 }),
    ];

    const result = EncounterUtils.cyclePreviousTurn({
      current_round: 0,
      participants,
      turn_groups: [],
    });
    expect(result.newlyActiveParticipant.id).toBe("1");
    expect(result.updatedEncounter.current_round).toBe(0);
  });
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

describe("Group turn toggle and round increment tests", () => {
  test("round number increments when last participant plays and there's an inanimate participant", () => {
    const participants = [
      createParticipant({ id: "1" }),
      createParticipant({ id: "2" }),
      createParticipant({ id: "3" }),
    ];

    // Manually add inanimate participant and has_played_this_round
    const inanimateParticipant = {
      ...participants[0]!,
      inanimate: true,
      has_played_this_round: false,
    };
    const encounterWithInanimate = {
      current_round: 1,
      participants: [
        inanimateParticipant,
        { ...participants[1]!, has_played_this_round: true },
        { ...participants[2]!, has_played_this_round: false },
      ],
      turn_groups: [],
    };

    const result = EncounterUtils.toggleGroupTurn("3", encounterWithInanimate);

    // Even with an inanimate participant, if all non-inanimate have played, round should increment
    expect(result.updatedEncounter.current_round).toBe(2);
  });

  test("round number increments when last participant without turn group plays", () => {
    const participants = [
      createParticipant({ id: "1" }),
      createParticipant({ id: "2" }),
      createParticipant({ id: "3" }),
    ];

    // Manually set has_played_this_round
    const participantsWithPlayState = [
      { ...participants[0]!, has_played_this_round: false },
      { ...participants[1]!, has_played_this_round: true },
      { ...participants[2]!, has_played_this_round: true },
    ];

    const encounter = {
      current_round: 1,
      participants: participantsWithPlayState,
      turn_groups: [],
    };

    const result = EncounterUtils.toggleGroupTurn("1", encounter);

    // Last participant played, round should increment
    expect(result.updatedEncounter.current_round).toBe(2);
    expect(
      result.updatedEncounter.participants.every(
        (p) => !p.has_played_this_round
      )
    ).toBe(true);
  });

  test("toggleGroupTurn works correctly for participant in a turn group", () => {
    const participants = [
      createParticipant({ id: "1" }),
      createParticipant({ id: "2" }),
      createParticipant({ id: "3" }),
    ];

    // Manually add turn_group_id and has_played_this_round
    const participantsWithGroup = [
      {
        ...participants[0]!,
        turn_group_id: "group1",
        has_played_this_round: false,
      },
      {
        ...participants[1]!,
        turn_group_id: "group1",
        has_played_this_round: false,
      },
      { ...participants[2]!, has_played_this_round: false },
    ];

    const encounter = {
      current_round: 1,
      participants: participantsWithGroup,
      turn_groups: [{ id: "group1", has_played_this_round: false }],
    };

    const result = EncounterUtils.toggleGroupTurn("1", encounter);

    // The whole group should be marked as played
    const updatedGroup = result.updatedEncounter.turn_groups.find(
      (tg) => tg.id === "group1"
    );
    expect(updatedGroup?.has_played_this_round).toBe(true);

    // Round should not increment yet since participant 3 hasn't played
    expect(result.updatedEncounter.current_round).toBe(1);

    const result2 = EncounterUtils.toggleGroupTurn(
      "3",
      result.updatedEncounter
    );

    // Now all participants have played, round should increment
    expect(result2.updatedEncounter.current_round).toBe(2);
  });

  test("toggleGroupTurn works correctly for participant not in a turn group", () => {
    const participants = [
      createParticipant({ id: "1" }),
      createParticipant({ id: "2" }),
    ];

    // Manually add turn_group_id and has_played_this_round
    const participantsWithGroup = [
      {
        ...participants[0]!,
        turn_group_id: "group1",
        has_played_this_round: false,
      },
      {
        ...participants[1]!,
        turn_group_id: null,
        has_played_this_round: false,
      },
    ];

    const encounter = {
      current_round: 1,
      participants: participantsWithGroup,
      turn_groups: [{ id: "group1", has_played_this_round: false }],
    };

    const result = EncounterUtils.toggleGroupTurn("2", encounter);

    // Only participant 2 should be marked as played, not the group
    const participant2 = result.updatedEncounter.participants.find(
      (p) => p.id === "2"
    );
    expect(participant2?.has_played_this_round).toBe(true);

    // The group should still be unmarked
    const group = result.updatedEncounter.turn_groups.find(
      (tg) => tg.id === "group1"
    );
    expect(group?.has_played_this_round).toBe(false);

    // Round should not increment yet
    expect(result.updatedEncounter.current_round).toBe(1);
  });
});
