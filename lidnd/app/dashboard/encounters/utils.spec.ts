import { test, expect, describe } from "vitest";
import { updateTurnOrder } from "./utils";

describe("Update turn order", () => {
  test("updates turn order to next participant", () => {
    const participants = [
      {
        is_active: true,
        hp: 10,
        id: "1",
        initiative: 1,
        created_at: new Date(),
        is_player: true,
        has_surprise: false,
      },
      {
        is_active: false,
        hp: 10,
        id: "2",
        initiative: 2,
        created_at: new Date(),
        is_player: false,
        has_surprise: false,
      },
    ];
    const encounter = { current_round: 1 };

    const result = updateTurnOrder("next", participants, encounter);
    expect(result.newlyActiveParticipant.id).toBe("2");
    expect(result.updatedRoundNumber).toBe(2);
  });

  test("updates turn order to previous participant", () => {
    const participants = [
      {
        is_active: false,
        hp: 10,
        id: "1",
        initiative: 1,
        created_at: new Date(),
        is_player: true,
        has_surprise: false,
      },
      {
        is_active: true,
        hp: 10,
        id: "2",
        initiative: 2,
        created_at: new Date(),
        is_player: false,
        has_surprise: false,
      },
    ];
    const encounter = { current_round: 1 };

    const result = updateTurnOrder("previous", participants, encounter);
    expect(result.newlyActiveParticipant.id).toBe("1");
    expect(result.updatedRoundNumber).toBe(0);
  });
});
