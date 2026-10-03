import { describe, expect, test } from "vitest";
import {
  allActed,
  budget,
  damageSquad,
  difficulty,
  evPerHero,
  groupEV,
  hasActed,
  initialMalice,
  minionsAlive,
  roundMalice,
  squadPool,
  totalEV,
  sideUp,
  turnUnits,
  whoChoosesFirstSide,
} from "./drawSteel";

// Examples are from Draw Steel: Monsters v1.01 and Heroes v1.01b.

describe("encounter value", () => {
  test("hero ES is 4 + 2 per level", () => {
    expect(evPerHero(1)).toBe(6);
    expect(evPerHero(3)).toBe(10); // "a 3rd-level hero has an ES of 10"
    expect(evPerHero(10)).toBe(24);
    expect(() => evPerHero(11)).toThrow();
  });

  test("heroes and allies cost nothing", () => {
    expect(
      totalEV([
        { kind: "hero", side: "enemy", ev: 12 },
        { kind: "standard", side: "ally", ev: 12 },
      ]),
    ).toBe(0);
  });

  test("minions are bought four at a time, per creature type", () => {
    const squad = (minionCount: number, creatureId = "goblin") => ({
      kind: "minion" as const,
      side: "enemy" as const,
      ev: 3,
      minionCount,
      creatureId,
    });
    expect(totalEV([squad(4)])).toBe(3);
    expect(totalEV([squad(6)])).toBe(6); // two sets bought
    expect(totalEV([squad(8)])).toBe(6);
    // Squads of 3 and 5 goblins are two sets; a different minion is separate.
    expect(totalEV([squad(3), squad(5)])).toBe(6);
    expect(totalEV([squad(3), squad(5, "rat")])).toBe(9);
  });

  test("groups total their members", () => {
    expect(
      groupEV([
        { kind: "minion", side: "enemy", ev: 3, minionCount: 8 },
        { kind: "standard", side: "enemy", ev: 4 },
      ]),
    ).toBe(10);
  });
});

describe("budget and difficulty", () => {
  test("no heroes means no budget", () => {
    expect(budget({ level: 1, heroCount: 0, victories: 0 })).toBeNull();
  });

  test("five 3rd-level heroes have ES 50", () => {
    expect(budget({ level: 3, heroCount: 5, victories: 0 })?.strength).toBe(50);
  });

  test("every 2 average victories add a hero", () => {
    // "a party of 3rd-level heroes has 2 or 3 Victories each, increase the ES by 10"
    expect(budget({ level: 3, heroCount: 5, victories: 3 })?.strength).toBe(60);
  });

  test("allied NPCs count as heroes", () => {
    expect(
      budget({ level: 3, heroCount: 4, allyCount: 1, victories: 0 })?.strength,
    ).toBe(50);
  });

  test("boundaries", () => {
    const b = budget({ level: 1, heroCount: 4, victories: 0 })!; // ES 24, E 6
    expect(difficulty(17, b)).toBe("trivial"); // less than ES − E
    expect(difficulty(18, b)).toBe("easy");
    expect(difficulty(23, b)).toBe("easy");
    expect(difficulty(24, b)).toBe("standard");
    expect(difficulty(30, b)).toBe("standard");
    expect(difficulty(31, b)).toBe("hard");
    expect(difficulty(42, b)).toBe("hard");
    expect(difficulty(43, b)).toBe("extreme");
  });
});

describe("malice", () => {
  test("five heroes with three victories start round 1 with 9", () => {
    expect(initialMalice(5, 3)).toBe(9);
  });

  test("later rounds add heroes + round: 7, 8, 9", () => {
    expect(roundMalice(5, 2)).toBe(7);
    expect(roundMalice(5, 3)).toBe(8);
    expect(roundMalice(5, 4)).toBe(9);
  });
});

describe("minion squads", () => {
  test("eight 5-Stamina spinecleavers have a pool of 40", () => {
    expect(squadPool(8, 5)).toBe(40);
    expect(minionsAlive(40, 5)).toBe(8);
  });

  test("a minion dies each time the pool drops by one minion's Stamina", () => {
    expect(minionsAlive(37, 5)).toBe(8); // 3 damage kills nobody
    expect(minionsAlive(35, 5)).toBe(7);
    expect(minionsAlive(1, 5)).toBe(1);
    expect(minionsAlive(0, 5)).toBe(0);
  });

  test("a single hit takes its full damage from the pool", () => {
    // Brutal Slam: 12 damage to spinecleavers kills two.
    const pool = damageSquad({ pool: 40, staminaPerMinion: 5, damage: 12 });
    expect(pool).toBe(28);
    expect(minionsAlive(pool, 5)).toBe(6);
  });

  test("area damage only hurts minions in the area, up to their Stamina", () => {
    // Incinerate: 6 damage to three of the squad loses 15, not 18.
    expect(
      damageSquad({
        pool: 20,
        staminaPerMinion: 5,
        damage: 6,
        minionsInArea: 3,
      }),
    ).toBe(5);
  });

  test("the pool doesn't go below zero", () => {
    expect(damageSquad({ pool: 4, staminaPerMinion: 5, damage: 50 })).toBe(0);
  });
});

describe("acted markers", () => {
  const groups = [{ id: "g1", acted: true }];

  test("group members use the group's marker", () => {
    expect(
      hasActed(
        { id: "a", acted: false, turnGroupId: "g1", defeated: false },
        groups,
      ),
    ).toBe(true);
    expect(hasActed({ id: "b", acted: false, defeated: false }, groups)).toBe(
      false,
    );
  });

  test("round is over when every undefeated participant has acted", () => {
    const participants = [
      { id: "hero", acted: true, defeated: false },
      { id: "m1", acted: false, turnGroupId: "g1", defeated: false },
      { id: "dead", acted: false, defeated: true },
    ];
    expect(allActed(participants, groups)).toBe(true);
    expect(allActed(participants, [{ id: "g1", acted: false }])).toBe(false);
  });
});

describe("who goes first and whose turn it is", () => {
  test("d10: 6 or higher, the players choose; otherwise the Director", () => {
    expect(whoChoosesFirstSide(6)).toBe("players");
    expect(whoChoosesFirstSide(10)).toBe("players");
    expect(whoChoosesFirstSide(5)).toBe("director");
    expect(whoChoosesFirstSide(1)).toBe("director");
  });

  const unit = (
    side: "heroes" | "enemies",
    acted = false,
    defeated = false,
  ) => ({
    side,
    acted,
    defeated,
  });

  test("sides alternate starting with the first side", () => {
    const units = [
      unit("heroes"),
      unit("heroes"),
      unit("enemies"),
      unit("enemies"),
    ];
    expect(sideUp(units, "heroes")).toBe("heroes");
    units[0].acted = true;
    expect(sideUp(units, "heroes")).toBe("enemies");
    units[2].acted = true;
    expect(sideUp(units, "heroes")).toBe("heroes");
  });

  test("when one side is done, the other side finishes", () => {
    // Four heroes against two groups: after H E H E, the last heroes go.
    const units = [
      unit("heroes", true),
      unit("heroes", true),
      unit("heroes"),
      unit("heroes"),
      unit("enemies", true),
      unit("enemies", true),
    ];
    expect(sideUp(units, "heroes")).toBe("heroes");
  });

  test("enemies first", () => {
    const units = [unit("heroes"), unit("enemies"), unit("enemies")];
    expect(sideUp(units, "enemies")).toBe("enemies");
    units[1].acted = true;
    expect(sideUp(units, "enemies")).toBe("heroes");
  });

  test("defeated creatures who haven't acted don't take turns", () => {
    const units = [unit("heroes", true), unit("enemies", false, true)];
    expect(sideUp(units, "heroes")).toBeNull();
  });

  test("an initiative group is one turn, on the enemies' side", () => {
    const units = turnUnits(
      [
        { kind: "hero", side: "enemy", acted: false, defeated: false },
        { kind: "standard", side: "ally", acted: false, defeated: false },
        {
          kind: "minion",
          side: "enemy",
          acted: false,
          defeated: false,
          turnGroupId: "g",
        },
        {
          kind: "standard",
          side: "enemy",
          acted: false,
          defeated: false,
          turnGroupId: "g",
        },
      ],
      [{ id: "g", acted: true }],
    );
    expect(units).toEqual([
      unit("heroes"),
      unit("heroes"),
      unit("enemies", true),
    ]);
  });
});
