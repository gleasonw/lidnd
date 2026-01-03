import type { ParticipantWithData } from "@/server/api/router";
import type { GameSession } from "@/server/db/schema";
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
      name: "testing",
      user_id: "testing",
      max_hp,
      type: "standard_monster",
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
    const participant = ParticipantUtils.placeholderParticipantWithData(
      {
        id: "1",
        encounter_id: "nonsense",
        creature_id: "test",
        max_hp_override: 10,
        hp: 10,
      },
      {
        type: "minion_monster",
        id: "test",
        name: "test",
        user_id: "test",
        max_hp: 2,
      }
    );

    expect(ParticipantUtils.numberOfMinions(participant)).toBe(5);
    participant.hp -= 4;
    expect(ParticipantUtils.numberOfMinions(participant)).toBe(3);
    participant.hp -= 1;
    expect(ParticipantUtils.numberOfMinions(participant)).toBe(3);
    participant.hp -= 1;
    expect(ParticipantUtils.numberOfMinions(participant)).toBe(2);
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
      malice: 0,
    };

    const result = EncounterUtils.toggleGroupTurn({
      participant: { id: "3" },
      encounter: encounterWithInanimate,
      gameSession: undefined,
    });

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
      malice: 0,
    };

    const result = EncounterUtils.toggleGroupTurn({
      participant: { id: "1" },
      encounter,
      gameSession: undefined,
    });

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
      malice: 0,
    };

    const result = EncounterUtils.toggleGroupTurn({
      participant: { id: "1" },
      encounter,
      gameSession: undefined,
    });

    // The whole group should be marked as played
    const updatedGroup = result.updatedEncounter.turn_groups.find(
      (tg) => tg.id === "group1"
    );
    expect(updatedGroup?.has_played_this_round).toBe(true);

    // Round should not increment yet since participant 3 hasn't played
    expect(result.updatedEncounter.current_round).toBe(1);

    const result2 = EncounterUtils.toggleGroupTurn({
      participant: { id: "3" },
      encounter: result.updatedEncounter,
      gameSession: undefined,
    });

    // Now all participants have played, round should increment
    expect(result2.updatedEncounter.current_round).toBe(2);

    const result3 = EncounterUtils.toggleGroupTurn({
      participant: { id: "3" },
      encounter: result2.updatedEncounter,
      gameSession: undefined,
    });

    // After toggling again, round should remain the same since not all have played
    expect(result3.updatedEncounter.current_round).toBe(2);
    expect(
      result3.updatedEncounter.turn_groups.find((tg) => tg.id === "group1")
        ?.has_played_this_round
    ).toBe(false);

    const result4 = EncounterUtils.toggleGroupTurn({
      participant: { id: "1" },
      encounter: result3.updatedEncounter,
      gameSession: undefined,
    });

    // Toggling group1 again should not increment round yet
    expect(result4.updatedEncounter.current_round).toBe(3);
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
      malice: 0,
    };

    const result = EncounterUtils.toggleGroupTurn({
      participant: { id: "2" },
      encounter,
      gameSession: undefined,
    });

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

describe("Malice calculation tests", () => {
  test("starting an encounter sets initial malice to number of players + round 1", () => {
    const players = [
      createParticipant({ id: "p1", initiative: 20, hp: 50 }),
      createParticipant({ id: "p2", initiative: 18, hp: 45 }),
      createParticipant({ id: "p3", initiative: 16, hp: 40 }),
    ];

    // Override type to make them players
    players.forEach((p) => {
      p.creature.type = "player";
    });

    const monster = createParticipant({ id: "m1", initiative: 15, hp: 30 });
    monster.creature.type = "standard_monster";

    const encounter = {
      id: "test",
      campaign_id: "test",
      user_id: "test",
      name: "Test Encounter",
      description: null,
      started_at: null,
      created_at: new Date(),
      current_round: 0,
      ended_at: null,
      status: "prep" as const,
      label: "active" as const,
      order: 1,
      index_in_campaign: 0,
      is_editing_columns: true,
      target_difficulty: "standard" as const,
      session_id: null,
      average_victories: 0,
      malice: 0,
      participants: [...players, monster],
      reminders: [],
      turn_groups: [],
      columns: [],
      tags: [],
      assets: [],
      campaigns: {
        id: "test",
        name: "Test Campaign",
        user_id: "test",
        description: null,
        created_at: new Date(),
        system: "drawsteel" as const,
        party_level: 1,
        slug: "test",
        image_url: null,
      },
    };

    const startedEncounter = EncounterUtils.start(encounter, {
      system: "drawsteel",
    });

    // 3 players + 1 (round 1) = 4
    expect(startedEncounter.malice).toBe(4);
    expect(startedEncounter.status).toBe("run");
    expect(startedEncounter.current_round).toBe(1);
  });

  test("malice increases by number of alive players + round number when round changes", () => {
    const players = [
      createParticipant({ id: "p1", initiative: 20, hp: 50 }),
      createParticipant({ id: "p2", initiative: 18, hp: 45 }),
      createParticipant({ id: "p3", initiative: 16, hp: 0 }), // Dead player
    ];

    players.forEach((p) => {
      p.creature.type = "player";
      p.has_played_this_round = true;
    });

    const monster = createParticipant({ id: "m1", initiative: 15, hp: 30 });
    monster.creature.type = "standard_monster";
    monster.has_played_this_round = false;

    const encounter = {
      current_round: 1,
      participants: [...players, monster],
      turn_groups: [],
      malice: 4, // Starting malice from round 1
    };

    // Toggle the last participant to trigger round change
    const result = EncounterUtils.toggleGroupTurn({
      participant: { id: "m1" },
      encounter,
      gameSession: undefined,
    });

    // New round is 2, alive players are 2 (p1, p2 - p3 is dead)
    // Malice increase: 2 (alive players) + 2 (new round) = 4
    // Total malice: 4 (starting) + 4 (new round) = 8
    expect(result.updatedEncounter.current_round).toBe(2);
    expect(result.updatedEncounter.malice).toBe(8);
  });

  test("dead players don't contribute to malice generation", () => {
    const players = [
      createParticipant({ id: "p1", initiative: 20, hp: 0 }), // Dead
      createParticipant({ id: "p2", initiative: 18, hp: 0 }), // Dead
      createParticipant({ id: "p3", initiative: 16, hp: 30 }), // Alive
    ];

    players.forEach((p) => {
      p.creature.type = "player";
      p.has_played_this_round = true;
    });

    const monster = createParticipant({ id: "m1", initiative: 15, hp: 30 });
    monster.creature.type = "standard_monster";
    monster.has_played_this_round = false;

    const encounter = {
      current_round: 3,
      participants: [...players, monster],
      turn_groups: [],
      malice: 10,
    };

    const result = EncounterUtils.toggleGroupTurn({
      participant: { id: "m1" },
      encounter,
      gameSession: undefined,
    });

    // New round is 4, only 1 alive player
    // Malice increase: 1 (alive player) + 4 (new round) = 5
    // Total malice: 10 (starting) + 5 (new round) = 15
    expect(result.updatedEncounter.current_round).toBe(4);
    expect(result.updatedEncounter.malice).toBe(15);
  });

  test("malice doesn't change when toggling participants within the same round", () => {
    const players = [
      createParticipant({ id: "p1", initiative: 20, hp: 50 }),
      createParticipant({ id: "p2", initiative: 18, hp: 45 }),
    ];

    players.forEach((p) => {
      p.creature.type = "player";
      p.has_played_this_round = false;
    });

    const encounter = {
      current_round: 2,
      participants: players,
      turn_groups: [],
      malice: 8,
    };

    // Toggle first participant - round doesn't change
    const result = EncounterUtils.toggleGroupTurn({
      participant: { id: "p1" },
      encounter,
      gameSession: undefined,
    });

    expect(result.updatedEncounter.current_round).toBe(2);
    expect(result.updatedEncounter.malice).toBe(8); // No change
  });

  test("malice calculation takes gameSession victories into account", () => {
    const players = [
      createParticipant({ id: "p1", initiative: 20, hp: 50 }),
      createParticipant({ id: "p2", initiative: 18, hp: 45 }),
    ];

    players.forEach((p) => {
      p.creature.type = "player";
      p.has_played_this_round = true;
    });

    const monster = createParticipant({ id: "m1", initiative: 15, hp: 30 });
    monster.creature.type = "standard_monster";
    monster.has_played_this_round = false;

    const encounter = {
      current_round: 2,
      participants: [...players, monster],
      turn_groups: [],
      malice: 8,
    };

    const gameSession = {
      id: "gs1",
      campaign_id: "c1",
      user_id: "u1",
      name: "Test Session",
      created_at: new Date(),
      description: null,
      started_at: new Date(),
      ended_at: null,
      victory_count: 3,
    } satisfies GameSession;
    const result = EncounterUtils.toggleGroupTurn({
      participant: monster,
      encounter,
      gameSession,
    });
    expect(result.updatedEncounter.current_round).toBe(3);
    expect(result.updatedEncounter.malice).toBe(16); // 8 + (2 players + 3 victories + round 3)
  });
});
